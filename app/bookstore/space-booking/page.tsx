import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "空間體驗",
  description: "文化園區空間租借與活動場地預約。",
};

export default function SpaceBookingPage() {
  return (
    <div className="mx-auto max-w-[1140px] px-4 py-12">
      <h1 className="text-3xl font-bold text-brand-brown font-serif mb-2">
        空間體驗
      </h1>
      <p className="text-muted mb-8">
        選擇日期與時段，預約文化園區空間
      </p>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Calendar section */}
        <section>
          <h2 className="text-lg font-semibold text-brand-brown mb-4">
            選擇日期
          </h2>
          <div className="rounded-xl border border-border p-8 bg-brand-cream text-center text-muted">
            空間行事曆（載入中...）— 封鎖日期 + 時段選擇
          </div>
        </section>

        {/* Form section */}
        <section>
          <h2 className="text-lg font-semibold text-brand-brown mb-4">
            預約表單
          </h2>
          <div className="rounded-xl border border-border p-6 bg-white">
            <p className="text-muted text-sm text-center py-8">
              請先從行事曆選擇日期與時段
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
