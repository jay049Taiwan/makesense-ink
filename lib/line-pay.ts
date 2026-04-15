/**
 * LINE Pay API Wrapper
 * 需要：LINE_PAY_CHANNEL_ID 和 LINE_PAY_CHANNEL_SECRET 環境變數
 * 申請商家帳號：https://pay.line.me/tw/merchant/apply
 */
import crypto from "crypto";

const CHANNEL_ID = process.env.LINE_PAY_CHANNEL_ID || "";
const CHANNEL_SECRET = process.env.LINE_PAY_CHANNEL_SECRET || "";
const API_BASE = process.env.LINE_PAY_SANDBOX === "true"
  ? "https://sandbox-api-pay.line.me"
  : "https://api-pay.line.me";

export function isLinePayConfigured(): boolean {
  return !!(CHANNEL_ID && CHANNEL_SECRET);
}

function generateSignature(secret: string, uri: string, body: string, nonce: string): string {
  const message = secret + uri + body + nonce;
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

function generateNonce(): string {
  return crypto.randomUUID();
}

async function callLinePayAPI(method: "POST" | "GET", uri: string, body?: any) {
  if (!isLinePayConfigured()) {
    throw new Error("LINE Pay 尚未設定 Channel ID 和 Secret");
  }

  const nonce = generateNonce();
  const bodyStr = body ? JSON.stringify(body) : "";
  const signature = generateSignature(CHANNEL_SECRET, uri, bodyStr, nonce);

  const res = await fetch(`${API_BASE}${uri}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-LINE-ChannelId": CHANNEL_ID,
      "X-LINE-Authorization-Nonce": nonce,
      "X-LINE-Authorization": signature,
    },
    ...(body ? { body: bodyStr } : {}),
  });

  return res.json();
}

/**
 * 建立付款請求（Reserve）
 * 用戶會被導向 LINE Pay 付款頁面
 */
export async function reservePayment(params: {
  orderId: string;
  amount: number;
  currency?: string;
  productName: string;
  confirmUrl: string;
  cancelUrl: string;
}) {
  const body = {
    amount: params.amount,
    currency: params.currency || "TWD",
    orderId: params.orderId,
    packages: [{
      id: "pkg-1",
      amount: params.amount,
      name: "旅人書店",
      products: [{
        name: params.productName,
        quantity: 1,
        price: params.amount,
      }],
    }],
    redirectUrls: {
      confirmUrl: params.confirmUrl,
      cancelUrl: params.cancelUrl,
    },
  };

  return callLinePayAPI("POST", "/v3/payments/request", body);
}

/**
 * 確認付款（Confirm）
 * LINE Pay 付款完成後，用戶回到 confirmUrl，呼叫此函式完成交易
 */
export async function confirmPayment(transactionId: string, amount: number, currency?: string) {
  return callLinePayAPI("POST", `/v3/payments/requests/${transactionId}/confirm`, {
    amount,
    currency: currency || "TWD",
  });
}
