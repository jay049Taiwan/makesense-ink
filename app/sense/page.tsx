import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "關於我們 | 現思文化創藝術",
  description: "現思文化創藝術有限公司 — Culture Makes Sense。以宜蘭在地文化為核心的品牌事業。",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-16">
      <h1 className="text-3xl font-bold text-brand-brown font-serif mb-2">
        現思文化創藝術
      </h1>
      <p className="text-brand-teal text-lg font-medium mb-8">
        Culture Makes Sense
      </p>

      <div className="prose prose-lg max-w-none" style={{ color: "#333" }}>
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-brand-brown mb-3">
            關於我們
          </h2>
          <p className="text-[0.95em] leading-relaxed text-muted">
            現思文化創藝術有限公司，以宜蘭在地文化為核心，
            透過旅人書店與宜蘭文化俱樂部兩大品牌，串連地方文化、
            創意產業與社群網絡，打造地方文化的永續生態系。
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-brand-brown mb-3">
            我們的品牌
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-lg border border-[#eee] p-6 bg-white">
              <h3 className="text-lg font-semibold text-brand-brown mb-2">
                旅人書店
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                在宜蘭的街角，一間以旅行與在地文化為主題的獨立書店。
                提供展售合作、空間體驗、文化活動等多元服務。
              </p>
            </div>
            <div className="rounded-lg border border-[#eee] p-6 bg-white">
              <h3 className="text-lg font-semibold text-brand-teal mb-2">
                宜蘭文化俱樂部
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                集結宜蘭在地的文化力量，透過策展、市集、講座等活動，
                建構屬於宜蘭人的文化社群。
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-brand-brown mb-3">
            聯絡資訊
          </h2>
          <div className="text-sm text-muted space-y-1">
            <p>營業時間：週一至週日 09:00–17:00</p>
            <p>地址：宜蘭縣（詳細地址待填）</p>
            <p>電話：（待填）</p>
            <p>Email：（待填）</p>
          </div>
        </section>
      </div>
    </div>
  );
}
