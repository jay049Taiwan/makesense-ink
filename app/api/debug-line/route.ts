import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, any> = {};

  // 1. 環境變數
  results.envCheck = {
    AUTH_LINE_ID: process.env.AUTH_LINE_ID ? `${process.env.AUTH_LINE_ID.slice(0, 4)}...` : "MISSING",
    AUTH_LINE_SECRET: process.env.AUTH_LINE_SECRET ? `${process.env.AUTH_LINE_SECRET.slice(0, 4)}...` : "MISSING",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "MISSING",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
  };

  // 2. 上次 token exchange 的 debug 資訊
  results.lastTokenExchange = (globalThis as any).__lineDebug ?? "no data yet - try LINE login first";
  results.lastTokenResponse = (globalThis as any).__lineTokenResponse ?? "no data yet";

  // 3. 試 signIn
  try {
    const authModule = await import("@/lib/auth");
    results.authImport = "OK";
    try {
      const result = await authModule.signIn("line", { redirect: false });
      results.signInResult = result;
    } catch (e: any) {
      results.signInError = {
        name: e?.name,
        message: e?.message?.slice(0, 200),
        cause: String(e?.cause ?? "").slice(0, 200),
      };
    }
  } catch (e: any) {
    results.authImportError = e?.message?.slice(0, 200);
  }

  return NextResponse.json(results, { status: 200 });
}
