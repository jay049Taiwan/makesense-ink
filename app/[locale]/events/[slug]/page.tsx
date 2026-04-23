"use client";

import { useState, useEffect, use } from "react";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";
import RegistrationModal from "@/components/booking/RegistrationModal";
import { useCart } from "@/components/providers/CartProvider";
import { supabase } from "@/lib/supabase";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import WishlistButton from "@/components/ui/WishlistButton";

interface EventData {
  title: string;
  date: string;
  rawDate: string | null; // ISO date for expiry check
  location: string;
  guide: string;
  type: "走讀" | "講座" | "市集" | "空間";
  excerpt: string;
  content: string;
  keywords: string[];
  routeStops: { name: string; desc: string }[];
  tickets: { name: string; price: string; notion_id?: string }[];
  addons: { name: string; price: string }[];
  minCapacity: number | null;
  notion_id?: string;
}

const fallbackEvent: EventData = {
  title: "載入中…",
  date: "",
  rawDate: null,
  location: "",
  guide: "",
  type: "走讀",
  excerpt: "",
  content: "",
  keywords: [],
  routeStops: [],
  tickets: [],
  addons: [],
  minCapacity: null,
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
    rawDate: row.event_date || null,
    location: row.location || "",
    guide: row.guide || "",
    type,
    excerpt: row.description?.slice(0, 200) || "",
    content: row.description || "",
    keywords,
    routeStops,
    tickets,
    addons,
    minCapacity: row.min_capacity ?? null,
    notion_id: row.notion_id || undefined,
  };
}

export default function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { addItem, updateItem } = useCart();
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
          <div className="flex items-center gap-3 mb-2">
            <h1
              className="text-3xl sm:text-4xl font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {event.title}
            </h1>
            <WishlistButton itemType="event" itemId={slug} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/70 mt-1">
            <span>{event.date}</span>
            {event.location && <span>地點：{event.location}</span>}
            {event.guide && <span>帶路人：<span className="text-white font-medium">{event.guide}</span></span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-10 py-12" style={{ maxWidth: 1160 }}>
        <div className="grid grid-cols-1 gap-12">
          {/* Event details */}
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

          {/* 底部置中：報名 panel 或 敲碗按鈕 */}
          <aside className="mx-auto w-full" style={{ maxWidth: 520 }}>
            {(() => {
              // 判斷活動是否已過期
              const isExpired = event.rawDate ? new Date(event.rawDate).getTime() < Date.now() : false;

              if (isExpired) {
                return <ExpiredEventPanel eventTitle={event.title} eventSlug={slug} />;
              }

              return (
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
                  <div className="p-4" style={{ background: "var(--color-warm-white)" }}>
                    {/* 成團門檻 */}
                    {event.minCapacity != null && event.minCapacity > 0 && (
                      <div className="mb-3 p-2 rounded text-[0.75em]" style={{ background: "rgba(232,147,90,0.08)", color: "var(--color-rust)", border: "1px solid rgba(232,147,90,0.2)" }}>
                        ⚠️ 需 {event.minCapacity} 人以上成團，未達將全額退費
                      </div>
                    )}
                    {/* 票券 */}
                    {event.tickets.length > 0 && (
                      <>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>票券</p>
                        <div className="flex flex-col gap-2 mb-4">
                          {event.tickets.map((t) => {
                            const q = ticketQtys[t.name] || 0;
                            // 市集/空間：一次報名就是一組，用勾選式選擇（0 或 1）
                            const fixedOneType = event.type === "市集" || event.type === "空間";
                            return (
                              <div key={t.name} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-[0.85em] font-medium truncate" style={{ color: "var(--color-ink)" }}>{t.name}</span>
                                  <span className="text-[0.8em] whitespace-nowrap" style={{ color: "var(--color-rust)" }}>NT$ {t.price}</span>
                                </div>
                                {fixedOneType ? (
                                  <button
                                    onClick={() => setTicketQtys(p => ({ ...p, [t.name]: q > 0 ? 0 : 1 }))}
                                    className="shrink-0 px-3 h-7 rounded text-xs font-medium transition-colors"
                                    style={{
                                      border: `1px solid ${q > 0 ? "var(--color-moss)" : "var(--color-dust)"}`,
                                      background: q > 0 ? "var(--color-moss)" : "#fff",
                                      color: q > 0 ? "#fff" : "var(--color-bark)",
                                    }}
                                  >
                                    {q > 0 ? "✓ 已選" : "選擇"}
                                  </button>
                                ) : (
                                  <div className="flex items-center border rounded shrink-0" style={{ borderColor: "var(--color-dust)" }}>
                                    <button onClick={() => setTicketQtys(p => ({ ...p, [t.name]: Math.max(0, q - 1) }))} className="w-7 h-7 text-sm" style={{ color: "var(--color-bark)" }}>−</button>
                                    <span className="w-6 h-7 flex items-center justify-center text-sm">{q}</span>
                                    <button onClick={() => setTicketQtys(p => ({ ...p, [t.name]: q + 1 }))} className="w-7 h-7 text-sm" style={{ color: "var(--color-bark)" }}>+</button>
                                  </div>
                                )}
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
                            // 只開報名表單，確認送出後才加入購物車
                            setShowRegistration(true);
                          }}
                          className="w-full h-10 rounded text-sm font-medium text-white transition-colors"
                          style={{ background: !hasSelection ? "var(--color-mist)" : "var(--color-moss)" }}>
                          {hasSelection ? "立即報名" : "請先選擇票券"}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
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
        eventDate={event.date}
        eventNotionId={event.notion_id}
        ticketSummary={
          [
            ...event.tickets.filter(t => (ticketQtys[t.name] || 0) > 0).map(t => `${t.name} ×${ticketQtys[t.name]}`),
            ...event.addons.filter(a => (addonQtys[a.name] || 0) > 0).map(a => `${a.name}（加購）×${addonQtys[a.name]}`),
          ].join("、") || "成人票 ×1"
        }
        attendeeCount={
          // 只把「真票券」算進報名人數；名稱含「加購」的視為加購品，不計入
          event.tickets
            .filter(t => !/加購/.test(t.name))
            .reduce((s, t) => s + (ticketQtys[t.name] || 0), 0) || 1
        }
        onSubmit={async ({ contact, attendees }) => {
          // 報名送出成功才加入購物車（避免用戶放棄填寫留下髒訂單）
          // 依票券張數把 attendees 依序分配給各 ticket item（加購品跳過）
          let cursor = 0;
          for (const t of event.tickets) {
            const q = ticketQtys[t.name] || 0;
            if (q === 0) continue;
            const itemId = `ticket-${slug}-${t.name}`;
            const isAddonLike = /加購/.test(t.name);
            if (isAddonLike) {
              // 加購品：只寫 contact
              addItem({
                id: itemId,
                name: event.title,
                subtitle: t.name,
                type: event.type,
                price: parsePrice(t.price),
                qty: q,
                eventId: slug,
                productId: t.notion_id,
                meta: { date: event.date, guide: event.guide },
                contact,
              });
              continue;
            }
            const slice = attendees.slice(cursor, cursor + q);
            cursor += q;
            addItem({
              id: itemId,
              name: event.title,
              subtitle: t.name,
              type: event.type,
              price: parsePrice(t.price),
              qty: q,
              eventId: slug,
              productId: t.notion_id,
              meta: { date: event.date, guide: event.guide },
              contact,
              registrations: slice.map(a => ({ ...a })),
              registration: slice[0] ? { ...slice[0] } : undefined,
            });
          }
          for (const a of event.addons) {
            const q = addonQtys[a.name] || 0;
            if (q === 0) continue;
            addItem({
              id: `addon-${slug}-${a.name}`,
              name: event.title,
              subtitle: a.name + "（加購）",
              type: event.type,
              price: parsePrice(a.price),
              qty: q,
              eventId: slug,
              contact,
            });
          }
        }}
      />
    </div>
  );
}

/** 活動結束 → 敲碗再辦表單 */
function ExpiredEventPanel({ eventTitle, eventSlug }: { eventTitle: string; eventSlug: string }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [encoreCount, setEncoreCount] = useState(0);

  // 讀取敲碗人數
  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("encore_requests")
        .select("*", { count: "exact", head: true })
        .eq("event_slug", eventSlug);
      setEncoreCount(count || 0);
    })();
  }, [eventSlug, submitted]);

  // 自動填入會員資訊（從 NextAuth session）
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.email) {
          setContact(session.user.email);
          setName(session.user.name || "");
        }
      } catch {}
    })();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !contact.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from("encore_requests").insert({
        event_slug: eventSlug,
        event_title: eventTitle,
        name: name.trim(),
        email: contact.includes("@") ? contact.trim() : null,
        phone: !contact.includes("@") ? contact.trim() : null,
        note: note.trim() || null,
      });
      setSubmitted(true);
    } catch {
      alert("送出失敗，請稍後再試");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="rounded-lg p-6 text-center" style={{ border: "1px solid var(--color-teal)", background: "var(--color-warm-white)" }}>
        <span className="text-3xl mb-3 block">🎉</span>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-ink)" }}>已收到你的敲碗！</p>
        <p className="text-xs mb-2" style={{ color: "var(--color-mist)" }}>如果這場活動再次舉辦，我們會第一時間通知你。</p>
        {encoreCount > 0 && (
          <p className="text-xs font-bold" style={{ color: "var(--color-teal)" }}>
            🔔 已有 {encoreCount} 人敲碗
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
      <div className="p-5 text-center" style={{ background: "var(--color-warm-white)" }}>
        <span className="text-2xl mb-2 block">🕐</span>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-ink)" }}>活動已結束</p>
        {encoreCount > 0 && (
          <p className="text-xs font-bold mb-2" style={{ color: "var(--color-teal)" }}>🔔 已有 {encoreCount} 人敲碗</p>
        )}
        <p className="text-xs mb-4" style={{ color: "var(--color-mist)" }}>錯過了？留下聯絡方式，再辦的時候通知你！</p>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full h-10 rounded text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: "var(--color-teal)" }}>
            🔔 敲碗再辦！
          </button>
        ) : (
          <div className="text-left space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-bark)" }}>姓名</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="你的名字"
                className="w-full px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "var(--color-dust)" }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-bark)" }}>聯絡方式（Email 或電話）</label>
              <input value={contact} onChange={e => setContact(e.target.value)} placeholder="email@example.com 或 0912-345-678"
                className="w-full px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "var(--color-dust)" }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-bark)" }}>備註（選填）</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="例：希望改在週末"
                className="w-full px-3 py-2 rounded border text-sm outline-none" style={{ borderColor: "var(--color-dust)" }} />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !contact.trim() || submitting}
              className="w-full h-10 rounded text-sm font-medium text-white transition-colors"
              style={{ background: submitting ? "var(--color-mist)" : "var(--color-teal)" }}>
              {submitting ? "送出中..." : "送出敲碗"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
