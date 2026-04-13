"use client";

import { useState, useRef } from "react";

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
              {formType === "走讀" && <TourFields />}

              {/* ── 講座專屬 ── */}
              {formType === "講座" && <LectureFields />}

              {/* ── 市集專屬 ── */}
              {formType === "市集" && <MarketFields />}

              {/* ── 空間專屬 ── */}
              {formType === "空間" && <SpaceFields />}

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

/* ═══════════════════════════════════════════════════════
   走讀活動 — 保險欄位 + 同行親友（第二人可選填聯絡方式）
   ═══════════════════════════════════════════════════════ */
function TourFields() {
  const [hasCompanion, setHasCompanion] = useState(false);

  return (
    <fieldset>
      <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>走讀導覽資訊</legend>

      {/* 保險必填欄位 */}
      <div className="mt-0 p-3 rounded-lg text-xs" style={{ background: "#FFF8E7", borderLeft: "4px solid #F5A623", color: "#6B4E00" }}>
        <strong>保險資訊</strong>：走讀活動含公共意外責任險，請提供身份證字號與出生年月日以利投保。
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="身份證字號" required name="id_number" placeholder="A123456789" />
        <Field label="出生年月日" required name="birth_date" type="date" placeholder="1990-01-01" />
      </div>

      <div className="mt-3">
        <SelectField label="居住地" name="residence" options={["請選擇","宜蘭縣","台北市","新北市","桃園市","基隆市","新竹市","新竹縣","苗栗縣","台中市","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","台南市","高雄市","屏東縣","花蓮縣","台東縣","澎湖縣","金門縣","連江縣","其他"]} />
      </div>

      {/* 得知管道（可複選） */}
      <div className="mt-3">
        <CheckboxGroup
          label="從哪裡得知活動？（可複選）"
          name="referral_sources"
          options={["官方網站","Facebook 粉專","Instagram","LINE 官方帳號","親友介紹","社群分享","其他"]}
        />
      </div>

      {/* 報名原因（可複選） */}
      <div className="mt-3">
        <CheckboxGroup
          label="報名原因（可複選）"
          name="registration_reasons"
          options={["對主題/路線感興趣","認同帶路人的風格","文化愛好者","教育學習","想認識新朋友","其他"]}
        />
      </div>

      <div className="mt-3">
        <TextArea label="關於此次走讀，有什麼想多了解的？" name="want_to_know" placeholder="選填" />
      </div>

      {/* 同行親友 */}
      <div className="text-xs font-semibold mt-5 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>同行親友</div>
      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-ink)" }}>
        <input
          type="checkbox"
          checked={hasCompanion}
          onChange={(e) => setHasCompanion(e.target.checked)}
          className="rounded"
        />
        有同行親友一起報名
      </label>

      {hasCompanion && (
        <div className="mt-3 p-4 rounded-lg" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
          <p className="text-xs mb-3" style={{ color: "var(--color-mist)" }}>同行親友的保險資料（必填）與聯絡方式（選填）</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="親友姓名" required name="companion_name" placeholder="真實姓名" />
            <Field label="身份證字號" required name="companion_id_number" placeholder="A123456789" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="出生年月日" required name="companion_birth_date" type="date" placeholder="1990-01-01" />
            <Field label="聯絡電話" name="companion_phone" type="tel" placeholder="選填" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Email" name="companion_email" type="email" placeholder="選填" />
            <Field label="LINE ID" name="companion_line_id" placeholder="選填" />
          </div>
        </div>
      )}
    </fieldset>
  );
}

/* ═══════════════════════════════════════════════════════
   講座課程 — 親子報名 + 第二人選填聯絡方式
   ═══════════════════════════════════════════════════════ */
function LectureFields() {
  const [isParentChild, setIsParentChild] = useState<string>("請選擇");
  const [agreedTerms, setAgreedTerms] = useState(false);

  return (
    <fieldset>
      <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>講座課程資訊</legend>

      {/* 注意事項確認 */}
      <label className="flex items-start gap-2 text-sm cursor-pointer mb-4 p-3 rounded-lg" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)", color: "var(--color-ink)" }}>
        <input
          type="checkbox"
          checked={agreedTerms}
          onChange={(e) => setAgreedTerms(e.target.checked)}
          className="rounded mt-0.5"
          required
        />
        <span className="text-xs leading-relaxed">
          我已閱讀並同意活動注意事項（含報到時間、退費規則、拍攝肖像權同意等）
        </span>
      </label>

      {/* 參與者年齡 */}
      <Field label="參與者年齡" name="participant_age" type="number" placeholder="歲" />

      {/* 是否親子報名 */}
      <div className="mt-3">
        <SelectField
          label="是否親子報名？"
          name="is_parent_child"
          options={["請選擇","否，單人報名","是，親子一同報名"]}
          onChange={setIsParentChild}
        />
      </div>

      {isParentChild === "是，親子一同報名" && (
        <div className="mt-3 p-4 rounded-lg" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
          <p className="text-xs mb-3 font-medium" style={{ color: "var(--color-bark)" }}>親子報名資訊</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="家長姓名" required name="parent_name" placeholder="家長姓名" />
            <Field label="家長年齡" name="parent_age" type="number" placeholder="歲" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="小朋友姓名" required name="child_name" placeholder="小朋友姓名" />
            <Field label="小朋友年齡" required name="child_age" type="number" placeholder="歲" />
          </div>
          <div className="text-xs mt-3 mb-2 font-medium" style={{ color: "var(--color-mist)" }}>第二位聯絡方式（選填）</div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="電話" name="second_phone" type="tel" placeholder="選填" />
            <Field label="Email" name="second_email" type="email" placeholder="選填" />
            <Field label="LINE ID" name="second_line_id" placeholder="選填" />
          </div>
        </div>
      )}

      {/* 得知管道 */}
      <div className="mt-3">
        <CheckboxGroup
          label="從哪裡得知活動？（可複選）"
          name="referral_sources"
          options={["旅人書店官方臉書","Instagram","LINE 官方帳號","親友介紹","社群分享","其他"]}
        />
      </div>

      {/* 報名原因 */}
      <div className="mt-3">
        <CheckboxGroup
          label="報名原因（可複選）"
          name="registration_reasons"
          options={["對講者感興趣","對主題感興趣","想參與市集活動","教育學習","社交認識","其他"]}
        />
      </div>
    </fieldset>
  );
}

/* ═══════════════════════════════════════════════════════
   市集招商 — Logo/情境照/商品照上傳 + 體驗活動 + 設備
   ═══════════════════════════════════════════════════════ */
function MarketFields() {
  const [hasExperience, setHasExperience] = useState<string>("請選擇");

  return (
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

      {/* 品牌圖片上傳 */}
      <div className="text-xs font-semibold mt-5 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>品牌圖片</div>
      <div className="grid grid-cols-3 gap-3">
        <FileUpload label="品牌 Logo" required name="brand_logo" accept="image/*" />
        <FileUpload label="品牌情境照" name="brand_image" accept="image/*" />
        <FileUpload label="商品照片" name="product_photo" accept="image/*" />
      </div>

      {/* 販售品項 */}
      <div className="mt-4"><TextArea label="預計販售品項與價格" required name="sell_goods" placeholder="手工餅乾 $80、擴香石 $350..." /></div>

      {/* 現場體驗 & 設備 */}
      <div className="text-xs font-semibold mt-5 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>現場體驗 & 設備</div>
      <SelectField
        label="是否辦現場收費體驗活動？"
        name="has_experience"
        options={["請選擇","否","是，有體驗活動"]}
        onChange={setHasExperience}
      />
      {hasExperience === "是，有體驗活動" && (
        <div className="mt-3">
          <TextArea label="體驗內容與價格" required name="experience_detail" placeholder="例：唱頌缽體驗 $350/人" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="加租桌椅" name="equipment" placeholder="桌×1、椅×2 或 無" />
        <SelectField label="是否需要電源？" name="needs_power" options={["請選擇","不需要","需要"]} />
      </div>
      <div className="mt-3"><TextArea label="問題回饋（選填）" name="motivation" placeholder="想對我們說的話" /></div>
    </fieldset>
  );
}

/* ═══════════════════════════════════════════════════════
   空間租借 — 完整欄位（商業性質、保險、收據發票、責任聲明）
   ═══════════════════════════════════════════════════════ */
function SpaceFields() {
  return (
    <fieldset>
      <legend className="text-xs font-semibold mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)", display: "block", width: "100%" }}>空間租借資訊</legend>

      <SelectField label="欲租借空間" required name="rental_space" options={[
        "請選擇",
        "宜蘭文學館室內空間",
        "成功國小校長宿舍室內空間",
        "羅東樟仔園文化園區",
        "旅人書店一樓",
        "旅人書店二樓",
        "整棟包場",
        "戶外空間",
        "其他"
      ]} />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="使用日期" required name="rental_date" type="date" placeholder="2026-04-15" />
        <Field label="使用時間" required name="rental_time" placeholder="14:00-17:00" />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="預計人數（含工作人員）" required name="attendee_count" type="number" placeholder="人" />
        <SelectField label="使用性質" required name="usage_type" options={[
          "請選擇","讀書會/分享會","工作坊/課程","藝文展覽","企業會議","私人聚會","拍攝/錄影","其他"
        ]} />
      </div>
      <div className="mt-3"><TextArea label="活動內容說明" required name="rental_purpose" placeholder="請簡述活動性質與流程" /></div>

      {/* 商業性質 & 公開性 */}
      <div className="text-xs font-semibold mt-5 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>活動性質</div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="是否對外公開？" name="is_public" options={["請選擇","否，內部活動","是，對外公開"]} />
        <SelectField label="是否有向第三方收費？" name="is_commercial" options={["請選擇","否","是"]} />
      </div>
      <div className="mt-3">
        <SelectField label="是否有轉讓空間使用權？" name="has_transfer" options={["請選擇","否","是"]} />
      </div>

      {/* 設備 */}
      <div className="mt-3"><Field label="加租設備" name="equipment" placeholder="桌×2、椅×10、投影機×1 或 無" /></div>

      {/* 責任確認 */}
      <div className="text-xs font-semibold mt-5 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>責任確認</div>
      <div className="space-y-2">
        <CheckboxSingle name="agree_no_damage" required label="本人確認不會破壞租用空間之環境、設施與裝潢" />
        <CheckboxSingle name="agree_restore" required label="本人確認使用完畢後能恢復現場原狀" />
        <CheckboxSingle name="agree_safety" required label="本次場地使用不涉及危險物品、違法行為或公共安全疑慮" />
      </div>

      {/* 保險 */}
      <div className="mt-3">
        <SelectField label="是否需要辦理對應保險？" name="needs_insurance" options={["請選擇","不需要","需要，我方自行辦理","需要，請協助辦理"]} />
      </div>
      <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: "#FFF8E7", borderLeft: "4px solid #F5A623", color: "#6B4E00" }}>
        <strong>保險提醒</strong>：若為對外公開活動，建議辦理公共意外責任保險。
      </div>

      {/* 聯絡人/單位 */}
      <div className="text-xs font-semibold mt-5 mb-3 pb-1" style={{ color: "var(--color-bark)", borderBottom: "1px solid var(--color-dust)" }}>聯絡人與單位</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="聯絡人/單位名稱" name="org_name" placeholder="單位名稱（若為組織）" />
        <SelectField label="是否需要開立收據？" name="needs_receipt" options={["請選擇","不需要","需要"]} />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <SelectField label="是否需要開立發票？" name="needs_invoice" options={["請選擇","不需要","需要（請提供統編）"]} />
        <Field label="統一編號" name="tax_id" placeholder="若需開發票" />
      </div>

      {/* 附件 */}
      <div className="mt-3">
        <FileUpload label="相關資料附件（選填）" name="attachment" accept=".pdf,.doc,.docx,.jpg,.png" />
      </div>

      <div className="mt-3"><TextArea label="其他需求或備註" name="motivation" placeholder="選填" /></div>
    </fieldset>
  );
}

/* ═══════════════════════════════════════════════════════
   共用欄位元件
   ═══════════════════════════════════════════════════════ */

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

function SelectField({ label, required, name, options, onChange }: {
  label: string; required?: boolean; name: string; options: string[]; onChange?: (val: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
        {label} {required && <span style={{ color: "#c87060" }}>*</span>}
      </label>
      <select
        name={name} required={required}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
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

function CheckboxGroup({ label, name, options }: {
  label: string; name: string; options: string[];
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: "var(--color-ink)" }}>{label}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--color-ink)" }}>
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
    <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: "var(--color-ink)" }}>
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
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>
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
        className="w-full h-20 rounded-lg text-xs flex flex-col items-center justify-center gap-1 transition-colors"
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
