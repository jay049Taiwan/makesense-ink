import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "地方學堂",
  description: "宜蘭文化俱樂部地方學堂 — 趣味測驗，用遊戲認識宜蘭。",
};

export default function LocalSchoolPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-12">
      <h1 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
        地方學堂
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
        用趣味測驗認識宜蘭的歷史、地理與文化
      </p>

      {/* Quiz placeholder */}
      <div
        className="rounded-lg p-12 text-center"
        style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}
      >
        <p className="text-4xl mb-4">🎓</p>
        <p className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
          趣味測驗即將上線
        </p>
        <p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>
          資料來源：Notion DB08 關鍵字考題庫
        </p>
      </div>

      {/* Keyword marquee placeholder */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
          已出考題的關鍵字
        </h2>
        <div className="hscroll-track">
          {["宜蘭線鐵路", "礁溪溫泉", "龜山島", "蘭陽博物館", "頭城搶孤", "冬山河親水公園"].map((kw) => (
            <span
              key={kw}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm"
              style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
