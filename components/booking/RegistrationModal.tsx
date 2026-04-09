"use client";

import { useState } from "react";

type FormType = "走讀" | "講座" | "市集" | "空間" | "諮詢" | "預購";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: FormType;
  eventTitle: string;
  ticketSummary: string; // e.g. "成人票 ×1, 午餐便當 ×1"
}

export default function RegistrationModal({
  isOpen,
  onClose,
  formType,
  eventTitle,
  ticketSummary,
}: RegistrationModalProps) {
  const [step, setStep] = useState<"form" | "done">("form");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // TODO: 實際呼叫 /api/booking API
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setStep("done");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: 640, maxHeight: "90vh", background: "#fff" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--color-dust)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>報名資料填寫</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-mist)" }}>{eventTitle} · {ticketSummary}</p>
          </div>
          <button onClick={onClose} className="text-lg px-2" style={{ color: "var(--color-mist)" }}>✕</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(90vh - 130px)" }}>
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── 共用：聯絡資訊 ── */}
              <fieldset>
                <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>聯絡資訊</legend>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="姓名" required name="contact_name" placeholder="真實姓名" />
                  <Field label="聯絡電話" required name="phone" type="tel" placeholder="0912-345-678" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Email" required name="email" type="email" placeholder="you@email.com" />
                  {(formType === "市集") && <Field label="LINE ID" name="line_id" placeholder="選填" />}
                </div>
              </fieldset>

              {/* ── 走讀專屬 ── */}
              {formType === "走讀" && (
                <fieldset>
                  <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>走讀導覽資訊</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="身份證字號" required name="id_number" placeholder="A123456789" />
                    <Field label="出生年月日" required name="birth_date" placeholder="1990-01-01" />
                  </div>
                  <div className="mt-3">
                    <SelectField label="居住地" name="residence" options={["請選擇","宜蘭縣","台北市","新北市","桃園市","其他"]} />
                  </div>
                  <div className="mt-3">
                    <Field label="同行親友姓名" name="companion" placeholder="可填多位，以逗號分隔" />
                  </div>
                  <div className="mt-3">
                    <Field label="從哪裡得知這個活動？" name="referral" placeholder="Instagram、朋友介紹..." />
                  </div>
                  <div className="mt-3">
                    <TextArea label="參加動機（選填）" name="motivation" placeholder="請簡述" />
                  </div>
                </fieldset>
              )}

              {/* ── 講座專屬 ── */}
              {formType === "講座" && (
                <fieldset>
                  <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>講座課程資訊</legend>
                  <SelectField label="是否親子報名？" name="is_parent_child" options={["請選擇","否，單人報名","是，親子一同報名"]} />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="小孩姓名" name="child_name" placeholder="若親子報名，請填寫" />
                    <Field label="小孩年齡" name="child_age" type="number" placeholder="歲" />
                  </div>
                  <div className="mt-3">
                    <Field label="從哪裡得知？" name="referral" placeholder="Instagram、朋友介紹..." />
                  </div>
                  <div className="mt-3">
                    <TextArea label="參加動機（選填）" name="motivation" placeholder="請簡述" />
                  </div>
                </fieldset>
              )}

              {/* ── 市集專屬 ── */}
              {formType === "市集" && (
                <fieldset>
                  <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>攤位與品牌資訊</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="攤位類型" required name="booth_type" options={["請選擇","一般攤商","友善農食","林木創作","地方文化","工藝美術","其他"]} />
                    <SelectField label="品牌所在地區" required name="brand_region" options={["請選擇","宜蘭縣溪南","宜蘭縣溪北","台灣北部","台灣中部","台灣南部","無實體空間","其他"]} />
                  </div>
                  <div className="mt-3"><Field label="品牌名稱" required name="brand_name" placeholder="您的品牌名稱" /></div>
                  <div className="mt-3"><Field label="品牌粉專/IG/官網" required name="brand_url" placeholder="https://..." /></div>
                  <div className="mt-3"><Field label="品牌關鍵字" name="brand_keywords" placeholder="#手作 #療癒 #日常" /></div>
                  <div className="mt-3"><TextArea label="品牌簡介" required name="brand_intro" placeholder="介紹您的品牌故事，100字以內" /></div>
                  <div className="mt-3"><TextArea label="預計販售品項與價格" required name="sell_goods" placeholder="手工餅乾 $80、擴香石 $350..." /></div>

                  <div className="text-xs font-semibold mt-5 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>現場體驗 & 設備</div>
                  <SelectField label="是否辦現場體驗活動？" name="has_experience" options={["請選擇","否","是，有體驗活動"]} />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="電源需求（瓦數）" name="power_watts" placeholder="500W 或 無" />
                    <Field label="加租設備" name="equipment" placeholder="桌×1、椅×2 或 無" />
                  </div>
                  <div className="mt-3"><TextArea label="申請動機（選填）" name="motivation" placeholder="想對我們說的話" /></div>
                </fieldset>
              )}

              {/* ── 空間專屬 ── */}
              {formType === "空間" && (
                <fieldset>
                  <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>空間租借資訊</legend>
                  <SelectField label="欲租借空間" required name="rental_space" options={["請選擇","旅人書店一樓","旅人書店二樓","整棟包場","戶外空間","其他"]} />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="使用日期" required name="rental_date" placeholder="2026-04-15" />
                    <Field label="使用時間" required name="rental_time" placeholder="14:00-17:00" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="預計人數" required name="attendee_count" type="number" placeholder="人" />
                    <SelectField label="使用性質" required name="usage_type" options={["請選擇","讀書會/分享會","工作坊/課程","藝文展覽","企業會議","私人聚會","拍攝/錄影","其他"]} />
                  </div>
                  <div className="mt-3"><TextArea label="活動內容說明" required name="rental_purpose" placeholder="請簡述活動性質與流程" /></div>
                  <div className="mt-3"><SelectField label="是否對外公開？" name="is_public" options={["請選擇","否，內部活動","是，對外公開"]} /></div>
                  <div className="mt-3"><Field label="加租設備" name="equipment" placeholder="桌×2、椅×10、投影機×1 或 無" /></div>
                  <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: "#FFF8E7", borderLeft: "4px solid #F5A623", color: "#6B4E00" }}>
                    ⚠️ <strong>保險提醒</strong>：若為對外公開活動，請自行辦理公共意外責任保險。
                  </div>
                  <div className="mt-3"><TextArea label="其他需求或備註" name="motivation" placeholder="選填" /></div>
                </fieldset>
              )}

              {/* ── 諮詢專屬 ── */}
              {formType === "諮詢" && (
                <fieldset>
                  <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>預約諮詢資訊</legend>
                  <SelectField label="諮詢主題" required name="consult_topic" options={["請選擇","活動規劃合作","品牌合作","空間使用","其他"]} />
                  <div className="mt-3"><Field label="偏好聯絡時段" name="preferred_time" placeholder="平日下午、週末上午" /></div>
                  <div className="mt-3"><TextArea label="需求說明" required name="motivation" placeholder="請簡述您的需求" /></div>
                </fieldset>
              )}

              {/* ── 預購專屬 ── */}
              {formType === "預購" && (
                <fieldset>
                  <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>預購/取貨資訊</legend>
                  <SelectField label="取貨方式" required name="delivery" options={["請選擇","自取（旅人書店）","郵寄/宅配"]} />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="收件人姓名（若不同）" name="recipient_name" />
                    <Field label="收件人電話（若不同）" name="recipient_phone" type="tel" />
                  </div>
                </fieldset>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-lg text-sm font-medium text-white transition-colors mt-4"
                style={{ background: submitting ? "var(--color-mist)" : "var(--color-moss)" }}
              >
                {submitting ? "處理中..." : "確認送出"}
              </button>
            </form>
          ) : (
            /* ── 送出成功 ── */
            <div className="text-center py-8">
              <p className="text-4xl mb-4">✅</p>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-ink)" }}>報名資料已送出</h3>
              <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
                {ticketSummary}
              </p>
              <div className="flex gap-3 justify-center">
                <a
                  href="/checkout"
                  className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: "var(--color-moss)" }}
                >
                  前往結帳
                </a>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium"
                  style={{ border: "1px solid var(--color-dust)", color: "var(--color-bark)" }}
                >
                  稍候結帳
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 共用欄位元件 ── */

function Field({ label, required, name, type = "text", placeholder }: {
  label: string; required?: boolean; name: string; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <input
        type={type} name={name} required={required} placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg text-sm outline-none transition-all"
        style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
      />
    </div>
  );
}

function SelectField({ label, required, name, options }: {
  label: string; required?: boolean; name: string; options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <select
        name={name} required={required}
        className="w-full h-9 px-3 rounded-lg text-sm outline-none"
        style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextArea({ label, required, name, placeholder }: {
  label: string; required?: boolean; name: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <textarea
        name={name} required={required} placeholder={placeholder} rows={2}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
        style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
      />
    </div>
  );
}
