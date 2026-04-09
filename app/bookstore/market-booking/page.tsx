import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "展售合作",
  description: "森本集市攤位報名 — 旅人書店展售合作方案。",
};

export default function MarketBookingPage() {
  return (
    <div className="mx-auto max-w-[1140px] px-4 py-12">
      <h1 className="text-3xl font-bold text-brand-brown font-serif mb-2">
        展售合作
      </h1>
      <p className="text-muted mb-8">
        選擇想參加的市集場次，填寫報名表單
      </p>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Calendar section */}
        <section>
          <h2 className="text-lg font-semibold text-brand-brown mb-4">
            選擇場次
          </h2>
          <div className="rounded-xl border border-border p-8 bg-brand-cream text-center text-muted">
            市集行事曆（載入中...）— 資料來源：DB04 市集場次
          </div>
        </section>

        {/* Form section */}
        <section>
          <h2 className="text-lg font-semibold text-brand-brown mb-4">
            報名表單
          </h2>
          <div className="rounded-xl border border-border p-6 bg-white">
            <p className="text-muted text-sm text-center py-8">
              請先從行事曆選擇場次
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
