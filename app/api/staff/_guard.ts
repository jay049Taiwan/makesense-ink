import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/**
 * 雙模式 staff 驗證：
 * 1. NextAuth session（官網瀏覽器，Google/LINE OAuth）
 * 2. Telegram WebApp initData（Telegram mini-app）
 *    Client 端必須傳 X-Telegram-Init-Data header
 *
 * 兩種都不過就回 401/403。
 */
export async function requireStaff(req?: Request | NextRequest) {
  // 路徑 A：NextAuth session（官網）
  const session = await auth();
  if (session?.user?.email && (session as any).role === "staff") {
    return {
      session,
      email: session.user.email,
      source: "web" as const,
    };
  }

  // 路徑 B：Telegram WebApp initData（mini-app）
  if (req) {
    const initData = req.headers.get("X-Telegram-Init-Data");
    if (initData) {
      const tgResult = await verifyTelegramStaff(initData);
      if (tgResult.ok) {
        return {
          email: tgResult.email,
          memberId: tgResult.memberId,
          name: tgResult.name,
          telegramUid: tgResult.telegramUid,
          source: "telegram" as const,
        };
      }
    }
  }

  // 都沒過
  if (session?.user?.email) {
    // 有登入但不是 staff
    return { error: NextResponse.json({ error: "非工作人員" }, { status: 403 }) };
  }
  return { error: NextResponse.json({ error: "未登入" }, { status: 401 }) };
}

/**
 * 驗證 Telegram WebApp initData HMAC + 查 Supabase 確認 staff 身份
 */
async function verifyTelegramStaff(initData: string): Promise<
  | { ok: true; email: string | null; memberId: string; name: string; telegramUid: string }
  | { ok: false }
> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { ok: false };

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (calculatedHash !== hash) return { ok: false };

    const userStr = params.get("user");
    if (!userStr) return { ok: false };
    const tgUser = JSON.parse(userStr);
    const telegramUid = String(tgUser.id);

    const { data: member } = await supabase
      .from("members")
      .select("id, name, email, member_type")
      .eq("telegram_uid", telegramUid)
      .maybeSingle();

    if (!member) return { ok: false };
    const isStaff = member.member_type === "工作團隊" || member.member_type === "staff";
    if (!isStaff) return { ok: false };

    return {
      ok: true,
      email: member.email,
      memberId: member.id,
      name: member.name,
      telegramUid,
    };
  } catch {
    return { ok: false };
  }
}
