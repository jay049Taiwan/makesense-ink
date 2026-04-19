"use client";

import { useEffect, useState } from "react";

interface Registration {
  id: string;
  title: string;
  topicTitle: string;
  type: string;
  date: string | null;
  slug: string;
}

const orderTabs = ["全部", "活動報名"] as const;
type Tab = (typeof orderTabs)[number];

export default function OrdersPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("全部");

  useEffect(() => {
    fetch("/api/user/orders")
      .then((res) => res.json())
      .then((data: any) => {
        setRegistrations(data.registrations || []);
      })
      .catch(() => setRegistrations([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeTab === "全部"
      ? registrations
      : registrations.filter((r) => r.type === "報名登記");

  return (
    <div>
      <h2 className="text-xl font-semibold text-brand-brown mb-4">訂單紀錄</h2>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {orderTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "bg-brand-brown text-white"
                : "bg-brand-cream text-muted hover:bg-brand-tan/30"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border p-12 bg-white text-center">
          <p className="text-muted text-sm">載入中...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-12 bg-white text-center">
          <p className="text-muted">尚無紀錄</p>
          <p className="text-sm text-muted mt-1">完成活動報名後將出現在此</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-white px-5 py-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.title || "（未命名）"}
                </p>
                {item.topicTitle && (
                  <p className="text-xs text-muted mt-0.5 truncate">{item.topicTitle}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-cream text-muted">
                  {item.type || "報名"}
                </span>
                {item.date && (
                  <p className="text-xs text-muted mt-1">{item.date}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
