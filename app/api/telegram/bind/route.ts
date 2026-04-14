import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/telegram/bind
 * 綁定 Telegram 帳號到會員
 * body: { email: string, telegramUid: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, telegramUid } = await req.json();

    if (!email || !telegramUid) {
      return NextResponse.json({ error: "缺少 email 或 telegramUid" }, { status: 400 });
    }

    // 確認會員存在
    const { data: member, error: findError } = await supabase
      .from("members")
      .select("id, telegram_uid")
      .eq("email", email)
      .single();

    if (findError || !member) {
      return NextResponse.json({ error: "找不到此 email 的會員" }, { status: 404 });
    }

    if (member.telegram_uid && member.telegram_uid !== telegramUid) {
      return NextResponse.json({ error: "此帳號已綁定其他 Telegram" }, { status: 409 });
    }

    // 檢查 Telegram UID 是否已被其他人綁定
    const { data: existing } = await supabase
      .from("members")
      .select("id")
      .eq("telegram_uid", telegramUid)
      .neq("id", member.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "此 Telegram 帳號已綁定其他會員" }, { status: 409 });
    }

    // 綁定
    const { error: updateError } = await supabase
      .from("members")
      .update({ telegram_uid: telegramUid })
      .eq("id", member.id);

    if (updateError) {
      console.error("綁定失敗:", updateError);
      return NextResponse.json({ error: "綁定失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Telegram 帳號綁定成功" });
  } catch (err) {
    console.error("Telegram bind error:", err);
    return NextResponse.json({ error: "系統錯誤" }, { status: 500 });
  }
}
