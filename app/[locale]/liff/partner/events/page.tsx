"use client";

import { useEffect, useState } from "react";
import { getLiffAccessToken } from "@/lib/liff";
import SafeImage from "@/components/ui/SafeImage";

interface PartnerEvent {
  id: string;
  title: string;
  date: string;
  capacity: number | null;
  cover_url: string | null;
  location: string | null;
  status: string;
  registered: number;
  checkedIn: number;
}

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`;
}

export default function LiffPartnerEventsPage() {
  const [data, setData] = useState<{ partner: any; events: PartnerEvent[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    (async () => {
      const token = getLiffAccessToken();
      if (!token) {
        setError("請從 LINE 開啟此頁面");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/liff/partner/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: token }),
        });
        const j = await res.json();
        if (!j.ok) setError(j.message);
        else if (!j.partner) setError("您尚未綁定為合作廠商");
        else setData(j);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="px-4 pt-4 pb-24 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: "#ece8e1" }} />
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

  const now = Date.now();
  const upcoming = data.events.filter((e) => new Date(e.date).getTime() >= now);
  const past = data.events.filter((e) => new Date(e.date).getTime() < now);
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="pb-24" style={{ background: "#faf8f4", minHeight: "100vh" }}>
      <div className="px-4 pt-5 pb-3" style={{ background: "#fff", borderBottom: "1px solid #ece8e1" }}>
        <a href="/liff/partner/dashboard" className="text-xs" style={{ color: "#7a5c40" }}>← 返回概覽</a>
        <h1 className="text-lg font-bold mt-1" style={{ color: "#2d2a26" }}>我的活動</h1>

        <div className="flex gap-2 mt-3">
          <TabBtn active={tab === "upcoming"} onClick={() => setTab("upcoming")} label={`進行中 ${upcoming.length}`} />
          <TabBtn active={tab === "past"} onClick={() => setTab("past")} label={`歷史 ${past.length}`} />
        </div>
      </div>

      <div className="px-4 mt-3 space-y-2">
        {list.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
            <p className="text-sm" style={{ color: "#999" }}>沒有活動</p>
          </div>
        ) : (
          list.map((e) => {
            const cap = e.capacity || 0;
            const pct = cap > 0 ? Math.min(100, (e.registered / cap) * 100) : 0;
            return (
              <a
                key={e.id}
                href={`/liff/partner/events/${e.id}`}
                className="block rounded-xl overflow-hidden"
                style={{ background: "#fff", border: "1px solid #ece8e1" }}
              >
                <div className="flex gap-3 p-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                    <SafeImage src={e.cover_url} alt={e.title} placeholderType="event" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2" style={{ color: "#2d2a26" }}>{e.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#b87333" }}>
                      {formatDate(e.date)}
                      {e.location && <span style={{ color: "#999" }}> · {e.location}</span>}
                    </p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[11px]" style={{ color: "#666" }}>
                        <span>報名 {e.registered}{cap > 0 && ` / ${cap}`}</span>
                        <span>已簽到 {e.checkedIn}</span>
                      </div>
                      {cap > 0 && (
                        <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#f0ebe4" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: pct >= 90 ? "#e65100" : "#4ECDC4" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>
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
