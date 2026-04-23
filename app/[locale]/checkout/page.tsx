"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/components/providers/CartProvider";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";
import Link from "next/link";
import { sendGAEvent } from "@/lib/tracking";

/* ═══════════════════════════════════════════
   結帳頁面（= 購物車頁面）
   ═══════════════════════════════════════════ */
export default function CheckoutPage() {
  const router = useRouter();
  const { items, updateQty, removeItem, totalPrice, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [delivery, setDelivery] = useState("self");
  const [submitting, setSubmitting] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [note, setNote] = useState("");
  const [activeRegIdx, setActiveRegIdx] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [memberDefaults, setMemberDefaults] = useState<{ name: string; phone: string; email: string } | null>(null);
  // V2：活動報名要收退款資訊（未來金流接上後使用）
  const [refundMethod, setRefundMethod] = useState<"original" | "custom">("original");
  const [refundBankName, setRefundBankName] = useState("");
  const [refundAccountNumber, setRefundAccountNumber] = useState("");
  const [refundAccountHolder, setRefundAccountHolder] = useState("");

  // 讀登入會員的上次聯絡資訊，用作 placeholder
  useEffect(() => {
    fetch("/api/user/profile").then(r => r.ok ? r.json() : null).then(d => {
      if (d && !d.error) {
        setMemberDefaults({ name: d.name || "", phone: d.phone || "", email: d.email || "" });
      }
    }).catch(() => {});
  }, []);

  // 報名視窗帶來的聯絡資訊 → 同步到本頁 state
  useEffect(() => {
    const c = items.find((i) => i.contact)?.contact;
    if (c) {
      if (c.name) setContactName(c.name);
      if (c.phone) setContactPhone(c.phone);
    }
    // Email 用 DOM 直接填（維持原本 uncontrolled 結構）
    const c2 = items.find((i) => i.contact)?.contact;
    if (c2?.email) {
      setTimeout(() => {
        const el = document.querySelector('input[name="email"]') as HTMLInputElement | null;
        if (el && !el.value) el.value = c2.email;
      }, 0);
    }
  }, [items.length]);


  // 是否含票券（需審核）
  const hasTickets = items.some((i) => ["走讀", "講座", "市集", "空間", "諮詢"].includes(i.type));
  // 是否含實體商品（需寄送選項）
  const hasProducts = items.some((i) => i.type === "商品" || i.type === "預購");
  // 收集所有票券的報名資訊（優先用 registrations 陣列，fallback 到 registration 單筆）
  // 加購品（subtitle 含「加購」）不顯示報名者卡片
  const isAddonLike = (s?: string) => !!s && /加購/.test(s);
  const ticketRegistrations = items.filter((i) =>
    !isAddonLike(i.subtitle) && !isAddonLike(i.name) && (
      (i.registrations && i.registrations.length > 0) ||
      (i.registration && Object.keys(i.registration).length > 0)
    )
  );
  // 從報名視窗帶過來的聯絡資訊（任一 item.contact 即可；用第一筆）
  const incomingContact = items.find((i) => i.contact)?.contact;

  const handleSubmit = async () => {
    setSubmitting(true);
    // GA4 begin_checkout event
    sendGAEvent("begin_checkout", {
      currency: "TWD",
      value: totalPrice,
      items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty })),
    });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id, name: i.name, subtitle: i.subtitle, type: i.type,
            price: i.price, qty: i.qty, eventId: i.eventId, productId: i.productId,
            meta: i.meta, registration: i.registration, registrations: i.registrations,
          })),
          contact: {
            name: contactName || (document.querySelector('[name="contact_name"]') as HTMLInputElement)?.value || "",
            phone: contactPhone || (document.querySelector('[name="phone"]') as HTMLInputElement)?.value || "",
            email: (document.querySelector('[name="email"]') as HTMLInputElement)?.value || "",
          },
          delivery,
          note,
          source: typeof window !== "undefined" && new URLSearchParams(window.location.search).get("liff_mode") === "true" ? "liff" : "web",
          refundInfo: hasTickets ? {
            method: refundMethod,
            ...(refundMethod === "custom" ? {
              bank_name: refundBankName,
              account_number: refundAccountNumber,
              account_holder: refundAccountHolder,
            } : {}),
          } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "結帳失敗");
      // GA4 purchase event
      sendGAEvent("purchase", {
        transaction_id: data.orderId,
        currency: "TWD",
        value: totalPrice,
      });
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

            {/* ── 2. 報名資訊（唯讀確認，來自報名視窗）── */}
            {ticketRegistrations.length > 0 && (
              <Section title="報名資訊確認">
                <div className="space-y-3">
                  {ticketRegistrations.map((item) => {
                    const regs: Record<string, string>[] = (item.registrations && item.registrations.length > 0)
                      ? item.registrations
                      : (item.registration ? [item.registration] : []);
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl p-4"
                        style={{ background: "rgba(78,205,196,0.04)", border: "1.5px solid rgba(78,205,196,0.3)" }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: "var(--color-teal)" }}>{item.type}</span>
                          <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                            {item.name}{item.subtitle ? ` · ${item.subtitle}` : ""} × {item.qty}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {regs.map((r, rIdx) => (
                            <div key={rIdx} className="rounded-lg p-3" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
                              <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-bark)" }}>
                                報名者 {rIdx + 1}
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                {Object.entries(r)
                                  .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
                                  .map(([key, val]) => (
                                    <div key={key}>
                                      <label className="text-[0.6em] block" style={{ color: "var(--color-mist)" }}>{FIELD_LABELS[key] || key}</label>
                                      <p className="text-xs" style={{ color: "var(--color-ink)" }}>{String(val)}</p>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[0.65em]" style={{ color: "var(--color-mist)" }}>
                    如需修改，請回活動頁重新填寫報名視窗。
                  </p>
                </div>
              </Section>
            )}

            {/* ── 3. 聯絡資訊 ── */}
            <Section title="聯絡資訊">
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="姓名" required name="contact_name" placeholder={memberDefaults?.name || "王大明"} defaultValue={memberDefaults?.name || ""} onChange={(v) => setContactName(v)} />
                  <InputField label="電話" required name="phone" type="tel" placeholder={memberDefaults?.phone || "0912-345-678"} defaultValue={memberDefaults?.phone || ""} onChange={(v) => setContactPhone(v)} />
                </div>
                <InputField label="Email" required name="email" type="email" placeholder={memberDefaults?.email || "you@email.com"} defaultValue={memberDefaults?.email || ""} />
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

            {/* ── 4.5 退款資訊（活動報名必填，未錄取時用）── */}
            {hasTickets && (
              <Section title="退款資訊">
                <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
                  <p className="text-[0.7em] leading-relaxed" style={{ color: "var(--color-mist)" }}>
                    若未錄取，我們會依您指定方式退款。目前仍為現場付現，正式上線後此資訊即生效。
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setRefundMethod("original")}
                      className="rounded-lg py-3 text-sm font-medium transition-all text-center"
                      style={{
                        border: refundMethod === "original" ? "1.5px solid #4ECDC4" : "1px solid var(--color-dust)",
                        background: refundMethod === "original" ? "rgba(78,205,196,0.06)" : "#fff",
                        color: refundMethod === "original" ? "var(--color-teal)" : "var(--color-mist)",
                      }}
                    >
                      退回原付款帳戶
                    </button>
                    <button
                      onClick={() => setRefundMethod("custom")}
                      className="rounded-lg py-3 text-sm font-medium transition-all text-center"
                      style={{
                        border: refundMethod === "custom" ? "1.5px solid #4ECDC4" : "1px solid var(--color-dust)",
                        background: refundMethod === "custom" ? "rgba(78,205,196,0.06)" : "#fff",
                        color: refundMethod === "custom" ? "var(--color-teal)" : "var(--color-mist)",
                      }}
                    >
                      指定退款帳戶
                    </button>
                  </div>
                  {refundMethod === "custom" && (
                    <div className="space-y-3 pt-3" style={{ borderTop: "1px solid var(--color-dust)" }}>
                      <InputField label="銀行名稱" required name="refund_bank_name" placeholder="例：國泰世華銀行" defaultValue={refundBankName} onChange={setRefundBankName} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InputField label="帳號" required name="refund_account_number" placeholder="純數字" defaultValue={refundAccountNumber} onChange={setRefundAccountNumber} />
                        <InputField label="戶名" required name="refund_account_holder" placeholder="王大明" defaultValue={refundAccountHolder} onChange={setRefundAccountHolder} />
                      </div>
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

function InputField({ label, required, name, type = "text", placeholder, defaultValue, onChange }: {
  label: string; required?: boolean; name: string; type?: string; placeholder?: string; defaultValue?: string; onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <input
        type={type} name={name} required={required} placeholder={placeholder} defaultValue={defaultValue}
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
