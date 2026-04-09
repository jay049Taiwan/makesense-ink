import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "付款完成",
};

export default function CheckoutSuccessPage() {
  // TODO: 依 query params 判斷是審核中還是直接成功
  // ?status=review → 審核中（市集/空間/諮詢）
  // ?status=success → 直接成功（走讀/講座/商品）
  // ?redirect=/post/xxx → 付費文章，直接跳回文章頁

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4">
      <div className="text-center" style={{ maxWidth: 480 }}>
        {/* 成功版 */}
        <div
          className="rounded-xl p-8 mb-6"
          style={{ background: "#F0FFF4", border: "1px solid #9AE6B4" }}
        >
          <p className="text-4xl mb-4">✅</p>
          <h1
            className="text-xl font-semibold mb-2"
            style={{ color: "#1A3A2E" }}
          >
            報名成功！
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "#4A5568" }}
          >
            感謝您的報名，確認信已寄送至您的信箱。
            <br />
            期待與您相見！
          </p>
        </div>

        {/* 審核版（市集/空間/諮詢會用到） */}
        <div
          className="rounded-xl p-8 mb-6 hidden"
          style={{ background: "#F0F7FF", border: "1px solid #B0C8E8" }}
        >
          <p className="text-4xl mb-4">📋</p>
          <h1
            className="text-xl font-semibold mb-2"
            style={{ color: "#1A3A5C" }}
          >
            資料已收到，審核中
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "#4A5568" }}
          >
            感謝您的申請！我們正在審核您的資料，
            <br />
            錄取結果將於 <strong>3~5 個工作天</strong> 內以
            <strong> Email </strong>
            及 <strong>LINE</strong> 通知。
          </p>
        </div>

        {/* 導航按鈕 */}
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard/orders"
            className="px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: "var(--color-teal)",
              color: "#fff",
            }}
          >
            查看訂單
          </Link>
          <Link
            href="/bookstore"
            className="px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{
              border: "1px solid var(--color-dust)",
              color: "var(--color-bark)",
            }}
          >
            回到首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
