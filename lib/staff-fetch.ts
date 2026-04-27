/**
 * staffFetch — 包裝 fetch，自動帶 Telegram WebApp initData header
 *
 * 為什麼需要：staff API（/api/staff/*）支援雙模式驗證
 * - 官網瀏覽器：用 NextAuth session cookie（瀏覽器自動帶）
 * - Telegram mini-app：用 X-Telegram-Init-Data header（要手動帶）
 *
 * 在 Telegram WebApp 環境下，window.Telegram.WebApp.initData 會有值；
 * 在官網就是 undefined，header 不會帶（無害）。
 *
 * 用法：取代 fetch()
 *   const res = await staffFetch("/api/staff/inventory", { method: "POST", body: JSON.stringify(...) });
 */
export async function staffFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
  const initData = tg?.initData || "";

  const headers = new Headers(init.headers || {});
  if (initData && !headers.has("X-Telegram-Init-Data")) {
    headers.set("X-Telegram-Init-Data", initData);
  }

  return fetch(input, { ...init, headers });
}
