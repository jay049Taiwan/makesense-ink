import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, any> = {};

  // 1. 確認環境變數
  results.envCheck = {
    AUTH_LINE_ID: process.env.AUTH_LINE_ID ? `${process.env.AUTH_LINE_ID.slice(0, 4)}...` : "MISSING",
    AUTH_LINE_SECRET: process.env.AUTH_LINE_SECRET ? `${process.env.AUTH_LINE_SECRET.slice(0, 4)}...` : "MISSING",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "MISSING",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
  };

  // 2. 試著 import auth 模組
  try {
    const authModule = await import("@/lib/auth");
    results.authImport = "OK";

    // 3. 試著呼叫 signIn
    try {
      // signIn 在 server 端會回傳 redirect URL
      const result = await authModule.signIn("line", { redirect: false });
      results.signInResult = result;
    } catch (e: any) {
      results.signInError = {
        name: e?.name,
        message: e?.message,
        cause: e?.cause?.message || e?.cause,
        stack: e?.stack?.split("\n").slice(0, 5),
      };
    }
  } catch (e: any) {
    results.authImportError = {
      name: e?.name,
      message: e?.message,
      stack: e?.stack?.split("\n").slice(0, 5),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
