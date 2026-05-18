import { messagingApi, validateSignature } from "@line/bot-sdk";

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";

/** LINE Messaging API client — 發送訊息、管理 Rich Menu */
export const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
});

/** LINE Blob client — 上傳 Rich Menu 圖片 */
export const lineBlobClient = new messagingApi.MessagingApiBlobClient({
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
});

/**
 * 全站發送開關 — true = 封鎖所有對外 LINE 訊息（reply / push / multicast / broadcast）
 * 改回 false 即可恢復正常發送。
 */
const LINE_SEND_DISABLED = true;

if (LINE_SEND_DISABLED) {
  const noop = async (..._args: any[]) => ({ success: true, disabled: true });
  (lineClient as any).replyMessage = noop;
  (lineClient as any).pushMessage = noop;
  (lineClient as any).multicast = noop;
  (lineClient as any).broadcast = noop;
  (lineClient as any).sendBroadcastMessage = noop;
  (lineClient as any).sendMulticastMessage = noop;
  (lineClient as any).sendNarrowcastMessage = noop;
  console.log("[line] LINE_SEND_DISABLED=true — 所有訊息發送已停用");
}

/** 驗證 webhook 簽名 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) {
    console.warn("[line] LINE_CHANNEL_SECRET not set");
    return false;
  }
  return validateSignature(body, CHANNEL_SECRET, signature);
}

/** LIFF base URL */
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
export const LIFF_BASE_URL = `https://liff.line.me/${LIFF_ID}`;

/** 產生 LIFF 連結（帶 liff_mode 參數） */
export function buildLiffUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${LIFF_BASE_URL}/${cleanPath}?liff_mode=true`;
}
