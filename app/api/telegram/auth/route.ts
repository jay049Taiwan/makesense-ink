import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/telegram/auth
 * 驗證 Telegram initData + 查 Supabase 確認 staff 角色
 */
export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();
    if (!initData) {
      return NextResponse.json({ authorized: false, message: "缺少 initData" });
    }

    // 1. 驗證 Telegram initData 簽名
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ authorized: false, message: "Bot Token 未設定" });
    }

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");

    // 按字母順序排列
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (calculatedHash !== hash) {
      return NextResponse.json({ authorized: false, message: "簽名驗證失敗" });
    }

    // 2. 解析用戶資訊
    const userStr = params.get("user");
    if (!userStr) {
      return NextResponse.json({ authorized: false, message: "無用戶資訊" });
    }

    const telegramUser = JSON.parse(userStr);
    const telegramUid = String(telegramUser.id);

    // 3. 查 Supabase 是否有綁定的會員
    const { data: member } = await supabase
      .from("members")
      .select("id, name, member_type, telegram_uid")
      .eq("telegram_uid", telegramUid)
      .single();

    if (!member) {
      return NextResponse.json({
        authorized: false,
        message: "此 Telegram 帳號尚未綁定，請到官網會員中心綁定",
        telegramUid,
      });
    }

    // 4. 確認角色
    // 注意：member_type 由 DB08「關係選項」同步而來，值是中文（工作團隊/合作夥伴/個人）
    // 同時相容舊英文值（staff/vendor/member），避免歷史資料卡住
    const isStaff = member.member_type === "工作團隊" || member.member_type === "staff";
    const isVendor = member.member_type === "合作夥伴" || member.member_type === "vendor";
    const role = isStaff ? "staff" : isVendor ? "vendor" : "member";

    return NextResponse.json({
      authorized: true,
      role,
      memberId: member.id,
      name: member.name,
    });
  } catch (err) {
    console.error("Telegram auth error:", err);
    return NextResponse.json({ authorized: false, message: "驗證失敗" }, { status: 500 });
  }
}
