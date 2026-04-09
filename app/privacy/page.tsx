import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隱私政策",
  description: "現思文化創藝術有限公司 — 隱私政策。",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 800 }}>
      <h1
        className="text-3xl font-semibold mb-2"
        style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
      >
        隱私政策
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-mist)" }}>
        最後更新日期：2026 年 4 月 1 日
      </p>

      <div
        className="text-[0.9em] leading-[1.8] space-y-6"
        style={{ color: "var(--color-ink)" }}
      >
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>
            一、個人資料之蒐集
          </h2>
          <p>
            本公司蒐集之個人資料包括但不限於：姓名、電子信箱、電話號碼、通訊地址等，
            僅於您主動提供時蒐集（如會員註冊、購物結帳、活動報名等）。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>
            二、個人資料之利用
          </h2>
          <p>
            您的個人資料僅用於本公司之營運目的，包括：訂單處理、活動通知、
            會員服務、客服聯繫等。未經您的同意，不會將個人資料提供予第三方。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>
            三、Cookie 使用
          </h2>
          <p>
            本網站使用 Cookie 以提升您的瀏覽體驗。
            您可透過瀏覽器設定拒絕 Cookie，但部分功能可能因此受到限制。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>
            四、資料安全
          </h2>
          <p>
            本公司採取適當之安全措施保護您的個人資料，
            包括 HTTPS 加密傳輸、存取權限控管等。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>
            五、您的權利
          </h2>
          <p>
            您有權查詢、更正、刪除您的個人資料。
            如需行使上述權利，請透過本網站之聯絡方式與我們聯繫。
          </p>
        </section>

        <p className="text-xs pt-4" style={{ color: "var(--color-mist)", borderTop: "1px solid var(--color-dust)" }}>
          現思文化創藝術有限公司 © 2012–{new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
