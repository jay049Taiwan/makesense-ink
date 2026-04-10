import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/lib/auth";

export const metadata: Metadata = {
  title: "登入",
  description: "使用 Google 或 LINE 登入現思文化會員。",
};

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <div
        className="w-full grid grid-cols-1 md:grid-cols-[280px_1fr] rounded-2xl overflow-hidden"
        style={{ maxWidth: 780, border: "1px solid var(--color-dust)", background: "#fff" }}
      >
        {/* ── 左欄：登入按鈕（窄）── */}
        <div
          className="p-8 flex flex-col justify-center"
          style={{ background: "var(--color-warm-white)" }}
        >
          <h1
            className="text-xl font-semibold mb-1"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            會員登入
          </h1>
          <p className="text-xs mb-6" style={{ color: "var(--color-mist)" }}>
            選擇登入方式
          </p>

          <div className="space-y-3">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="w-full h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2.5 transition-all hover:shadow-md"
                style={{ background: "#fff", border: "1px solid var(--color-dust)", color: "var(--color-ink)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google 登入
              </button>
            </form>

            <button
              disabled
              className="w-full h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2.5 text-white opacity-60 cursor-not-allowed"
              style={{ background: "#06C755" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.39.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.176 14.393 24 12.458 24 10.304" />
              </svg>
              LINE 登入（即將開放）
            </button>
          </div>

          <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--color-dust)" }}>
            <p className="text-[0.65em] leading-relaxed" style={{ color: "var(--color-mist)" }}>
              登入即表示同意
              <Link href="/terms" className="underline mx-0.5">服務條款</Link>
              與
              <Link href="/privacy" className="underline mx-0.5">隱私政策</Link>
            </p>
          </div>
        </div>

        {/* ── 右欄：隱私聲明（寬）── */}
        <div className="p-8 flex flex-col justify-center">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            安心註冊，資料保護
          </h2>

          <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--color-bark)" }}>
            <div className="flex gap-3">
              <span className="text-lg flex-shrink-0">🔒</span>
              <p>
                <strong>我們只取得您的基本資訊</strong><br />
                <span className="text-xs" style={{ color: "var(--color-mist)" }}>
                  透過 Google 或 LINE 登入，我們僅取得您的姓名與電子信箱，不會存取您的密碼或其他個人資料。
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <span className="text-lg flex-shrink-0">📋</span>
              <p>
                <strong>額外資料僅因業務需要</strong><br />
                <span className="text-xs" style={{ color: "var(--color-mist)" }}>
                  部分服務（如走讀導覽、市集報名、空間租借）需要填寫聯絡電話、身份證字號等資訊，
                  僅用於物流寄送、保險辦理等必要用途。
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <span className="text-lg flex-shrink-0">🤝</span>
              <p>
                <strong>不會提供給第三方</strong><br />
                <span className="text-xs" style={{ color: "var(--color-mist)" }}>
                  您的個人資料不會被出售、交換或提供給任何第三方，
                  僅在本公司營運範圍內使用。
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <span className="text-lg flex-shrink-0">🗑️</span>
              <p>
                <strong>可隨時要求刪除</strong><br />
                <span className="text-xs" style={{ color: "var(--color-mist)" }}>
                  依個人資料保護法，您有權隨時要求查詢、更正或刪除您的個人資料。
                </span>
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 flex gap-4 text-xs" style={{ borderTop: "1px solid var(--color-dust)", color: "var(--color-teal)" }}>
            <Link href="/terms" className="hover:underline">服務條款與退換貨政策</Link>
            <Link href="/privacy" className="hover:underline">隱私政策</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
