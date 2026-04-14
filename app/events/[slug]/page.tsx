"use client";

import { useState, useEffect, use } from "react";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";
import RegistrationModal from "@/components/booking/RegistrationModal";
import { useCart } from "@/components/providers/CartProvider";
import { supabase } from "@/lib/supabase";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";

interface EventData {
  title: string;
  date: string;
  location: string;
  guide: string;
  type: "走讀" | "講座" | "市集" | "空間";
  excerpt: string;
  content: string;
  keywords: string[];
  routeStops: { name: string; desc: string }[];
  tickets: { name: string; price: string }[];
  addons: { name: string; price: string }[];
}

const fallbackEvent: EventData = {
  title: "載入中…",
  date: "",
  location: "",
  guide: "",
  type: "走讀",
  excerpt: "",
  content: "",
  keywords: [],
  routeStops: [],
  tickets: [],
  addons: [],
};

/** Map Supabase event row to EventData */
function mapEventData(row: any): EventData {
  const title = row.title || "活動";
  const dateStr = row.event_date
    ? new Date(row.event_date).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" })
    : "日期待定";

  const type = (row.event_type?.includes("走讀") ? "走讀"
    : row.event_type?.includes("講座") ? "講座"
    : row.event_type?.includes("市集") ? "市集"
    : "走讀") as EventData["type"];

  // Keywords from DB keywords array, or fallback to theme split
  const keywords: string[] = row.keywords?.length > 0
    ? row.keywords
    : (row.theme ? row.theme.split(/[,、／/]/).map((s: string) => s.trim()).filter(Boolean) : []);

  // Tickets from DB jsonb, or fallback to price
  const tickets: EventData["tickets"] = Array.isArray(row.tickets) && row.tickets.length > 0
    ? row.tickets
    : (row.price ? [{ name: "成人票", price: `$${row.price}` }] : []);

  const addons: EventData["addons"] = Array.isArray(row.addons) ? row.addons : [];
  const routeStops: EventData["routeStops"] = Array.isArray(row.route_stops) ? row.route_stops : [];

  return {
    title,
    date: dateStr,
    location: row.location || "",
    guide: row.guide || "",
    type,
    excerpt: row.description?.slice(0, 200) || "",
    content: row.description || "",
    keywords,
    routeStops,
    tickets,
    addons,
  };
}

export default function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { addItem } = useCart();
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [event, setEvent] = useState<EventData>(fallbackEvent);
  const [loading, setLoading] = useState(true);
  const [ticketQtys, setTicketQtys] = useState<Record<string, number>>({});
  const [addonQtys, setAddonQtys] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      // Try notion_id first, then uuid
      const { data } = await supabase
        .from("events")
        .select("*")
        .or(`notion_id.eq.${slug},id.eq.${slug}`)
        .maybeSingle();

      if (data) {
        setEvent(mapEventData(data));
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p style={{ color: "var(--color-mist)" }}>載入活動資料中…</p>
      </div>
    );
  }

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.excerpt,
    ...(event.date && { startDate: event.date }),
    ...(event.location && {
      location: {
        "@type": "Place",
        name: event.location,
        address: {
          "@type": "PostalAddress",
          addressRegion: "宜蘭縣",
          addressCountry: "TW",
        },
      },
    }),
    organizer: {
      "@type": "Organization",
      name: "現思文化創藝術有限公司",
      url: "https://makesense.ink",
    },
    ...(event.tickets.length > 0 && {
      offers: event.tickets.map((t) => ({
        "@type": "Offer",
        name: t.name,
        price: t.price.replace(/[^0-9]/g, ""),
        priceCurrency: "TWD",
        availability: "https://schema.org/InStock",
        url: `https://makesense.ink/events/${slug}`,
      })),
    }),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      {/* SP-E0: Hero banner */}
      <div
        className="relative flex items-end"
        style={{
          background: "linear-gradient(135deg, var(--color-moss), #3a5230)",
          minHeight: 320,
          padding: "48px 40px",
        }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 1160 }}>
          <p className="text-sm tracking-widest mb-2" style={{ color: "var(--color-mist)", fontFamily: "var(--font-sans)" }}>
            活動
          </p>
          <h1
            className="text-3xl sm:text-4xl font-semibold text-white mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {event.title}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/70 mt-1">
            <span>{event.date}</span>
            {event.location && <span>地點：{event.location}</span>}
            {event.guide && <span>帶路人：<span className="text-white font-medium">{event.guide}</span></span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-10 py-12" style={{ maxWidth: 1160 }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
          {/* Left: Event details */}
          <div>
            {/* Excerpt */}
            {event.excerpt && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-bark)", fontFamily: "var(--font-serif)" }}>
                  關於這場活動
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>
                  {event.excerpt}
                </p>
              </section>
            )}

            {/* Route — 每個地點可點擊彈出介紹 */}
            {event.routeStops.length > 0 && (
              <section className="mb-8 relative">
                <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-bark)", fontFamily: "var(--font-serif)" }}>
                  活動路線
                </h2>
                <div className="flex items-center flex-wrap gap-y-2">
                  {event.routeStops.map((stop, i) => (
                    <div key={i} className="flex items-center">
                      {i > 0 && (
                        <span className="mx-2 text-sm" style={{ color: "var(--color-dust)" }}>→</span>
                      )}
                      <button
                        onClick={() => setPopupIndex(popupIndex === i ? null : i)}
                        className="relative px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:shadow-sm"
                        style={{
                          background: popupIndex === i ? "var(--color-teal)" : "var(--color-parchment)",
                          color: popupIndex === i ? "#fff" : "var(--color-bark)",
                          border: `1px solid ${popupIndex === i ? "var(--color-teal)" : "var(--color-dust)"}`,
                        }}
                      >
                        {stop.name}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Popup */}
                {popupIndex !== null && (
                  <div
                    className="mt-3 rounded-lg overflow-hidden shadow-lg animate-in fade-in"
                    style={{ border: "1px solid var(--color-dust)", background: "#fff", maxWidth: 400 }}
                  >
                    <div
                      className="h-[160px] flex items-center justify-center"
                      style={{ background: "var(--color-parchment)" }}
                    >
                      <ImagePlaceholder type="event" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                          {event.routeStops[popupIndex].name}
                        </h4>
                        <button
                          onClick={() => setPopupIndex(null)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ color: "var(--color-mist)" }}
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--color-bark)" }}>
                        {event.routeStops[popupIndex].desc}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Full content */}
            {event.content && (
              <section className="mb-8">
                <div
                  className="rounded-lg p-6 text-sm leading-relaxed whitespace-pre-line"
                  style={{ background: "var(--color-warm-white)", color: "var(--color-ink)" }}
                >
                  {event.content}
                </div>
              </section>
            )}

            {/* Keywords */}
            {event.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: Ticket + Add-ons sidebar (sticky, compact) */}
          <aside className="lg:sticky lg:top-6">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
              <div className="p-4" style={{ background: "var(--color-warm-white)" }}>
                {/* 票券 */}
                {event.tickets.length > 0 && (
                  <>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>票券</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {event.tickets.map((t) => {
                        const q = ticketQtys[t.name] || 0;
                        return (
                          <div key={t.name} className="rounded-lg p-2 text-center" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                            <p className="text-[0.8em] font-medium" style={{ color: "var(--color-ink)" }}>{t.name}</p>
                            <p className="text-[0.7em] mb-1.5" style={{ color: "var(--color-rust)" }}>{t.price}</p>
                            <div className="flex items-center justify-center border rounded mx-auto" style={{ borderColor: "var(--color-dust)", width: "fit-content" }}>
                              <button onClick={() => setTicketQtys(p => ({ ...p, [t.name]: Math.max(0, q - 1) }))} className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>−</button>
                              <span className="w-5 h-6 flex items-center justify-center text-xs">{q}</span>
                              <button onClick={() => setTicketQtys(p => ({ ...p, [t.name]: q + 1 }))} className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* 加購 */}
                {event.addons.length > 0 && (
                  <>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>加購</p>
                    <div className="grid grid-cols-2 gap-2">
                      {event.addons.map((a) => {
                        const q = addonQtys[a.name] || 0;
                        return (
                          <div key={a.name} className="rounded-lg p-2 text-center" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                            <p className="text-[0.8em] font-medium" style={{ color: "var(--color-ink)" }}>{a.name}</p>
                            <p className="text-[0.7em] mb-1.5" style={{ color: "var(--color-rust)" }}>{a.price}</p>
                            <div className="flex items-center justify-center border rounded mx-auto" style={{ borderColor: "var(--color-dust)", width: "fit-content" }}>
                              <button onClick={() => setAddonQtys(p => ({ ...p, [a.name]: Math.max(0, q - 1) }))} className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>−</button>
                              <span className="w-5 h-6 flex items-center justify-center text-xs">{q}</span>
                              <button onClick={() => setAddonQtys(p => ({ ...p, [a.name]: q + 1 }))} className="w-6 h-6 text-xs" style={{ color: "var(--color-bark)" }}>+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {(() => {
                const parsePrice = (s: string) => parseInt(s.replace(/[^0-9]/g, "")) || 0;
                const ticketTotal = event.tickets.reduce((s, t) => s + parsePrice(t.price) * (ticketQtys[t.name] || 0), 0);
                const addonTotal = event.addons.reduce((s, a) => s + parsePrice(a.price) * (addonQtys[a.name] || 0), 0);
                const grandTotal = ticketTotal + addonTotal;
                const hasSelection = Object.values(ticketQtys).some(q => q > 0);

                return (
                  <div className="p-4">
                    <div className="flex justify-between mb-3">
                      <span className="text-sm" style={{ color: "var(--color-muted)" }}>合計</span>
                      <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>NT$ {grandTotal.toLocaleString()}</span>
                    </div>
                    <button
                      disabled={!hasSelection}
                      onClick={() => {
                        // 加入購物車：每個票種一筆
                        for (const t of event.tickets) {
                          const q = ticketQtys[t.name] || 0;
                          if (q > 0) {
                            addItem({
                              id: `ticket-${slug}-${t.name}`,
                              name: event.title,
                              subtitle: t.name,
                              type: event.type,
                              price: parsePrice(t.price),
                              qty: q,
                              eventId: slug,
                              meta: { date: event.date, guide: event.guide },
                            });
                          }
                        }
                        for (const a of event.addons) {
                          const q = addonQtys[a.name] || 0;
                          if (q > 0) {
                            addItem({
                              id: `addon-${slug}-${a.name}`,
                              name: event.title,
                              subtitle: a.name + "（加購）",
                              type: event.type,
                              price: parsePrice(a.price),
                              qty: q,
                              eventId: slug,
                            });
                          }
                        }
                        setShowRegistration(true);
                        setAdded(true);
                        setTimeout(() => setAdded(false), 2000);
                      }}
                      className="w-full h-10 rounded text-sm font-medium text-white transition-colors"
                      style={{ background: !hasSelection ? "var(--color-mist)" : added ? "var(--color-teal)" : "var(--color-moss)" }}>
                      {added ? "✓ 已加入購物車" : hasSelection ? "立即報名" : "請先選擇票券"}
                    </button>
                  </div>
                );
              })()}
            </div>
          </aside>
        </div>

        {/* 導購區 */}
        <div className="mx-auto px-10" style={{ maxWidth: 1160 }}>
          <AlsoWantToKnow />
          <MightAlsoLike />
        </div>
      </div>

      {/* 報名彈出表單 */}
      <RegistrationModal
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        formType={event.type}
        eventTitle={event.title}
        ticketSummary="成人票 ×1"
      />
    </div>
  );
}
