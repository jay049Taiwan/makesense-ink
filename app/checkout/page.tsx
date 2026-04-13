"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/components/providers/CartProvider";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";
import Link from "next/link";

/* ═══════════════════════════════════════════
   Dev 假資料（購物車空時自動填入）
   ═══════════════════════════════════════════ */
const DEMO_ITEMS: CartItem[] = [
  {
    id: "ticket-a1-adult", name: "走讀行旅｜宜蘭舊城散步", subtitle: "成人票", type: "走讀",
    price: 500, qty: 1, eventId: "a1",
    meta: { date: "2026/04/21", guide: "黃育智" },
    registration: {
      contact_name: "王大明", phone: "0912-345-678", email: "wangdaming@gmail.com",
      id_number: "A123456789", birth_date: "1990-01-15", residence: "宜蘭縣",
      referral_sources: "Facebook 粉專", registration_reasons: "對主題/路線感興趣",
    },
  },
  {
    id: "ticket-a1-lunch", name: "走讀行旅｜宜蘭舊城散步", subtitle: "午餐便當（加購）", type: "走讀",
    price: 120, qty: 1, eventId: "a1",
  },
  {
    id: "product-p1", name: "蘭東案內 04期", subtitle: "書籍", type: "商品",
    price: 250, qty: 2, productId: "p1",
  },
];

/* ═══════════════════════════════════════════
   結帳頁面（= 購物車頁面）
   ═══════════════════════════════════════════ */
export default function CheckoutPage() {
  const router = useRouter();
  const { items, updateQty, removeItem, totalPrice, clearCart, addItem } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [delivery, setDelivery] = useState("self");
  const [submitting, setSubmitting] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [note, setNote] = useState("");
  const [activeRegIdx, setActiveRegIdx] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Dev: 購物車空時注入假資料
  useEffect(() => {
    if (items.length === 0) {
      DEMO_ITEMS.forEach((item) => addItem(item));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 是否含票券（需審核）
  const hasTickets = items.some((i) => ["走讀", "講座", "市集", "空間", "諮詢"].includes(i.type));
  // 是否含實體商品（需寄送選項）
  const hasProducts = items.some((i) => i.type === "商品" || i.type === "預購");
  // 收集所有票券的報名資訊
  const ticketRegistrations = items.filter((i) => i.registration && Object.keys(i.registration).length > 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id, name: i.name, subtitle: i.subtitle, type: i.type,
            price: i.price, qty: i.qty, eventId: i.eventId, productId: i.productId,
            meta: i.meta, registration: i.registration,
          })),
          contact: {
            name: contactName || (document.querySelector('[name="contact_name"]') as HTMLInputElement)?.value || "",
            phone: contactPhone || (document.querySelector('[name="phone"]') as HTMLInputElement)?.value || "",
            email: (document.querySelector('[name="email"]') as HTMLInputElement)?.value || "",
          },
          delivery,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "結帳失敗");
      clearCart();
      router.push(`/checkout/success?status=${hasTickets ? "review" : "success"}&orderId=${data.orderId}`);
    } catch (err: any) {
      alert(err.message || "結帳失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
      <h1 className="text-[1.5em] font-bold mb-1" style={{ color: "var(--color-ink)" }}>
        購物車與結帳
      </h1>
      <p className="text-xs mb-8" style={{ color: "var(--color-mist)" }}>
        共 {items.length} 項・NT$ {totalPrice.toLocaleString()}
      </p>

      {items.length === 0 ? (
        /* ── 空購物車 ── */
        <div className="text-center py-16">
          <p className="text-4xl mb-4 opacity-30">🛒</p>
          <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>購物車是空的</p>
          <Link href="/bookstore" className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: "var(--color-moss)" }}>
            去逛逛
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* ═══════════════════════════════════════
              Left Column
              ═══════════════════════════════════════ */}
          <div>

            {/* ── 1. 購物車明細 ── */}
            <Section title="購物車內容">
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-4 py-3"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-dust)" : undefined, background: idx % 2 === 0 ? "#fff" : "var(--color-warm-white)" }}
                  >
                    {/* 圖示 */}
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
                      <span className="text-base opacity-30">
                        {({ "商品": "📦", "走讀": "🚶", "講座": "🎤", "市集": "🎪", "空間": "🏠", "預購": "📦", "諮詢": "💬" } as Record<string, string>)[item.type] || "📦"}
                      </span>
                    </div>

                    {/* 品名 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink)" }}>{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.subtitle && <span className="text-[0.65em]" style={{ color: "var(--color-mist)" }}>{item.subtitle}</span>}
                        {item.meta?.date && (
                          <span className="text-[0.6em] px-1.5 py-0.5 rounded" style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}>{item.meta.date}</span>
                        )}
                      </div>
                    </div>

                    {/* 數量 */}
                    <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center text-xs hover:bg-gray-50" style={{ color: "var(--color-bark)" }}>−</button>
                      <span className="w-7 h-7 flex items-center justify-center text-xs font-medium" style={{ color: "var(--color-ink)" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 flex items-center justify-center text-xs hover:bg-gray-50" style={{ color: "var(--color-bark)" }}>+</button>
                    </div>

                    {/* 小計 */}
                    <p className="text-sm font-medium w-20 text-right" style={{ color: "var(--color-rust)" }}>
                      ${(item.price * item.qty).toLocaleString()}
                    </p>

                    {/* 刪除 */}
                    <button onClick={() => removeItem(item.id)} className="text-xs px-1.5 py-1 rounded hover:bg-red-50 transition-colors" style={{ color: "var(--color-mist)" }}>✕</button>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── 2. 報名資訊（可編輯，多人分頁）── */}
            {ticketRegistrations.length > 0 && (
              <Section title="報名資訊">
                {/* 多人分頁 */}
                {ticketRegistrations.length > 1 && (
                  <div className="flex gap-1 mb-3">
                    {ticketRegistrations.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveRegIdx(idx)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: activeRegIdx === idx ? "var(--color-teal)" : "var(--color-parchment)",
                          color: activeRegIdx === idx ? "#fff" : "var(--color-mist)",
                          border: "none", cursor: "pointer",
                        }}
                      >
                        {item.subtitle || `報名者 ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                {(() => {
                  const item = ticketRegistrations[activeRegIdx] || ticketRegistrations[0];
                  if (!item) return null;
                  return (
                    <div className="rounded-xl p-4" style={{ background: "rgba(78,205,196,0.04)", border: "1.5px solid rgba(78,205,196,0.3)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: "var(--color-teal)" }}>{item.type}</span>
                        <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{item.name}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                        {Object.entries(item.registration!).map(([key, val]) => (
                          <div key={key}>
                            <label className="text-[0.6em] mb-0.5 block" style={{ color: "var(--color-mist)" }}>{FIELD_LABELS[key] || key}</label>
                            <input
                              type="text"
                              defaultValue={val}
                              onChange={(e) => { item.registration![key] = e.target.value; }}
                              className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                              style={{ border: "1px solid var(--color-dust)", background: "#fff", color: "var(--color-ink)" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Section>
            )}

            {/* ── 3. 聯絡資訊 ── */}
            <Section title="聯絡資訊">
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="姓名" required name="contact_name" placeholder="王大明" onChange={(v) => setContactName(v)} />
                  <InputField label="電話" required name="phone" type="tel" placeholder="0912-345-678" onChange={(v) => setContactPhone(v)} />
                </div>
                <InputField label="Email" required name="email" type="email" placeholder="you@email.com" />
              </div>
            </Section>

            {/* ── 4. 取貨/寄送方式（有實體商品時才出現）── */}
            {hasProducts && (
              <Section title="取貨方式">
                <div className="rounded-xl p-4" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDelivery("self")}
                      className="rounded-lg py-3 text-sm font-medium transition-all text-center"
                      style={{
                        border: delivery === "self" ? "1.5px solid #4ECDC4" : "1px solid var(--color-dust)",
                        background: delivery === "self" ? "rgba(78,205,196,0.06)" : "#fff",
                        color: delivery === "self" ? "var(--color-teal)" : "var(--color-mist)",
                      }}
                    >
                      🏪 自取（旅人書店）
                    </button>
                    <button
                      onClick={() => setDelivery("ship")}
                      className="rounded-lg py-3 text-sm font-medium transition-all text-center"
                      style={{
                        border: delivery === "ship" ? "1.5px solid #4ECDC4" : "1px solid var(--color-dust)",
                        background: delivery === "ship" ? "rgba(78,205,196,0.06)" : "#fff",
                        color: delivery === "ship" ? "var(--color-teal)" : "var(--color-mist)",
                      }}
                    >
                      📦 郵寄（運費 $80）
                    </button>
                  </div>

                  {/* 寄送地址（選郵寄才展開）*/}
                  {delivery === "ship" && (
                    <div className="mt-4 space-y-3 pt-4" style={{ borderTop: "1px solid var(--color-dust)" }}>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="收件人姓名" required name="recipient_name" placeholder={contactName || "同聯絡人姓名"} />
                        <InputField label="收件人電話" required name="recipient_phone" type="tel" placeholder={contactPhone || "同聯絡人電話"} />
                      </div>
                      <InputField label="郵遞區號" required name="zip_code" placeholder="260" />
                      <InputField label="收件地址" required name="address" placeholder="宜蘭縣宜蘭市中山路二段 123 號" />
                      <p className="text-[0.6em]" style={{ color: "var(--color-mist)" }}>
                        郵局寄送，約 3-5 個工作天送達
                      </p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* ── 5. 付款方式 ── */}
            <Section title="付款方式">
              <div className="rounded-xl p-4" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ border: "1.5px solid #4ECDC4", background: "rgba(78,205,196,0.06)" }}>
                  <span className="text-lg">🏪</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-teal)" }}>到門市現場付現</p>
                    <p className="text-[0.65em] mt-0.5" style={{ color: "var(--color-mist)" }}>
                      請於取貨時至旅人書店（宜蘭縣羅東鎮文化街55號）現場付款
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            {/* ── 6. 備註 ── */}
            <Section title="備註">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="有什麼想告訴我們的嗎？例如：飲食過敏、特殊需求、發票需求等"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ border: "1px solid var(--color-dust)", background: "var(--color-warm-white)" }}
              />
            </Section>

            {/* 條款同意已移到右欄 */}
          </div>

          {/* ═══════════════════════════════════════
              Right: 訂單摘要 (sticky)
              ═══════════════════════════════════════ */}
          <aside className="lg:sticky lg:top-6 self-start">
            <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid var(--color-teal)" }}>
              <div className="p-5" style={{ background: "var(--color-warm-white)" }}>
                <h3 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>訂單摘要</h3>
                <div className="text-sm space-y-2 mb-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="truncate mr-2" style={{ color: "var(--color-ink)" }}>
                        {item.subtitle || item.name}
                        {item.qty > 1 && <span style={{ color: "var(--color-mist)" }}> ×{item.qty}</span>}
                      </span>
                      <span className="flex-shrink-0" style={{ color: "var(--color-rust)" }}>${(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                  {delivery === "ship" && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--color-ink)" }}>運費</span>
                      <span style={{ color: "var(--color-rust)" }}>$80</span>
                    </div>
                  )}
                </div>
                <div className="pt-3 flex justify-between" style={{ borderTop: "1px solid var(--color-dust)" }}>
                  <span className="font-semibold" style={{ color: "var(--color-ink)" }}>合計</span>
                  <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
                    NT$ {(totalPrice + (delivery === "ship" ? 80 : 0)).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-5">
                {/* 條款同意 */}
                <label className="flex items-start gap-2 text-[0.65em] cursor-pointer mb-3 leading-relaxed" style={{ color: "var(--color-ink)" }}>
                  <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="rounded mt-0.5 flex-shrink-0" />
                  <span>
                    我已閱讀並同意{" "}
                    <Link href="/terms" className="underline" style={{ color: "var(--color-teal)" }}>使用條款</Link>
                    {" "}與{" "}
                    <Link href="/privacy" className="underline" style={{ color: "var(--color-teal)" }}>隱私權政策</Link>
                    ，並了解活動退費規則
                  </span>
                </label>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !agreedTerms}
                  className="w-full h-11 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ background: (submitting || !agreedTerms) ? "var(--color-mist)" : "var(--color-moss)" }}
                >
                  {submitting ? "處理中..." : `確認結帳 — NT$ ${(totalPrice + (delivery === "ship" ? 80 : 0)).toLocaleString()}`}
                </button>
                <p className="text-[0.65em] text-center mt-2" style={{ color: "var(--color-mist)" }}>
                  🏪 到門市現場付現
                </p>

                {/* 票券提醒 */}
                {hasTickets && (
                  <div className="mt-3 p-2.5 rounded-lg text-[0.65em] leading-relaxed" style={{ background: "rgba(78,205,196,0.08)", color: "var(--color-teal)" }}>
                    📋 此訂單含活動票券，付款完成後將進入<strong>受理程序</strong>，我們確認後會以 Email 及 LINE 通知您。
                  </div>
                )}
              </div>
            </div>

            {/* 安全保障 */}
            <div className="mt-4 flex items-center justify-center gap-4 text-[0.6em]" style={{ color: "var(--color-mist)" }}>
              <span>🔒 SSL 加密</span>
              <span>🛡️ 綠界認證</span>
            </div>
          </aside>
        </div>
      )}

      {/* 導購區 */}
      <div className="mt-8">
        <AlsoWantToKnow />
        <MightAlsoLike />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   共用元件
   ═══════════════════════════════════════════ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-bark)" }}>{title}</h2>
      {children}
    </section>
  );
}

function InputField({ label, required, name, type = "text", placeholder, onChange }: {
  label: string; required?: boolean; name: string; type?: string; placeholder?: string; onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <input
        type={type} name={name} required={required} placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full h-9 px-3 rounded-lg text-sm outline-none transition-all"
        style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
      />
    </div>
  );
}

/* 報名欄位的中文標籤對照 */
const FIELD_LABELS: Record<string, string> = {
  contact_name: "姓名",
  phone: "電話",
  email: "Email",
  id_number: "身份證字號",
  birth_date: "出生年月日",
  residence: "居住地",
  referral_sources: "得知管道",
  registration_reasons: "報名原因",
  companion_name: "同行親友",
  companion_id_number: "親友身份證",
  companion_birth_date: "親友出生日",
  companion_phone: "親友電話",
  companion_email: "親友 Email",
  companion_line_id: "親友 LINE",
  want_to_know: "想了解的",
  is_parent_child: "親子報名",
  participant_age: "參與者年齡",
  parent_name: "家長姓名",
  parent_age: "家長年齡",
  child_name: "小朋友姓名",
  child_age: "小朋友年齡",
  booth_type: "攤位類型",
  brand_region: "品牌地區",
  brand_name: "品牌名稱",
  brand_url: "品牌連結",
  brand_intro: "品牌簡介",
  sell_goods: "販售品項",
  rental_space: "租借空間",
  rental_date: "使用日期",
  rental_time: "使用時間",
  attendee_count: "預計人數",
  usage_type: "使用性質",
  rental_purpose: "活動說明",
};
