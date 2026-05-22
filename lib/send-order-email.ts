/**
 * 訂單確認信（Resend）
 *
 * 需要環境變數：RESEND_API_KEY
 * 若未設定則靜默跳過，不影響結帳流程。
 *
 * 寄件人：旅人書店 <orders@makesense.ink>
 * 前置條件：在 resend.com 完成 makesense.ink 域名驗證（新增 DNS 記錄）
 */
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export interface OrderEmailParams {
  to: string;
  contactName: string;
  orderId: string;
  items: { name: string; subtitle?: string; qty: number; price: number }[];
  total: number;
  hasTickets: boolean;
  delivery?: string; // "self" | "ship"
}

export async function sendOrderConfirmationEmail(params: OrderEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) return; // RESEND_API_KEY 未設定，靜默跳過

  const { to, contactName, orderId, items, total, hasTickets, delivery } = params;
  const orderShort = orderId.slice(0, 8).toUpperCase();
  const displayName = contactName || "您";

  const subject = hasTickets
    ? `【報名受理中】旅人書店訂單 #${orderShort} 已收到`
    : `【訂單確認】感謝您的購買 #${orderShort}`;

  const itemsHtml = items.map((i) => {
    const label = i.subtitle ? `${i.name}（${i.subtitle}）` : i.name;
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3d2b1f;font-size:14px;">${label}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;text-align:center;color:#8b7355;font-size:14px;">×${i.qty}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;text-align:right;color:#3d2b1f;font-size:14px;">NT$ ${(i.price * i.qty).toLocaleString()}</td>
      </tr>`;
  }).join("");

  const statusBlock = hasTickets
    ? `<div style="margin:24px 0;padding:16px 20px;background:#e8f5e9;border-left:4px solid #4caf50;border-radius:0 8px 8px 0;">
        <p style="margin:0;color:#2e7d32;font-size:14px;font-weight:600;">📋 報名受理中</p>
        <p style="margin:6px 0 0;color:#388e3c;font-size:13px;">我們將於 1-2 個工作天內審核，確認後以 Email 及 LINE 通知您。</p>
      </div>`
    : `<div style="margin:24px 0;padding:16px 20px;background:#e3f2fd;border-left:4px solid #1976d2;border-radius:0 8px 8px 0;">
        <p style="margin:0;color:#1565c0;font-size:14px;font-weight:600;">✅ 訂單已確認</p>
        <p style="margin:6px 0 0;color:#1976d2;font-size:13px;">
          ${delivery === "ship"
            ? "商品將以郵局寄送，約 3-5 個工作天送達，運費 NT$ 80 請現場一併付款。"
            : "請至旅人書店（宜蘭縣羅東鎮文化街55號）取貨付款。"}
        </p>
      </div>`;

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Noto Sans TC',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#3d2b1f;padding:28px 32px;">
      <p style="margin:0;color:#c8a97e;font-size:12px;letter-spacing:0.15em;">TRAVELER BOOKSTORE</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;">旅人書店</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="margin:0 0 8px;color:#3d2b1f;font-size:16px;">親愛的 ${displayName}，</p>
      <p style="margin:0 0 24px;color:#7a5c40;font-size:14px;line-height:1.7;">
        ${hasTickets
          ? "感謝您的報名！我們已收到您的申請，審核後將另行通知。"
          : "感謝您的購買！您的訂單已成立，請依下方說明完成取貨付款。"}
      </p>

      <!-- 訂單編號 -->
      <div style="margin-bottom:20px;padding:12px 16px;background:#f5f0e8;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="color:#8b7355;font-size:12px;">訂單編號</span>
        <span style="color:#3d2b1f;font-size:14px;font-weight:700;font-family:monospace;">#${orderShort}</span>
      </div>

      <!-- 商品明細 -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;color:#8b7355;font-size:12px;border-bottom:2px solid #e8e0d4;font-weight:600;">品項</th>
            <th style="text-align:center;padding:8px 0;color:#8b7355;font-size:12px;border-bottom:2px solid #e8e0d4;font-weight:600;">數量</th>
            <th style="text-align:right;padding:8px 0;color:#8b7355;font-size:12px;border-bottom:2px solid #e8e0d4;font-weight:600;">小計</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <!-- 合計 -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-top:2px solid #3d2b1f;margin-bottom:4px;">
        <span style="color:#3d2b1f;font-size:15px;font-weight:700;">合計</span>
        <span style="color:#3d2b1f;font-size:20px;font-weight:700;">NT$ ${total.toLocaleString()}</span>
      </div>

      ${statusBlock}

      <!-- 聯絡資訊 -->
      <div style="margin-top:24px;padding:16px;background:#faf8f5;border-radius:8px;border:1px solid #e8e0d4;">
        <p style="margin:0 0 8px;color:#3d2b1f;font-size:13px;font-weight:600;">📍 旅人書店</p>
        <p style="margin:0;color:#7a5c40;font-size:12px;line-height:1.7;">
          宜蘭縣羅東鎮文化街55號<br>
          電話：039-325957<br>
          如有任何問題，歡迎回覆此信或致電詢問。
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f5f0e8;text-align:center;">
      <p style="margin:0;color:#a08060;font-size:11px;">makesense.ink ・ 現思文化創藝有限公司</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: "旅人書店 <orders@makesense.ink>",
      to,
      subject,
      html,
    });
  } catch (err: any) {
    // 寄信失敗不影響結帳流程，只 log
    console.warn("[send-order-email] 寄信失敗:", err?.message);
  }
}
