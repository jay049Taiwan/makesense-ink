import { NextResponse } from "next/server";

/**
 * /api/debug/auth-env — 臨時診斷 endpoint，確認 Vercel 環境變數有正確設定。
 * 不會回傳實際值，只回傳「有沒有設」。
 */
export async function GET() {
  const keys = [
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "AUTH_LINE_ID",
    "AUTH_LINE_SECRET",
    "AUTH_URL",
    "NEXTAUTH_URL",
    "AUTH_COOKIE_DOMAIN",
    "NOTION_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SITE_URL",
  ];
  const result: Record<string, boolean | string> = {};
  for (const k of keys) {
    const v = process.env[k];
    result[k] = v ? true : false;
  }
  // 特別回報 host detection
  result._VERCEL_ENV = process.env.VERCEL_ENV || "unknown";
  result._VERCEL_URL = process.env.VERCEL_URL || "unknown";
  return NextResponse.json(result);
}
