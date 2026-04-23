"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";

type VendorData = {
  vendor: {
    id: string; title: string; brandName: string; type: string; region: string;
    url: string; keywords: string; intro: string; logoUrl: string | null; imageUrl: string | null;
  };
  event: { title: string; date: string | null; endDate: string | null } | null;
  products: Array<{ id: string; name: string; price: number; preorder_limit: number | null; intro: string; photoUrl: string | null }>;
  experiences: Array<{ id: string; name: string; price: number; capacity: number | null; content: string }>;
  schedules: Array<{ id: string; theme: string; price: number; content: string }>;
};

type MarketData = {
  event: { id: string; title: string; date: string | null; location: string };
  vendors: Array<{ id: string; brandName: string; type: string; keywords: string; intro: string; logoUrl: string | null }>;
};

type UnavailableReason = "not_accepted" | "expired" | "not_found";

export default function BuyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const isMarket = slug.startsWith("market-");
  const isVendor = slug.startsWith("vendor-");
  const notionId = slug.replace(/^(market-|vendor-)/, "");

  if (isMarket) return <MarketOverviewPage notionId={notionId} />;
  if (isVendor) return <VendorPage notionId={notionId} />;
  return <UnknownSlug />;
}

function UnknownSlug() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8f4" }}>
      <div className="text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-semibold">找不到此頁面</p>
        <p className="text-sm mt-2" style={{ color: "#aaa" }}>連結格式不正確</p>
      </div>
    </div>
  );
}

function Unavailable({ reason, eventTitle }: { reason: UnavailableReason; eventTitle?: string }) {
  const text =
    reason === "expired" ? `「${eventTitle || "這場市集"}」已結束，預購已關閉` :
    reason === "not_accepted" ? "此攤商尚未錄取或已下架" :
    "找不到此頁面";
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8f4", padding: "24px" }}>
      <div className="text-center" style={{ maxWidth: 360 }}>
        <p className="text-4xl mb-4">🌸</p>
        <p className="text-lg font-semibold mb-2" style={{ color: "#333" }}>{text}</p>
        <p className="text-sm mt-4" style={{ color: "#aaa" }}>
          追蹤我們的 IG/FB 獲知下一場市集
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 市集總覽頁
// ═══════════════════════════════════════════════════
function MarketOverviewPage({ notionId }: { notionId: string }) {
  const [data, setData] = useState<MarketData | null>(null);
  const [reason, setReason] = useState<UnavailableReason | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    fetch(`/api/buy/market/${notionId}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json.available) {
          setReason(json.reason || "not_found");
          if (json.eventTitle) setEventTitle(json.eventTitle);
        } else {
          setData(json);
        }
      })
      .catch(() => setReason("not_found"))
      .finally(() => setLoading(false));
  }, [notionId]);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8f4" }}><p style={{ color: "#aaa" }}>載入中…</p></div>;
  if (reason) return <Unavailable reason={reason} eventTitle={eventTitle} />;
  if (!data) return <UnknownSlug />;

  const dateStr = data.event.date ? new Date(data.event.date).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" }) : "";

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f4" }}>
      {/* Hero */}
      <div style={{ background: "var(--color-moss)", color: "#fff", padding: "48px 16px 64px", textAlign: "center" }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ opacity: 0.7 }}>MAKESENSE MARKET</p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-serif)" }}>{data.event.title}</h1>
        <p className="text-sm opacity-90">{dateStr}</p>
        {data.event.location && <p className="text-sm opacity-80 mt-1">📍 {data.event.location}</p>}
        <p className="text-xs mt-4 opacity-70">共 {data.vendors.length} 組攤商登場</p>
      </div>

      {/* Vendor grid */}
      <div style={{ maxWidth: 1080, margin: "-32px auto 0", padding: "0 16px 48px" }}>
        {data.vendors.length === 0 ? (
          <p className="text-center py-12" style={{ color: "#aaa" }}>攤商名單陸續公佈中…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.vendors.map((v) => (
              <Link key={v.id} href={`/buy/vendor-${v.id}`}
                className="rounded-xl overflow-hidden transition-shadow hover:shadow-lg"
                style={{ background: "#fff", border: "1px solid #eee", textDecoration: "none" }}>
                <div className="h-32 flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                  {v.logoUrl ? <img src={v.logoUrl} alt={v.brandName} className="max-h-24 max-w-[70%] object-contain" />
                    : <span className="text-4xl opacity-30">🏪</span>}
                </div>
                <div className="p-4">
                  <p className="text-base font-semibold mb-1" style={{ color: "var(--color-ink)" }}>{v.brandName}</p>
                  {v.type && <p className="text-xs mb-2" style={{ color: "var(--color-moss)" }}>{v.type}</p>}
                  {v.keywords && <p className="text-xs mb-2" style={{ color: "var(--color-bark)" }}>{v.keywords}</p>}
                  {v.intro && <p className="text-xs leading-relaxed" style={{ color: "var(--color-mist)" }}>{v.intro}…</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 攤商個別頁 + 預購表單
// ═══════════════════════════════════════════════════
function VendorPage({ notionId }: { notionId: string }) {
  const [data, setData] = useState<VendorData | null>(null);
  const [reason, setReason] = useState<UnavailableReason | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState("");
  const [cart, setCart] = useState<Record<string, { type: "商品"|"體驗"|"活動"; name: string; price: number; qty: number }>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ orderNumber: string } | null>(null);

  useEffect(() => {
    fetch(`/api/buy/vendor/${notionId}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json.available) {
          setReason(json.reason || "not_found");
          if (json.eventTitle) setEventTitle(json.eventTitle);
        } else {
          setData(json);
        }
      })
      .catch(() => setReason("not_found"))
      .finally(() => setLoading(false));
  }, [notionId]);

  const changeQty = (id: string, delta: number, type: "商品"|"體驗"|"活動", name: string, price: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const cur = next[id]?.qty || 0;
      const q = Math.max(0, cur + delta);
      if (q === 0) { delete next[id]; }
      else { next[id] = { type, name, price, qty: q }; }
      return next;
    });
  };

  const total = Object.values(cart).reduce((s, it) => s + it.price * it.qty, 0);
  const hasItems = Object.keys(cart).length > 0;

  const handleSubmit = async () => {
    if (!name || !phone) { alert("請填姓名與電話"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/buy/preorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorDb05Id: notionId,
          contact: { name, phone, email, note },
          items: Object.entries(cart).map(([id, it]) => ({ id, type: it.type, name: it.name, price: it.price, qty: it.qty })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "預購失敗");
      setDone({ orderNumber: json.orderNumber });
    } catch (e: any) {
      alert(e.message || "預購失敗");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8f4" }}><p style={{ color: "#aaa" }}>載入中…</p></div>;
  if (reason) return <Unavailable reason={reason} eventTitle={eventTitle} />;
  if (!data) return <UnknownSlug />;

  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8f4", padding: 24 }}>
        <div className="text-center" style={{ maxWidth: 400 }}>
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-xl font-semibold mb-2">預購已送出</h2>
          <p className="text-sm mb-1" style={{ color: "var(--color-mist)" }}>訂單編號</p>
          <p className="text-base font-mono mb-4" style={{ color: "var(--color-ink)" }}>{done.orderNumber}</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-bark)" }}>
            攤商已收到通知。<br />
            請於市集當天帶此訂單編號至攤位取貨付款。
          </p>
        </div>
      </div>
    );
  }

  const evDate = data.event?.date ? new Date(data.event.date).toLocaleDateString("zh-TW", { month: "long", day: "numeric" }) : "";

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f4", paddingBottom: 120 }}>
      {/* Cover */}
      <div style={{ position: "relative", height: 220, background: "var(--color-parchment)", overflow: "hidden" }}>
        {data.vendor.imageUrl ? (
          <img src={data.vendor.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🏪</div>
        )}
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
        {/* Brand header */}
        <div style={{ marginTop: -40, position: "relative", zIndex: 2 }}>
          <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid #eee", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
            <div className="flex items-start gap-4">
              {data.vendor.logoUrl && (
                <img src={data.vendor.logoUrl} alt="" className="w-16 h-16 rounded-lg object-contain flex-shrink-0"
                  style={{ background: "var(--color-warm-white)", padding: 4 }} />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold mb-1" style={{ color: "var(--color-ink)", fontFamily: "var(--font-serif)" }}>
                  {data.vendor.brandName}
                </h1>
                {data.vendor.type && <span className="inline-block text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-warm-white)", color: "var(--color-moss)" }}>{data.vendor.type}</span>}
                {data.vendor.keywords && <p className="text-xs mt-1.5" style={{ color: "var(--color-bark)" }}>{data.vendor.keywords}</p>}
              </div>
            </div>
            {data.event && (
              <p className="text-xs mt-3 pt-3" style={{ borderTop: "1px solid #f0f0f0", color: "var(--color-mist)" }}>
                🗓 {evDate} · {data.event.title}
              </p>
            )}
          </div>
        </div>

        {/* Intro */}
        {data.vendor.intro && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--color-bark)" }}>關於我們</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-ink)" }}>{data.vendor.intro}</p>
            {data.vendor.url && (
              <a href={data.vendor.url} target="_blank" rel="noreferrer" className="inline-block text-xs mt-2 underline" style={{ color: "var(--color-teal)" }}>
                品牌粉專/官網 →
              </a>
            )}
          </section>
        )}

        {/* Schedule */}
        {data.schedules.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-bark)" }}>🗓️ 活動時間</h2>
            <div className="space-y-2">
              {data.schedules.map((s) => {
                const q = cart[s.id]?.qty || 0;
                return (
                  <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#fff", border: "1px solid #eee" }}>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{s.theme}</p>
                      {s.content && <p className="text-xs mt-1" style={{ color: "var(--color-mist)" }}>{s.content}</p>}
                      {s.price > 0 && <p className="text-xs mt-1" style={{ color: "var(--color-rust)" }}>NT$ {s.price}</p>}
                    </div>
                    {s.price > 0 && (
                      <div className="flex items-center border rounded" style={{ borderColor: "#ddd" }}>
                        <button onClick={() => changeQty(s.id, -1, "活動", s.theme, s.price)} className="w-7 h-7 text-sm">−</button>
                        <span className="w-6 text-center text-sm">{q}</span>
                        <button onClick={() => changeQty(s.id, 1, "活動", s.theme, s.price)} className="w-7 h-7 text-sm">+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Products */}
        {data.products.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-bark)" }}>🛒 預購商品（市集當天取貨付款）</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.products.map((p) => {
                const q = cart[p.id]?.qty || 0;
                const limit = p.preorder_limit;
                const disabled = limit !== null && q >= limit;
                return (
                  <div key={p.id} className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #eee" }}>
                    {p.photoUrl && <img src={p.photoUrl} alt={p.name} className="w-full h-40 object-cover" />}
                    <div className="p-3">
                      <p className="text-sm font-medium mb-1" style={{ color: "var(--color-ink)" }}>{p.name}</p>
                      {p.intro && <p className="text-xs mb-2" style={{ color: "var(--color-mist)" }}>{p.intro}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--color-rust)" }}>NT$ {p.price}</p>
                        <div className="flex items-center border rounded" style={{ borderColor: "#ddd" }}>
                          <button onClick={() => changeQty(p.id, -1, "商品", p.name, p.price)} className="w-7 h-7 text-sm">−</button>
                          <span className="w-6 text-center text-sm">{q}</span>
                          <button onClick={() => changeQty(p.id, 1, "商品", p.name, p.price)}
                            disabled={disabled}
                            className="w-7 h-7 text-sm"
                            style={{ color: disabled ? "#ccc" : undefined }}>+</button>
                        </div>
                      </div>
                      {limit !== null && <p className="text-[0.65em] mt-1 text-right" style={{ color: "var(--color-mist)" }}>預購上限 {limit}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Experiences */}
        {data.experiences.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-bark)" }}>🎨 現場體驗（預約名額）</h2>
            <div className="space-y-2">
              {data.experiences.map((e) => {
                const q = cart[e.id]?.qty || 0;
                const limit = e.capacity;
                const disabled = limit !== null && q >= limit;
                return (
                  <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#fff", border: "1px solid #eee" }}>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{e.name}</p>
                      {e.content && <p className="text-xs mt-1" style={{ color: "var(--color-mist)" }}>{e.content}</p>}
                      <p className="text-xs mt-1" style={{ color: "var(--color-rust)" }}>NT$ {e.price}</p>
                    </div>
                    <div className="flex items-center border rounded" style={{ borderColor: "#ddd" }}>
                      <button onClick={() => changeQty(e.id, -1, "體驗", e.name, e.price)} className="w-7 h-7 text-sm">−</button>
                      <span className="w-6 text-center text-sm">{q}</span>
                      <button onClick={() => changeQty(e.id, 1, "體驗", e.name, e.price)}
                        disabled={disabled} className="w-7 h-7 text-sm"
                        style={{ color: disabled ? "#ccc" : undefined }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Contact + Submit */}
        {hasItems && (
          <section className="mt-10 rounded-xl p-5" style={{ background: "#fff", border: "1px solid #eee" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-bark)" }}>聯絡資訊</h2>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="姓名 *" value={name} onChange={(e) => setName(e.target.value)}
                className="h-10 px-3 rounded border text-sm" style={{ borderColor: "#ddd" }} />
              <input type="tel" placeholder="電話 *" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="h-10 px-3 rounded border text-sm" style={{ borderColor: "#ddd" }} />
            </div>
            <input type="email" placeholder="Email（選填，用於通知）" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded border text-sm mt-3" style={{ borderColor: "#ddd" }} />
            <textarea placeholder="備註（選填）" value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} className="w-full px-3 py-2 rounded border text-sm mt-3" style={{ borderColor: "#ddd" }} />

            <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: "1px solid #f0f0f0" }}>
              <span className="text-sm" style={{ color: "var(--color-mist)" }}>合計</span>
              <span className="text-xl font-bold" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>NT$ {total.toLocaleString()}</span>
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full h-12 rounded-lg text-sm font-medium text-white mt-4"
              style={{ background: submitting ? "var(--color-mist)" : "var(--color-moss)" }}>
              {submitting ? "處理中…" : "確認預購"}
            </button>
            <p className="text-xs text-center mt-2" style={{ color: "var(--color-mist)" }}>
              市集當天至攤位現場取貨付款
            </p>
          </section>
        )}

        {!hasItems && (data.products.length > 0 || data.experiences.length > 0 || data.schedules.some((s) => s.price > 0)) && (
          <p className="text-center text-xs mt-10" style={{ color: "var(--color-mist)" }}>
            選擇商品或體驗後，會在下方出現預購表單
          </p>
        )}
      </div>
    </div>
  );
}
