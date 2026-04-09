"use client";

import { useState } from "react";
import { AlsoWantToKnow, MightAlsoLike } from "@/components/ui/RecommendSections";

// 模擬購物車中的表單類型（之後由購物車狀態決定）
type FormType = "走讀" | "講座" | "市集" | "空間" | "諮詢" | "預購" | "general";

export default function CheckoutPage() {
  const [formType, setFormType] = useState<FormType>("走讀");
  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [invoiceType, setInvoiceType] = useState("");

  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
      <h1 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
        購物車與結帳
      </h1>

      {/* 開發用：表單類型切換器 */}
      <div className="flex gap-1 p-1 rounded-lg mb-8" style={{ background: "var(--color-parchment)", width: "fit-content" }}>
        {(["走讀", "講座", "市集", "空間", "諮詢", "預購", "general"] as FormType[]).map((t) => (
          <button key={t} onClick={() => setFormType(t)}
            className="px-3 py-1 rounded-md text-xs font-medium transition-all"
            style={{ background: formType === t ? "var(--color-teal)" : "transparent", color: formType === t ? "#fff" : "var(--color-mist)" }}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Left: 購物車 + 報名資訊 + 結帳表單 */}
        <div>
          {/* 購物車內容 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-bark)" }}>購物車內容</h2>
            <div className="rounded-lg p-4" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>走讀行旅：頭城老街人文散步</p>
                  <p className="text-xs" style={{ color: "var(--color-mist)" }}>成人票 ×1</p>
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--color-rust)" }}>NT$ 500</p>
              </div>
            </div>
          </section>

          {/* 基本聯絡資訊 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-bark)" }}>聯絡資訊</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>姓名 *</label>
                <input type="text" className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid var(--color-dust)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>電話 *</label>
                <input type="tel" className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid var(--color-dust)" }} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>Email *</label>
                <input type="email" className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid var(--color-dust)" }} />
              </div>
            </div>
          </section>

          {/* ══ 動態報名欄位（依 formType）══ */}
          <section className="mb-6">
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-bark)" }}>
              {formType === "走讀" && "走讀導覽資訊"}
              {formType === "講座" && "講座課程資訊"}
              {formType === "市集" && "市集招商資訊"}
              {formType === "空間" && "空間租借資訊"}
              {formType === "諮詢" && "預約諮詢資訊"}
              {formType === "預購" && "預購/取貨資訊"}
              {formType === "general" && "其他資訊"}
            </h2>
            <div className="space-y-3 rounded-lg p-4" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)" }}>

              {/* 走讀 */}
              {formType === "走讀" && (<>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>身份證字號 *</label>
                    <input type="text" placeholder="A123456789" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>出生年月日 *</label>
                    <input type="text" placeholder="1990-01-01" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                </div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>居住地</label>
                  <select className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}>
                    <option>請選擇</option><option>宜蘭縣</option><option>台北市</option><option>新北市</option><option>其他</option>
                  </select></div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>同行親友姓名</label>
                  <input type="text" placeholder="可填多位，以逗號分隔" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>從哪裡得知這個活動？</label>
                  <input type="text" placeholder="Instagram、朋友介紹..." className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>參加動機（選填）</label>
                  <textarea placeholder="請簡述" className="w-full px-3 py-2 rounded-lg text-sm" rows={2} style={{ border: "1px solid var(--color-dust)" }} /></div>
              </>)}

              {/* 講座 */}
              {formType === "講座" && (<>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>是否親子報名？</label>
                  <select className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}>
                    <option>請選擇</option><option>否，單人報名</option><option>是，親子一同報名</option>
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>小孩姓名</label>
                    <input type="text" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>小孩年齡</label>
                    <input type="number" placeholder="歲" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                </div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>從哪裡得知？</label>
                  <input type="text" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
              </>)}

              {/* 市集 */}
              {formType === "市集" && (<>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>攤位類型 *</label>
                    <select className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}>
                      <option>請選擇</option><option>一般攤商</option><option>友善農食</option><option>林木創作</option><option>地方文化</option><option>手作工藝</option><option>其他</option>
                    </select></div>
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>品牌所在地區</label>
                    <select className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}>
                      <option>請選擇</option><option>宜蘭縣</option><option>台北市</option><option>新北市</option><option>其他</option>
                    </select></div>
                </div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>品牌名稱 *</label>
                  <input type="text" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>品牌粉專/IG/官網</label>
                  <input type="text" placeholder="https://..." className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>品牌簡介 *</label>
                  <textarea placeholder="100字以內" className="w-full px-3 py-2 rounded-lg text-sm" rows={2} style={{ border: "1px solid var(--color-dust)" }} /></div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>預計販售品項與價格 *</label>
                  <textarea placeholder="品項/價格" className="w-full px-3 py-2 rounded-lg text-sm" rows={2} style={{ border: "1px solid var(--color-dust)" }} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>電源需求（瓦數）</label>
                    <input type="text" placeholder="500W 或 無" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>加租設備</label>
                    <input type="text" placeholder="桌×1、椅×2 或 無" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                </div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>LINE ID</label>
                  <input type="text" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
              </>)}

              {/* 空間 */}
              {formType === "空間" && (<>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>欲租借空間 *</label>
                  <select className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}>
                    <option>請選擇</option><option>旅人書店一樓</option><option>旅人書店二樓</option><option>整棟包場</option><option>戶外空間</option>
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>使用日期 *</label>
                    <input type="text" placeholder="2026-04-15" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>使用時間 *</label>
                    <input type="text" placeholder="14:00-17:00" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>預計人數 *</label>
                    <input type="number" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>使用性質 *</label>
                    <select className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}>
                      <option>請選擇</option><option>讀書會</option><option>工作坊</option><option>藝文展覽</option><option>會議</option><option>私人聚會</option><option>拍攝</option>
                    </select></div>
                </div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>活動內容說明 *</label>
                  <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={2} style={{ border: "1px solid var(--color-dust)" }} /></div>
                <div className="p-3 rounded-lg text-xs" style={{ background: "#FFF8E7", borderLeft: "4px solid #F5A623", color: "#6B4E00" }}>
                  ⚠️ <strong>保險提醒</strong>：若為對外公開活動，請自行辦理活動公共意外責任保險。
                </div>
              </>)}

              {/* 諮詢 */}
              {formType === "諮詢" && (<>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>諮詢主題 *</label>
                  <select className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}>
                    <option>請選擇</option><option>活動規劃合作</option><option>品牌合作</option><option>空間使用</option><option>其他</option>
                  </select></div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>偏好聯絡時段</label>
                  <input type="text" placeholder="平日下午、週末上午" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>需求說明 *</label>
                  <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={3} style={{ border: "1px solid var(--color-dust)" }} /></div>
              </>)}

              {/* 預購 */}
              {formType === "預購" && (<>
                <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>取貨方式 *</label>
                  <select className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}>
                    <option>請選擇</option><option>自取（旅人書店）</option><option>郵寄/宅配</option>
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>收件人姓名（若不同）</label>
                    <input type="text" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>收件人電話（若不同）</label>
                    <input type="tel" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                </div>
              </>)}

              {formType === "general" && (
                <p className="text-sm" style={{ color: "var(--color-mist)" }}>一般商品，無需額外報名資訊</p>
              )}
            </div>
          </section>

          {/* 發票 + 付款 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-bark)" }}>付款與發票</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>付款方式</label>
                  <select className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}
                    value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="credit">信用卡</option><option value="atm">ATM 轉帳</option><option value="cvs">超商代碼</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-ink)" }}>發票類型</label>
                  <select className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }}
                    value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                    <option value="">個人發票（電子發票）</option><option value="公司抬頭">公司抬頭（需填統編）</option>
                  </select>
                </div>
              </div>
              {invoiceType === "公司抬頭" && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>公司名稱</label>
                    <input type="text" className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                  <div><label className="block text-xs mb-1" style={{ color: "var(--color-ink)" }}>統一編號</label>
                    <input type="text" placeholder="12345678" maxLength={8} className="w-full h-9 px-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-dust)" }} /></div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: 訂單摘要 (sticky) */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="rounded-lg overflow-hidden" style={{ border: "1.5px solid var(--color-teal)" }}>
            <div className="p-5" style={{ background: "var(--color-warm-white)" }}>
              <h3 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>訂單摘要</h3>
              <div className="text-sm space-y-2 mb-3">
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-ink)" }}>走讀行旅 成人票 ×1</span>
                  <span style={{ color: "var(--color-rust)" }}>$500</span>
                </div>
              </div>
              <div className="pt-3 flex justify-between" style={{ borderTop: "1px solid var(--color-dust)" }}>
                <span className="font-semibold" style={{ color: "var(--color-ink)" }}>合計</span>
                <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>NT$ 500</span>
              </div>
            </div>
            <div className="p-5">
              <button className="w-full h-11 rounded text-sm font-medium text-white" style={{ background: "var(--color-moss)" }}>
                前往付款（綠界 ECPay）
              </button>
              <p className="text-[0.65em] text-center mt-2" style={{ color: "var(--color-mist)" }}>
                付款由綠界科技處理
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* 導購區 */}
      <AlsoWantToKnow />
      <MightAlsoLike />
    </div>
  );
}
