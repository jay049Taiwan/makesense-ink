import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服務條款與退換貨政策",
  description: "現思文化創藝術有限公司 — 服務條款與退換貨政策。",
};

export default function TermsPage() {
  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 800 }}>
      <h1 className="text-3xl font-semibold mb-2"
        style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
        服務條款與退換貨政策
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-mist)" }}>
        最後更新日期：2026 年 4 月 1 日
      </p>

      <div className="text-[0.9em] leading-[1.8] space-y-6" style={{ color: "var(--color-ink)" }}>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>一、服務內容</h2>
          <p>本公司提供之服務包括：商品銷售、活動報名、空間預約、會員服務及內容服務。本公司保留隨時調整服務內容之權利。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>二、帳號註冊與管理</h2>
          <p>本網站支援 Google 及 LINE 帳號登入。使用者需提供正確、完整之個人資料，並負責帳號安全。同一信箱將自動整合多種登入方式之帳號。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>三、商品購買與交易</h2>
          <p>商品價格以下單時顯示為準。本公司得因庫存不足或價格標示錯誤取消訂單，並全額退款。配送範圍依結帳頁面說明為準。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>四、活動報名與預約</h2>
          <p>活動報名經確認後，取消退款規則如下：</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>活動日 <strong>7 天前</strong>取消：全額退款</li>
            <li>活動日 <strong>3–6 天前</strong>取消：退款 50%</li>
            <li>活動日 <strong>2 天內</strong>取消：恕不退款</li>
          </ul>
          <p className="mt-2">本公司得因不可抗力因素取消活動，並全額退款。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>五、退換貨政策</h2>
          <p>依消費者保護法規定，商品到貨後享有七日猶豫期。退換貨條件如下：</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>商品需保持全新、未拆封、未使用之狀態</li>
            <li>客製化商品、食品類商品不適用七日猶豫期</li>
            <li>退貨運費由消費者負擔（商品瑕疵除外）</li>
            <li>退款將於收到退貨商品後 7 個工作天內處理</li>
          </ul>
          <p className="mt-2">如需退換貨，請透過 Email 或 LINE 官方帳號聯繫。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>六、集點與會員優惠</h2>
          <p>探索點不可轉讓或兌換現金。本公司保留隨時調整集點規則之權利。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>七、智慧財產權</h2>
          <p>本網站之所有內容均受中華民國著作權法保護，未經書面同意不得重製、轉載或作商業使用。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>八、使用者行為規範</h2>
          <p>使用者不得冒用他人身份、干擾系統運作、侵害他人隱私或發布不當內容。違反者將遭暫停或終止帳號。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>九、免責聲明</h2>
          <p>本服務以現況提供，不保證服務無中斷或無誤。因不可抗力導致之損害，本公司不負賠償責任。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>十、條款修訂</h2>
          <p>本公司得隨時修訂本條款，修訂後於本頁面公告並更新日期。繼續使用本服務即視為同意修訂後之條款。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>十一、準據法與管轄</h2>
          <p>本條款以中華民國法律為準據法，如因本條款發生爭議，以臺灣宜蘭地方法院為第一審管轄法院。</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-bark)" }}>十二、聯絡資訊</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: "var(--color-bark)" }}>
            <li>現思文化創藝術有限公司</li>
            <li>Email：travelerbookstore@gmail.com</li>
            <li>電話：039-325957</li>
            <li>LINE 官方帳號：@964ervay</li>
            <li>地址：宜蘭縣羅東鎮文化街55號</li>
          </ul>
        </section>

        <p className="text-xs pt-4" style={{ color: "var(--color-mist)", borderTop: "1px solid var(--color-dust)" }}>
          現思文化創藝術有限公司 © 2012–{new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
