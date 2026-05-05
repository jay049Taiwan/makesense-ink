"use client";

import { useEffect, useState, use as usePromise } from "react";
import { getLiffAccessToken } from "@/lib/liff";

interface Registration {
  orderId: string;
  orderItemId: string;
  name: string;
  phone: string;
  email: string;
  ticket: string;
  qty: number;
  checkin_status: string;
  created_at: string;
}

interface Data {
  event: { id: string; title: string; date: string };
  registrations: Registration[];
  summary: { total: number; checkedIn: number; pending: number };
}

export default function LiffPartnerEventRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "checked_in">("all");

  useEffect(() => {
    (async () => {
      const token = getLiffAccessToken();
      if (!token) {
        setError("請從 LINE 開啟此頁面");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/liff/partner/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: token, eventId: id }),
        });
        const j = await res.json();
        if (!j.ok) setError(j.message || "載入失敗");
        else setData(j);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading)
    return (
      <div className="px-4 pt-4 pb-24 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#ece8e1" }} />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="px-4 pt-12 text-center" style={{ minHeight: "100vh" }}>
        <p className="text-base font-semibold" style={{ color: "#2d2a26" }}>{error}</p>
      </div>
    );
  if (!data) return null;

  const list = data.registrations.filter((r) => {
    if (filter === "all") return true;
    if (filter === "checked_in") return r.checkin_status === "checked_in";
    return r.checkin_status !== "checked_in";
  });

  return (
    <div className="pb-24" style={{ background: "#faf8f4", minHeight: "100vh" }}>
      <div className="px-4 pt-5 pb-3" style={{ background: "#fff", borderBottom: "1px solid #ece8e1" }}>
        <a href="/liff/partner/events" className="text-xs" style={{ color: "#7a5c40" }}>← 返回活動清單</a>
        <h1 className="text-lg font-bold mt-1" style={{ color: "#2d2a26" }}>{data.event.title}</h1>
        <p className="text-xs mt-1" style={{ color: "#999" }}>
          {new Date(data.event.date).toLocaleDateString("zh-TW")}
        </p>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat label="總報名" value={data.summary.total} color="#2d2a26" />
          <Stat label="已簽到" value={data.summary.checkedIn} color="#4ECDC4" />
          <Stat label="待簽到" value={data.summary.pending} color="#e65100" />
        </div>

        <div className="flex gap-2 mt-3">
          <TabBtn active={filter === "all"} onClick={() => setFilter("all")} label={`全部 ${data.summary.total}`} />
          <TabBtn active={filter === "pending"} onClick={() => setFilter("pending")} label={`待簽 ${data.summary.pending}`} />
          <TabBtn
            active={filter === "checked_in"}
            onClick={() => setFilter("checked_in")}
            label={`已簽 ${data.summary.checkedIn}`}
          />
        </div>
      </div>

      <div className="px-4 mt-3 space-y-2">
        {list.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
            <p className="text-sm" style={{ color: "#999" }}>沒有資料</p>
          </div>
        ) : (
          list.map((r, i) => (
            <div
              key={`${r.orderItemId}-${i}`}
              className="p-3 rounded-xl"
              style={{
                background: "#fff",
                border: r.checkin_status === "checked_in" ? "1px solid #4ECDC4" : "1px solid #ece8e1",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#2d2a26" }}>{r.name}</p>
                  {r.phone && (
                    <a
                      href={`tel:${r.phone}`}
                      className="text-xs mt-0.5 inline-block"
                      style={{ color: "#7a5c40", textDecoration: "underline" }}
                    >
                      📞 {r.phone}
                    </a>
                  )}
                  <p className="text-[11px] mt-0.5" style={{ color: "#666" }}>
                    {r.ticket} · ×{r.qty}
                  </p>
                </div>
                {r.checkin_status === "checked_in" ? (
                  <span className="text-[11px] px-2 py-1 rounded-full font-medium" style={{ background: "#e6f7f5", color: "#0e9889" }}>
                    ✓ 已簽到
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: "#fff3e0", color: "#e65100" }}>
                    待簽到
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 簽到掃碼 CTA */}
      <a
        href="/liff/partner/scan"
        className="fixed bottom-5 right-5 z-30 px-5 py-3 rounded-full font-semibold text-sm shadow-lg flex items-center gap-2"
        style={{ background: "#4ECDC4", color: "#fff" }}
      >
        📷 簽到掃碼
      </a>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: "#faf8f4" }}>
      <p className="text-[10px]" style={{ color: "#999" }}>{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: active ? "#7a5c40" : "#fff",
        color: active ? "#fff" : "#7a5c40",
        border: active ? undefined : "1px solid #ece8e1",
      }}
    >
      {label}
    </button>
  );
}
