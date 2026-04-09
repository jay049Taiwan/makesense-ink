import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "會員中心",
};

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-brand-brown mb-4">歡迎回來</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border p-6 bg-white">
          <p className="text-sm text-muted mb-1">我的點數</p>
          <p className="text-3xl font-bold text-brand-brown">0</p>
        </div>
        <div className="rounded-xl border border-border p-6 bg-white">
          <p className="text-sm text-muted mb-1">進行中的報名</p>
          <p className="text-3xl font-bold text-brand-orange">0</p>
        </div>
        <div className="rounded-xl border border-border p-6 bg-white">
          <p className="text-sm text-muted mb-1">我的等級</p>
          <p className="text-3xl font-bold text-brand-teal">Lv.1</p>
        </div>
      </div>
    </div>
  );
}
