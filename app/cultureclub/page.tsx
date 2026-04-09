import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "宜蘭文化俱樂部",
  description: "宜蘭文化俱樂部 — 集結宜蘭在地的文化力量，建構屬於宜蘭人的文化社群。",
};

export default function CultureClubPage() {
  return (
    <div className="mx-auto max-w-[1140px] px-4 py-12">
      <h1 className="text-3xl font-bold text-brand-teal font-serif mb-8">
        宜蘭文化俱樂部
      </h1>

      {/* Sections */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="rounded-xl border border-border p-6 bg-white">
          <h2 className="text-lg font-semibold text-brand-teal mb-2">
            活動資訊
          </h2>
          <p className="text-muted text-sm">
            講座、工作坊、策展、市集等文化活動
          </p>
        </div>
        <div className="rounded-xl border border-border p-6 bg-white">
          <h2 className="text-lg font-semibold text-brand-teal mb-2">
            社群交流
          </h2>
          <p className="text-muted text-sm">
            連結在地文化工作者，共創宜蘭文化生態
          </p>
        </div>
        <div className="rounded-xl border border-border p-6 bg-white">
          <h2 className="text-lg font-semibold text-brand-teal mb-2">
            會員專區
          </h2>
          <p className="text-muted text-sm">
            俱樂部會員專屬內容與活動優惠
          </p>
        </div>
      </div>

      {/* Calendar placeholder */}
      <section>
        <h2 className="text-xl font-semibold text-brand-teal mb-4">
          活動行事曆
        </h2>
        <div className="rounded-xl border border-border p-8 bg-brand-cream text-center text-muted">
          行事曆元件（載入中...）— 資料來源：Notion DB04
        </div>
      </section>
    </div>
  );
}
