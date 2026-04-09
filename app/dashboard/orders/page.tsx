import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "訂單紀錄",
};

const orderTabs = ["全部", "書籍", "商品", "活動報名", "空間預約", "收藏"];

export default function OrdersPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-brand-brown mb-4">訂單紀錄</h2>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {orderTabs.map((tab, i) => (
          <button
            key={tab}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              i === 0
                ? "bg-brand-brown text-white"
                : "bg-brand-cream text-muted hover:bg-brand-tan/30"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-border p-12 bg-white text-center">
        <p className="text-muted">尚無訂單紀錄</p>
        <p className="text-sm text-muted mt-1">
          訂單資料來源：Notion DB05 + DB06
        </p>
      </div>
    </div>
  );
}
