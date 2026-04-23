"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";

type FormType = "走讀" | "講座" | "市集" | "空間" | "諮詢" | "預購";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: FormType;
  eventTitle: string;
  eventDate?: string;
  ticketSummary: string;
  /** 票券總張數（= 報名者人數）。走讀/講座會依此渲染 N 份報名者表單 */
  attendeeCount?: number;
  /** 市集專用：關聯活動的 Notion ID（DB04） */
  eventNotionId?: string;
  /** 送出時回呼：把 contact 與 N 位報名者資料回傳，父層負責寫進購物車與導向結帳頁 */
  onSubmit?: (data: {
    contact: { name: string; phone: string; email: string };
    attendees: Attendee[];
  }) => void | Promise<void>;
}

interface Attendee {
  name: string;
  phone: string;
  email: string;
  id_number: string;
  birth_date: string;
  [k: string]: string;
}

const EMPTY_ATTENDEE: Attendee = { name: "", phone: "", email: "", id_number: "", birth_date: "" };

export default function RegistrationModal({
  isOpen,
  onClose,
  formType,
  eventTitle,
  eventDate,
  ticketSummary,
  attendeeCount = 1,
  eventNotionId,
  onSubmit,
}: RegistrationModalProps) {
  const [step, setStep] = useState<"form" | "done">("form");
  const [submitting, setSubmitting] = useState(false);

  // 聯絡資訊（頂部共用）
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });

  // 第一位報名者是否同聯絡資訊
  const [syncFirst, setSyncFirst] = useState(false);

  // 走讀/講座：每人一份；其他類型：單份
  const multiPerson = formType === "走讀" || formType === "講座";
  const N = multiPerson ? Math.max(1, attendeeCount) : 1;

  const [attendees, setAttendees] = useState<Attendee[]>(
    () => Array.from({ length: N }, () => ({ ...EMPTY_ATTENDEE }))
  );

  // 載入上次報名資料（defaultValue 帶入）
  // 上次市集報名的品牌資料（僅市集需要，由 Modal fetch 後傳給 MarketFields）
  const [brandDefaults, setBrandDefaults] = useState<any | null | undefined>(undefined);
  // 統一的「載入上次資料」進度（0 → 正在載入，結束後歸 0）
  const [prefillCount, setPrefillCount] = useState(0);
  const prefilling = prefillCount > 0;

  useEffect(() => {
    if (!isOpen) return;

    const fetches: Promise<any>[] = [];

    // 1. 會員 profile → 聯絡資訊 baseline
    fetches.push(
      fetch("/api/user/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => {
          if (!p || p.error) return;
          setContact((prev) => ({
            name: prev.name || p.name || "",
            phone: prev.phone || p.phone || "",
            email: prev.email || p.email || "",
          }));
        })
        .catch(() => {})
    );

    // 1b. 市集：品牌上次資料
    if (formType === "市集") {
      fetches.push(
        fetch("/api/user/vendor-profile")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => setBrandDefaults(d?.profile || null))
          .catch(() => setBrandDefaults(null))
      );
    }

    // 2. 上次同類型報名 → attendees
    const qs = new URLSearchParams({ formType }).toString();
    fetches.push(
      fetch(`/api/user/last-registration?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.contact) {
          setContact((prev) => ({
            name: prev.name || d.contact.name || "",
            phone: prev.phone || d.contact.phone || "",
            email: prev.email || d.contact.email || "",
          }));
        }
        if (Array.isArray(d.attendees) && d.attendees.length > 0) {
          setAttendees((prev) =>
            prev.map((att, i) => {
              const prior = d.attendees[i];
              if (!prior) return att;
              return {
                ...att,
                name: att.name || prior.name || "",
                phone: att.phone || prior.phone || "",
                email: att.email || prior.email || "",
                id_number: att.id_number || prior.id_number || "",
                birth_date: att.birth_date || prior.birth_date || "",
              };
            })
          );
        }
      })
      .catch(() => {})
    );

    // 追蹤整體 loading
    setPrefillCount(fetches.length);
    Promise.allSettled(fetches).finally(() => setPrefillCount(0));
  }, [isOpen, formType]);

  // N 改變時，attendees 陣列同步伸縮
  useEffect(() => {
    setAttendees((prev) => {
      if (prev.length === N) return prev;
      if (prev.length > N) return prev.slice(0, N);
      return [...prev, ...Array.from({ length: N - prev.length }, () => ({ ...EMPTY_ATTENDEE }))];
    });
  }, [N]);

  // 勾選「同聯絡資訊」時，把 contact 同步複製到 attendee[0]（取消時清空）
  useEffect(() => {
    setAttendees((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      if (syncFirst) {
        next[0] = {
          ...next[0],
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
        };
      }
      return next;
    });
  }, [syncFirst, contact.name, contact.phone, contact.email]);

  // 市集專用：MarketFields 暴露 getData() 給 handleSubmit
  // 注意：所有 hook 都要放在 early return 之前，避免 Rules of Hooks 違規
  const marketRef = useRef<{ getData: () => Promise<any> } | null>(null);

  if (!isOpen) return null;

  const updateAttendee = (idx: number, patch: Partial<Attendee>) => {
    // 若是 attendee[0] 而且正處於同步狀態，手動改內容就解除同步（避免 UX 衝突）
    if (idx === 0 && syncFirst) setSyncFirst(false);
    setAttendees((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (formType === "市集") {
        const data = await (marketRef.current?.getData?.() || Promise.resolve(null));
        if (!data) throw new Error("表單資料讀取失敗");
        const res = await fetch("/api/booking/market", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventNotionId,
            eventTitle,
            eventDate,
            ticketSummary,
            contact,
            brand: data.brand,
            products: data.products,
            experiences: data.experiences,
            schedules: data.schedules,
            equipment: data.equipment,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "送出失敗");
      } else if (onSubmit) {
        await onSubmit({ contact, attendees });
      }
      setStep("done");
    } catch (err: any) {
      alert(err?.message || "送出失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: 1000, maxHeight: "92vh", background: "#fff" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid var(--color-dust)" }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--color-ink)" }}>報名資料填寫</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-mist)" }}>{eventTitle} · {ticketSummary}</p>
          </div>
          <button onClick={onClose} className="text-2xl px-3 py-1" style={{ color: "var(--color-mist)" }}>✕</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-8 py-6" style={{ maxHeight: "calc(92vh - 160px)" }}>
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-7">
              {prefilling && (
                <div className="sticky top-0 z-10 rounded-lg px-4 py-2.5 flex items-center gap-2"
                  style={{ background: "rgba(78,205,196,0.08)", border: "1px solid rgba(78,205,196,0.3)", color: "var(--color-teal)" }}>
                  <span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: "var(--color-teal)" }} />
                  <span className="text-sm">正在載入您上次填寫的資料…</span>
                </div>
              )}

              {/* ── 聯絡資訊（共用）── */}
              <fieldset>
                <Legend>聯絡資訊</Legend>
                <div className="grid grid-cols-2 gap-4">
                  <CField label="姓名" required placeholder="真實姓名"
                    value={contact.name} onChange={(v) => setContact({ ...contact, name: v })} />
                  <CField label="聯絡電話" required type="tel" placeholder="0912-345-678"
                    value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <CField label="Email" required type="email" placeholder="you@email.com"
                    value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} />
                  {formType === "市集" && <LineBindButton />}
                </div>
              </fieldset>

              {/* ── 報名者資訊 ── */}
              {multiPerson ? (
                attendees.map((att, idx) => (
                  <fieldset key={idx} className="rounded-xl p-5"
                    style={{ border: "1px solid var(--color-dust)", background: idx === 0 ? "var(--color-warm-white)" : "#fff" }}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2"
                      style={{ borderBottom: "1px solid var(--color-dust)" }}>
                      <div className="text-base font-semibold" style={{ color: "var(--color-bark)" }}>
                        報名者 {idx + 1}{idx === 0 ? "（主要報名人）" : ""}
                      </div>
                      {idx === 0 && (
                        <label className="inline-flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-bark)" }}>
                          <input
                            type="checkbox"
                            checked={syncFirst}
                            onChange={(e) => setSyncFirst(e.target.checked)}
                            className="rounded"
                          />
                          報名資訊等同聯絡資訊
                        </label>
                      )}
                    </div>

                    {/* 主要報名人必填姓名/電話/Email；其他報名人全選填 */}
                    <div className="grid grid-cols-2 gap-4">
                      <CField label="姓名" required={idx === 0} placeholder={idx === 0 ? "真實姓名" : "選填"}
                        value={att.name} onChange={(v) => updateAttendee(idx, { name: v })} />
                      <CField label="聯絡電話" required={idx === 0} type="tel" placeholder={idx === 0 ? "0912-345-678" : "選填"}
                        value={att.phone} onChange={(v) => updateAttendee(idx, { phone: v })} />
                    </div>
                    <div className="mt-4">
                      <CField label="Email" required={idx === 0} type="email" placeholder={idx === 0 ? "you@email.com" : "選填"}
                        value={att.email} onChange={(v) => updateAttendee(idx, { email: v })} />
                    </div>

                    {/* 類型專屬欄位 */}
                    {formType === "走讀" && (
                      <TourAttendeeFields idx={idx} data={att} update={(p) => updateAttendee(idx, p)} />
                    )}
                    {formType === "講座" && (
                      <LectureAttendeeFields idx={idx} data={att} update={(p) => updateAttendee(idx, p)} />
                    )}
                  </fieldset>
                ))
              ) : (
                <>
                  {formType === "市集" && <MarketFields ref={marketRef} brandDefaults={brandDefaults} />}
                  {formType === "空間" && <SpaceFields />}
                  {formType === "諮詢" && (
                    <fieldset>
                      <Legend>預約諮詢資訊</Legend>
                      <SelectField label="諮詢主題" required name="consult_topic"
                        options={["請選擇", "活動規劃合作", "品牌合作", "空間使用", "其他"]} />
                      <div className="mt-4"><Field label="偏好聯絡時段" name="preferred_time" placeholder="平日下午、週末上午" /></div>
                      <div className="mt-4"><TextArea label="需求說明" required name="motivation" placeholder="請簡述您的需求" /></div>
                    </fieldset>
                  )}
                  {formType === "預購" && (
                    <fieldset>
                      <Legend>預購/取貨資訊</Legend>
                      <SelectField label="取貨方式" required name="delivery" options={["請選擇", "自取（旅人書店）", "郵寄/宅配"]} />
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <Field label="收件人姓名（若不同）" name="recipient_name" />
                        <Field label="收件人電話（若不同）" name="recipient_phone" type="tel" />
                      </div>
                    </fieldset>
                  )}
                </>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 rounded-lg text-base font-medium text-white transition-colors"
                style={{ background: submitting ? "var(--color-mist)" : "var(--color-moss)" }}
              >
                {submitting ? "處理中..." : "確認送出"}
              </button>
            </form>
          ) : (
            <div className="text-center py-10">
              <p className="text-5xl mb-4">✅</p>
              <h3 className="text-2xl font-semibold mb-3" style={{ color: "var(--color-ink)" }}>
                {formType === "市集" ? "報名已送出，審核中" : "報名資料已送出"}
              </h3>
              <p className="text-base mb-8" style={{ color: "var(--color-mist)" }}>
                {formType === "市集"
                  ? "我們將以您提供的聯繫資訊通知審核結果。"
                  : ticketSummary}
              </p>
              <div className="flex gap-4 justify-center">
                {formType === "市集" ? (
                  <button onClick={onClose} className="px-8 py-3 rounded-lg text-base font-medium text-white"
                    style={{ background: "var(--color-moss)" }}>
                    關閉
                  </button>
                ) : (
                  <>
                    <a href="/checkout" className="px-8 py-3 rounded-lg text-base font-medium text-white"
                      style={{ background: "var(--color-moss)" }}>
                      前往結帳
                    </a>
                    <button onClick={onClose} className="px-8 py-3 rounded-lg text-base font-medium"
                      style={{ border: "1px solid var(--color-dust)", color: "var(--color-bark)" }}>
                      稍候結帳
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   走讀 — 每人保險欄位 + 首位填主要資料
   ═══════════════════════════════════════════════════════ */
function TourAttendeeFields({ idx, data, update }: { idx: number; data: Attendee; update: (p: Partial<Attendee>) => void }) {
  return (
    <div className="mt-5">
      <div className="p-3 rounded-lg text-sm" style={{ background: "#FFF8E7", borderLeft: "4px solid #F5A623", color: "#6B4E00" }}>
        <strong>保險資訊</strong>：走讀活動含公共意外責任險，請提供身份證字號與出生年月日以利投保。
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <CField label="身份證字號" required={idx === 0} placeholder={idx === 0 ? "A123456789" : "選填"}
          value={data.id_number} onChange={(v) => update({ id_number: v })} />
        <CField label="出生年月日" required={idx === 0} type="date" placeholder="1990-01-01"
          value={data.birth_date} onChange={(v) => update({ birth_date: v })} />
      </div>

      {/* 主要報名人（第 1 位）填問卷；其他人省略避免冗長 */}
      {idx === 0 && (
        <>
          <div className="mt-4">
            <SelectField
              label="居住地"
              name="residence"
              options={["請選擇", "宜蘭縣", "台北市", "新北市", "桃園市", "基隆市", "新竹市", "新竹縣", "苗栗縣",
                "台中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "台南市", "高雄市", "屏東縣",
                "花蓮縣", "台東縣", "澎湖縣", "金門縣", "連江縣", "其他"]}
            />
          </div>
          <div className="mt-4">
            <CheckboxGroup
              label="從哪裡得知活動？（可複選）"
              name="referral_sources"
              options={["官方網站", "Facebook 粉專", "Instagram", "LINE 官方帳號", "親友介紹", "社群分享", "其他"]}
            />
          </div>
          <div className="mt-4">
            <CheckboxGroup
              label="報名原因（可複選）"
              name="registration_reasons"
              options={["對主題/路線感興趣", "認同帶路人的風格", "文化愛好者", "教育學習", "想認識新朋友", "其他"]}
            />
          </div>
          <div className="mt-4">
            <TextArea label="關於此次走讀，有什麼想多了解的？" name="want_to_know" placeholder="選填" />
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   講座 — 每人基本資料；主要報名人填課程與親子欄位
   ═══════════════════════════════════════════════════════ */
function LectureAttendeeFields({ idx, data, update }: { idx: number; data: Attendee; update: (p: Partial<Attendee>) => void }) {
  const [isParentChild, setIsParentChild] = useState<string>("請選擇");
  const [agreedTerms, setAgreedTerms] = useState(false);

  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="參與者年齡" name={`participant_age_${idx}`} type="number" placeholder="歲" />
      </div>

      {idx === 0 && (
        <>
          <label className="flex items-start gap-2 text-sm cursor-pointer mt-4 p-3 rounded-lg"
            style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)", color: "var(--color-ink)" }}>
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="rounded mt-0.5"
              required
            />
            <span className="text-sm leading-relaxed">
              我已閱讀並同意活動注意事項（含報到時間、退費規則、拍攝肖像權同意等）
            </span>
          </label>

          <div className="mt-4">
            <SelectField
              label="是否親子報名？"
              name="is_parent_child"
              options={["請選擇", "否，單人報名", "是，親子一同報名"]}
              onChange={setIsParentChild}
            />
          </div>

          {isParentChild === "是，親子一同報名" && (
            <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
              <p className="text-sm mb-3 font-medium" style={{ color: "var(--color-bark)" }}>親子報名資訊</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="家長姓名" required name="parent_name" placeholder="家長姓名" />
                <Field label="家長年齡" name="parent_age" type="number" placeholder="歲" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field label="小朋友姓名" required name="child_name" placeholder="小朋友姓名" />
                <Field label="小朋友年齡" required name="child_age" type="number" placeholder="歲" />
              </div>
            </div>
          )}

          <div className="mt-4">
            <CheckboxGroup label="從哪裡得知活動？（可複選）" name="referral_sources"
              options={["旅人書店官方臉書", "Instagram", "LINE 官方帳號", "親友介紹", "社群分享", "其他"]} />
          </div>
          <div className="mt-4">
            <CheckboxGroup label="報名原因（可複選）" name="registration_reasons"
              options={["對講者感興趣", "對主題感興趣", "想參與市集活動", "教育學習", "社交認識", "其他"]} />
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LINE 綁定按鈕（取代 LINE ID 文字欄位）
   ═══════════════════════════════════════════════════════ */
function LineBindButton() {
  const [status, setStatus] = useState<"loading" | "bound" | "unbound">("loading");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setStatus(p?.lineUid ? "bound" : "unbound"))
      .catch(() => setStatus("unbound"));
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>LINE 綁定</label>
      {status === "loading" ? (
        <div className="w-full h-11 px-3 rounded-lg text-sm flex items-center" style={{ border: "1px solid var(--color-dust)", color: "var(--color-mist)" }}>
          載入中…
        </div>
      ) : status === "bound" ? (
        <div className="w-full h-11 px-3 rounded-lg text-sm flex items-center gap-2"
          style={{ border: "1px solid #9AE6B4", background: "#F0FFF4", color: "#1A3A2E" }}>
          <span>✓</span><span>已綁定 LINE 帳號</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { window.location.href = "/api/user/link-line/start"; }}
          className="w-full h-11 px-3 rounded-lg text-sm font-medium transition-colors"
          style={{ border: "1.5px solid #06C755", background: "#06C755", color: "#fff" }}
        >
          綁定 LINE 以接收通知
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   市集招商
   ═══════════════════════════════════════════════════════ */
interface MarketProduct {
  name: string; price: string; intro: string; photo: File | null; preorder_limit: string;
  photoUrl?: string | null; // 上次上傳的 Cloudinary URL（沿用）
}
interface MarketExperience {
  name: string; price: string; desc: string; duration: string; capacity: string;
}
interface MarketSchedule {
  theme: string; attr: string; time_from: string; time_to: string; price: string;
}
const EMPTY_PRODUCT: MarketProduct = { name: "", price: "", intro: "", photo: null, preorder_limit: "" };
const EMPTY_EXPERIENCE: MarketExperience = { name: "", price: "", desc: "", duration: "", capacity: "" };
const EMPTY_SCHEDULE: MarketSchedule = { theme: "", attr: "", time_from: "", time_to: "", price: "" };

async function uploadOne(file: File, folder: string): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  try {
    const r = await fetch("/api/upload-image", { method: "POST", body: fd });
    if (!r.ok) return null;
    const j = await r.json();
    return j.url || null;
  } catch { return null; }
}

const MarketFields = forwardRef<{ getData: () => Promise<any> }, { brandDefaults: any | null | undefined }>(function MarketFields({ brandDefaults }, ref) {
  const [products, setProducts] = useState<MarketProduct[]>([{ ...EMPTY_PRODUCT }]);
  const [experiences, setExperiences] = useState<MarketExperience[]>([]);
  const [schedules, setSchedules] = useState<MarketSchedule[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const [chairCount, setChairCount] = useState(0);
  const [needsPower, setNeedsPower] = useState(false);

  // brandDefaults 載入後，把 products/experiences/schedules/equipment 一併帶回
  useEffect(() => {
    if (!brandDefaults) return;
    if (Array.isArray(brandDefaults.products) && brandDefaults.products.length > 0) {
      setProducts(brandDefaults.products.map((p: any) => ({
        name: p.name || "",
        price: p.price || "",
        intro: p.intro || "",
        preorder_limit: p.preorder_limit || "",
        photo: null,
        photoUrl: p.photoUrl || null,
      })));
    }
    if (Array.isArray(brandDefaults.experiences) && brandDefaults.experiences.length > 0) {
      setExperiences(brandDefaults.experiences.map((e: any) => ({
        name: e.name || "",
        price: e.price || "",
        desc: e.desc || "",
        duration: e.duration || "",
        capacity: e.capacity || "",
      })));
    }
    if (Array.isArray(brandDefaults.schedules) && brandDefaults.schedules.length > 0) {
      setSchedules(brandDefaults.schedules.map((s: any) => ({
        theme: s.theme || "",
        attr: s.attr || "",
        time_from: s.time_from || "",
        time_to: s.time_to || "",
        price: s.price || "",
      })));
    }
    if (brandDefaults.equipment) {
      setTableCount(Number(brandDefaults.equipment.tableCount) || 0);
      setChairCount(Number(brandDefaults.equipment.chairCount) || 0);
      setNeedsPower(!!brandDefaults.equipment.needsPower);
    }
  }, [brandDefaults]);

  // 把完整資料交給 parent（RegistrationModal）submit 用
  useImperativeHandle(ref, () => ({
    getData: async () => {
      const readText = (name: string) =>
        (document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value?.trim() || "";
      const readFile = (name: string) =>
        (document.querySelector(`input[name="${name}"]`) as HTMLInputElement | null)?.files?.[0] || null;

      // 品牌 Logo / 情境照：有新檔就上傳 Cloudinary，沒有則沿用上次儲存的 URL
      const logoFile = readFile("brand_logo");
      const imageFile = readFile("brand_image");
      const [newLogoUrl, newImageUrl] = await Promise.all([
        logoFile ? uploadOne(logoFile, "makesense/market-brand") : Promise.resolve(null),
        imageFile ? uploadOne(imageFile, "makesense/market-brand") : Promise.resolve(null),
      ]);
      const logoUrl = newLogoUrl || brandDefaults?.logoUrl || null;
      const imageUrl = newImageUrl || brandDefaults?.imageUrl || null;

      // 每個商品的照片：有新檔就上傳 Cloudinary，沒有就沿用上次的 photoUrl
      const productsWithUrl = await Promise.all(
        products
          .filter((p) => p.name?.trim())
          .map(async (p) => {
            const newPhotoUrl = p.photo ? await uploadOne(p.photo, "makesense/market-products") : null;
            return {
              name: p.name,
              price: p.price,
              intro: p.intro,
              preorder_limit: p.preorder_limit,
              photoUrl: newPhotoUrl || p.photoUrl || null,
            };
          })
      );

      return {
        brand: {
          type: readText("booth_type") === "請選擇" ? "" : readText("booth_type"),
          region: readText("brand_region") === "請選擇" ? "" : readText("brand_region"),
          name: readText("brand_name"),
          url: readText("brand_url"),
          keywords: readText("brand_keywords"),
          intro: readText("brand_intro"),
          motivation: readText("motivation"),
          logoUrl,
          imageUrl,
        },
        products: productsWithUrl,
        experiences: experiences.filter((e) => e.name?.trim()),
        schedules: schedules.filter((s) => s.theme?.trim()),
        equipment: {
          tableCount,
          chairCount,
          needsPower,
        },
      };
    },
  }), [products, experiences, schedules, tableCount, chairCount, needsPower, brandDefaults]);

  const updateProduct = (idx: number, patch: Partial<MarketProduct>) =>
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const addProduct = () => { if (products.length < 10) setProducts((prev) => [...prev, { ...EMPTY_PRODUCT }]); };
  const removeProduct = (idx: number) => setProducts((prev) => prev.filter((_, i) => i !== idx));

  const updateExperience = (idx: number, patch: Partial<MarketExperience>) =>
    setExperiences((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const addExperience = () => { if (experiences.length < 10) setExperiences((prev) => [...prev, { ...EMPTY_EXPERIENCE }]); };
  const removeExperience = (idx: number) => setExperiences((prev) => prev.filter((_, i) => i !== idx));

  const updateSchedule = (idx: number, patch: Partial<MarketSchedule>) =>
    setSchedules((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  const addSchedule = () => { if (schedules.length < 10) setSchedules((prev) => [...prev, { ...EMPTY_SCHEDULE }]); };
  const removeSchedule = (idx: number) => setSchedules((prev) => prev.filter((_, i) => i !== idx));

  return (
    <fieldset>
      <Legend>攤位與品牌資訊</Legend>
      {/* key 用來在 defaultValue 載入後強制 remount，讓 defaultValue 生效 */}
      <div key={brandDefaults === undefined ? "loading" : "loaded"}>
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="攤位類型" required name="booth_type"
            defaultValue={brandDefaults?.type || "請選擇"}
            options={["請選擇", "一般攤商", "友善農食", "林木創作", "地方文化", "工藝美術", "其他"]} />
          <SelectField label="品牌所在地區" required name="brand_region"
            defaultValue={brandDefaults?.region || "請選擇"}
            options={["請選擇", "宜蘭縣溪南", "宜蘭縣溪北", "台灣北部", "台灣中部", "台灣南部", "無實體空間", "其他"]} />
        </div>
        <div className="mt-4"><Field label="品牌名稱" required name="brand_name" placeholder="您的品牌名稱" defaultValue={brandDefaults?.name || ""} /></div>
        <div className="mt-4"><Field label="品牌粉專/IG/官網" required name="brand_url" placeholder="https://..." defaultValue={brandDefaults?.url || ""} /></div>
        <div className="mt-4"><Field label="品牌關鍵字" name="brand_keywords" placeholder="#手作 #療癒 #日常" defaultValue={brandDefaults?.keywords || ""} /></div>
        <div className="mt-4"><TextArea label="品牌簡介" required name="brand_intro" placeholder="介紹您的品牌故事，100字以內" defaultValue={brandDefaults?.intro || ""} /></div>

        <div className="text-sm font-semibold mt-6 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>品牌圖片</div>
        {brandDefaults?.logoUrl && (
          <p className="text-xs mb-2" style={{ color: "var(--color-mist)" }}>上次已上傳 Logo 與情境照，若不更換可留空直接沿用。</p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FileUpload label={brandDefaults?.logoUrl ? "品牌 Logo（已有，留空沿用）" : "品牌 Logo"} required={!brandDefaults?.logoUrl} name="brand_logo" accept="image/*" />
          <FileUpload label={brandDefaults?.imageUrl ? "品牌情境照（已有，留空沿用）" : "品牌情境照"} name="brand_image" accept="image/*" />
        </div>
      </div>

      {/* ── 商品條列（最多 10 筆）── */}
      <div className="flex items-center justify-between mt-6 mb-3 pb-1" style={{ borderBottom: "1px solid var(--color-dust)" }}>
        <div className="text-sm font-semibold" style={{ color: "var(--color-bark)" }}>販售商品（最多 10 筆）</div>
        <span className="text-xs" style={{ color: "var(--color-mist)" }}>{products.length}/10</span>
      </div>
      <div className="space-y-2">
        {products.map((p, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs w-6 text-center flex-shrink-0" style={{ color: "var(--color-mist)" }}>{idx + 1}</span>
            <RowInput placeholder="商品名稱*" className="flex-[2] min-w-0"
              value={p.name} onChange={(v) => updateProduct(idx, { name: v })} />
            <RowInput placeholder="價格*" type="number" className="w-16 flex-shrink-0"
              value={p.price} onChange={(v) => updateProduct(idx, { price: v })} />
            <RowInput placeholder="簡介" className="flex-1 min-w-0"
              value={p.intro} onChange={(v) => updateProduct(idx, { intro: v })} />
            <RowInput placeholder="上限" type="number" className="w-16 flex-shrink-0"
              value={p.preorder_limit} onChange={(v) => updateProduct(idx, { preorder_limit: v })} />
            <IconFile file={p.photo} savedUrl={p.photoUrl} onChange={(f) => updateProduct(idx, { photo: f })} />
            {products.length > 1 && (
              <button type="button" onClick={() => removeProduct(idx)}
                className="w-8 h-9 flex items-center justify-center rounded text-sm flex-shrink-0"
                style={{ color: "#c87060" }} title="移除">✕</button>
            )}
          </div>
        ))}
      </div>
      {products.length < 10 && (
        <button type="button" onClick={addProduct}
          className="w-full mt-3 h-10 rounded-lg text-sm font-medium transition-colors"
          style={{ border: "1px dashed var(--color-dust)", color: "var(--color-bark)", background: "#fff" }}>
          ＋ 新增商品
        </button>
      )}

      {/* ── 現場體驗條列（選填，最多 10 筆）── */}
      <div className="flex items-center justify-between mt-6 mb-3 pb-1" style={{ borderBottom: "1px solid var(--color-dust)" }}>
        <div className="text-sm font-semibold" style={{ color: "var(--color-bark)" }}>現場體驗（選填，最多 10 筆）</div>
        <span className="text-xs" style={{ color: "var(--color-mist)" }}>{experiences.length}/10</span>
      </div>
      <div className="space-y-2">
        {experiences.map((e, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs w-6 text-center flex-shrink-0" style={{ color: "var(--color-mist)" }}>{idx + 1}</span>
            <RowInput placeholder="體驗名稱*" className="flex-[2] min-w-0"
              value={e.name} onChange={(v) => updateExperience(idx, { name: v })} />
            <RowInput placeholder="價格*" type="number" className="w-16 flex-shrink-0"
              value={e.price} onChange={(v) => updateExperience(idx, { price: v })} />
            <RowInput placeholder="說明" className="flex-1 min-w-0"
              value={e.desc} onChange={(v) => updateExperience(idx, { desc: v })} />
            <RowInput placeholder="分鐘" type="number" className="w-14 flex-shrink-0"
              value={e.duration} onChange={(v) => updateExperience(idx, { duration: v })} />
            <RowInput placeholder="人數" type="number" className="w-14 flex-shrink-0"
              value={e.capacity} onChange={(v) => updateExperience(idx, { capacity: v })} />
            <button type="button" onClick={() => removeExperience(idx)}
              className="w-8 h-9 flex items-center justify-center rounded text-sm flex-shrink-0"
              style={{ color: "#c87060" }} title="移除">✕</button>
          </div>
        ))}
      </div>
      {experiences.length < 10 && (
        <button type="button" onClick={addExperience}
          className="w-full mt-3 h-10 rounded-lg text-sm font-medium transition-colors"
          style={{ border: "1px dashed var(--color-dust)", color: "var(--color-bark)", background: "#fff" }}>
          ＋ 新增體驗
        </button>
      )}

      {/* ── 活動時間（選填，最多 10 筆）── */}
      <div className="flex items-center justify-between mt-6 mb-3 pb-1" style={{ borderBottom: "1px solid var(--color-dust)" }}>
        <div className="text-sm font-semibold" style={{ color: "var(--color-bark)" }}>活動時間（選填，最多 10 筆）</div>
        <span className="text-xs" style={{ color: "var(--color-mist)" }}>{schedules.length}/10</span>
      </div>
      <div className="space-y-2">
        {schedules.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs w-6 text-center flex-shrink-0" style={{ color: "var(--color-mist)" }}>{idx + 1}</span>
            <RowInput placeholder="主題*" className="flex-[2] min-w-0"
              value={s.theme} onChange={(v) => updateSchedule(idx, { theme: v })} />
            <RowInput placeholder="屬性" className="flex-1 min-w-0"
              value={s.attr} onChange={(v) => updateSchedule(idx, { attr: v })} />
            <input type="time" value={s.time_from} onChange={(e) => updateSchedule(idx, { time_from: e.target.value })}
              className="h-9 px-1 rounded text-sm outline-none w-[88px] flex-shrink-0"
              style={{ border: "1px solid var(--color-dust)", background: "#fff" }} />
            <span className="text-xs flex-shrink-0" style={{ color: "var(--color-mist)" }}>→</span>
            <input type="time" value={s.time_to} onChange={(e) => updateSchedule(idx, { time_to: e.target.value })}
              className="h-9 px-1 rounded text-sm outline-none w-[88px] flex-shrink-0"
              style={{ border: "1px solid var(--color-dust)", background: "#fff" }} />
            <RowInput placeholder="費用" type="number" className="w-16 flex-shrink-0"
              value={s.price} onChange={(v) => updateSchedule(idx, { price: v })} />
            <button type="button" onClick={() => removeSchedule(idx)}
              className="w-8 h-9 flex items-center justify-center rounded text-sm flex-shrink-0"
              style={{ color: "#c87060" }} title="移除">✕</button>
          </div>
        ))}
      </div>
      {schedules.length < 10 && (
        <button type="button" onClick={addSchedule}
          className="w-full mt-3 h-10 rounded-lg text-sm font-medium transition-colors"
          style={{ border: "1px dashed var(--color-dust)", color: "var(--color-bark)", background: "#fff" }}>
          ＋ 新增活動時間
        </button>
      )}

      {/* ── 設備需求 ── */}
      <div className="text-sm font-semibold mt-6 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>設備需求</div>
      <div className="grid grid-cols-3 gap-4">
        <CounterField label="加租桌" value={tableCount} onChange={setTableCount} />
        <CounterField label="加租椅" value={chairCount} onChange={setChairCount} />
        <ToggleField label="是否需要電源？" value={needsPower} onChange={setNeedsPower} />
      </div>

      <div className="mt-4" key={`motivation-${brandDefaults === undefined ? "loading" : "loaded"}`}>
        <TextArea label="問題回饋（選填）" name="motivation" placeholder="想對我們說的話" defaultValue={brandDefaults?.motivation || ""} />
      </div>
    </fieldset>
  );
});

/* 單行用的精簡 input */
function RowInput({ placeholder, type = "text", value, onChange, className }: {
  placeholder: string; type?: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  // type="number" 會出現 spinner，改用 text + inputMode 拿數字鍵盤又不顯示 spinner
  const isNumeric = type === "number";
  return (
    <input
      type={isNumeric ? "text" : type}
      inputMode={isNumeric ? "numeric" : undefined}
      pattern={isNumeric ? "[0-9]*" : undefined}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(isNumeric ? e.target.value.replace(/[^0-9]/g, "") : e.target.value)}
      className={`h-9 px-2 rounded text-sm outline-none ${className || ""}`}
      style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
    />
  );
}

/* 單行用的圖示檔案上傳按鈕（受控）；有新檔或有舊 URL 都顯示 ✓ */
function IconFile({ file, savedUrl, onChange }: { file: File | null; savedUrl?: string | null; onChange: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAny = !!file || !!savedUrl;
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-9 h-9 flex items-center justify-center rounded text-sm flex-shrink-0"
        style={{
          border: `1px solid ${hasAny ? "var(--color-moss)" : "var(--color-dust)"}`,
          background: hasAny ? "rgba(78,205,196,0.05)" : "#fff",
          color: hasAny ? "var(--color-moss)" : "var(--color-mist)",
        }}
        title={file?.name || (savedUrl ? "已有照片，點擊更換" : "上傳照片")}
      >
        {hasAny ? "✓" : "📷"}
      </button>
    </>
  );
}

/* +/- 計數器 */
function CounterField({ label, value, onChange, min = 0, max = 20 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>{label}</label>
      <div className="flex items-center h-11 rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
          className="w-11 h-full flex items-center justify-center text-lg font-medium"
          style={{ color: "var(--color-bark)", borderRight: "1px solid var(--color-dust)" }}>−</button>
        <div className="flex-1 text-center text-base" style={{ color: "var(--color-ink)" }}>{value}</div>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
          className="w-11 h-full flex items-center justify-center text-lg font-medium"
          style={{ color: "var(--color-bark)", borderLeft: "1px solid var(--color-dust)" }}>＋</button>
      </div>
    </div>
  );
}

/* Yes/No 切換 */
function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>{label}</label>
      <div className="flex h-11 rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
        <button type="button" onClick={() => onChange(false)}
          className="flex-1 text-sm transition-colors"
          style={{
            background: !value ? "var(--color-teal)" : "#fff",
            color: !value ? "#fff" : "var(--color-mist)",
            borderRight: "1px solid var(--color-dust)",
          }}>不需要</button>
        <button type="button" onClick={() => onChange(true)}
          className="flex-1 text-sm transition-colors"
          style={{
            background: value ? "var(--color-teal)" : "#fff",
            color: value ? "#fff" : "var(--color-mist)",
          }}>需要</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   空間租借
   ═══════════════════════════════════════════════════════ */
function SpaceFields() {
  return (
    <fieldset>
      <Legend>空間租借資訊</Legend>
      <SelectField label="欲租借空間" required name="rental_space" options={[
        "請選擇", "宜蘭文學館室內空間", "成功國小校長宿舍室內空間", "羅東樟仔園文化園區",
        "旅人書店一樓", "旅人書店二樓", "整棟包場", "戶外空間", "其他"]} />
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Field label="使用日期" required name="rental_date" type="date" placeholder="2026-04-15" />
        <Field label="使用時間" required name="rental_time" placeholder="14:00-17:00" />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Field label="預計人數（含工作人員）" required name="attendee_count" type="number" placeholder="人" />
        <SelectField label="使用性質" required name="usage_type" options={[
          "請選擇", "讀書會/分享會", "工作坊/課程", "藝文展覽", "企業會議", "私人聚會", "拍攝/錄影", "其他"]} />
      </div>
      <div className="mt-4"><TextArea label="活動內容說明" required name="rental_purpose" placeholder="請簡述活動性質與流程" /></div>

      <div className="text-sm font-semibold mt-6 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>活動性質</div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="是否對外公開？" name="is_public" options={["請選擇", "否，內部活動", "是，對外公開"]} />
        <SelectField label="是否有向第三方收費？" name="is_commercial" options={["請選擇", "否", "是"]} />
      </div>
      <div className="mt-4">
        <SelectField label="是否有轉讓空間使用權？" name="has_transfer" options={["請選擇", "否", "是"]} />
      </div>
      <div className="mt-4"><Field label="加租設備" name="equipment" placeholder="桌×2、椅×10、投影機×1 或 無" /></div>

      <div className="text-sm font-semibold mt-6 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>責任確認</div>
      <div className="space-y-2">
        <CheckboxSingle name="agree_no_damage" required label="本人確認不會破壞租用空間之環境、設施與裝潢" />
        <CheckboxSingle name="agree_restore" required label="本人確認使用完畢後能恢復現場原狀" />
        <CheckboxSingle name="agree_safety" required label="本次場地使用不涉及危險物品、違法行為或公共安全疑慮" />
      </div>

      <div className="mt-4">
        <SelectField label="是否需要辦理對應保險？" name="needs_insurance"
          options={["請選擇", "不需要", "需要，我方自行辦理", "需要，請協助辦理"]} />
      </div>
      <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "#FFF8E7", borderLeft: "4px solid #F5A623", color: "#6B4E00" }}>
        <strong>保險提醒</strong>：若為對外公開活動，建議辦理公共意外責任保險。
      </div>

      <div className="text-sm font-semibold mt-6 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>聯絡人與單位</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="聯絡人/單位名稱" name="org_name" placeholder="單位名稱（若為組織）" />
        <SelectField label="是否需要開立收據？" name="needs_receipt" options={["請選擇", "不需要", "需要"]} />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <SelectField label="是否需要開立發票？" name="needs_invoice" options={["請選擇", "不需要", "需要（請提供統編）"]} />
        <Field label="統一編號" name="tax_id" placeholder="若需開發票" />
      </div>

      <div className="mt-4">
        <FileUpload label="相關資料附件（選填）" name="attachment" accept=".pdf,.doc,.docx,.jpg,.png" />
      </div>

      <div className="mt-4"><TextArea label="其他需求或備註" name="motivation" placeholder="選填" /></div>
    </fieldset>
  );
}

/* ═══════════════════════════════════════════════════════
   共用元件（字體已放大）
   ═══════════════════════════════════════════════════════ */

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend
      className="text-base font-semibold mb-4 pb-2"
      style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}
    >
      {children}
    </legend>
  );
}

/** 非受控 Field（沿用 name 讓未改造的類型可直接讀 DOM） */
function Field({ label, required, name, type = "text", placeholder, defaultValue }: {
  label: string; required?: boolean; name: string; type?: string; placeholder?: string; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <input
        type={type} name={name} required={required} placeholder={placeholder} defaultValue={defaultValue}
        className="w-full h-11 px-3 rounded-lg text-base outline-none transition-all"
        style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
      />
    </div>
  );
}

/** 受控 Field */
function CField({ label, required, type = "text", placeholder, value, onChange }: {
  label: string; required?: boolean; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <input
        type={type} required={required} placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 rounded-lg text-base outline-none transition-all"
        style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
      />
    </div>
  );
}

function SelectField({ label, required, name, options, onChange, defaultValue }: {
  label: string; required?: boolean; name: string; options: string[]; onChange?: (val: string) => void; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <select
        name={name} required={required} defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full h-11 px-3 rounded-lg text-base outline-none"
        style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextArea({ label, required, name, placeholder, defaultValue }: {
  label: string; required?: boolean; name: string; placeholder?: string; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <textarea
        name={name} required={required} placeholder={placeholder} defaultValue={defaultValue} rows={3}
        className="w-full px-3 py-2.5 rounded-lg text-base outline-none transition-all"
        style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
      />
    </div>
  );
}

function CheckboxGroup({ label, name, options }: {
  label: string; name: string; options: string[];
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2" style={{ color: "var(--color-ink)" }}>{label}</p>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-ink)" }}>
            <input type="checkbox" name={name} value={opt} className="rounded" />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckboxSingle({ name, label, required }: {
  name: string; label: string; required?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: "var(--color-ink)" }}>
      <input type="checkbox" name={name} required={required} className="rounded mt-0.5" />
      <span>{label} {required && <span style={{ color: "#c87060" }}>*</span>}</span>
    </label>
  );
}

function FileUpload({ label, required, name, accept }: {
  label: string; required?: boolean; name: string; accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={required}
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full h-24 rounded-lg text-sm flex flex-col items-center justify-center gap-1 transition-colors"
        style={{
          border: `2px dashed ${fileName ? "var(--color-moss)" : "var(--color-dust)"}`,
          background: fileName ? "rgba(78,205,196,0.05)" : "var(--color-warm-white)",
          color: fileName ? "var(--color-moss)" : "var(--color-mist)",
        }}
      >
        {fileName ? (
          <>
            <span>✓</span>
            <span className="truncate max-w-full px-2">{fileName}</span>
          </>
        ) : (
          <>
            <span className="text-base">+</span>
            <span>點擊上傳</span>
          </>
        )}
      </button>
    </div>
  );
}
