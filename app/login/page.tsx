import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/lib/auth";

export const metadata: Metadata = {
  title: "登入",
  description: "使用 Google 或 LINE 登入現思文化會員。",
};

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4">
      <div className="w-full" style={{ maxWidth: 400 }}>
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            會員登入
          </h1>
          <p className="text-sm" style={{ color: "var(--color-mist)" }}>
            登入後可管理訂單、累積點數、報名活動
          </p>
        </div>

        <div className="space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="w-full h-12 rounded-lg text-sm font-medium flex items-center justify-center gap-3 transition-colors hover:shadow-md"
              style={{ background: "#fff", border: "1px solid var(--color-dust)", color: "var(--color-ink)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              使用 Google 帳號登入
            </button>
          </form>

          <button
            disabled
            className="w-full h-12 rounded-lg text-sm font-medium flex items-center justify-center gap-3 text-white opacity-60 cursor-not-allowed"
            style={{ background: "#06C755" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.39.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.176 14.393 24 12.458 24 10.304" />
            </svg>
            LINE 登入（即將開放）
          </button>
        </div>

        <p className="text-center text-[0.7em] mt-8" style={{ color: "var(--color-mist)" }}>
          登入即表示你同意我們的
          <Link href="/terms" className="underline ml-0.5">服務條款</Link>
          與
          <Link href="/privacy" className="underline ml-0.5">隱私政策</Link>
        </p>
      </div>
    </div>
  );
}
