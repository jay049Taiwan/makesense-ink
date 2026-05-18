import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 全站 Security Headers middleware
 * 防範 clickjacking、MIME sniffing、XSS 等常見攻擊
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 防 MIME sniffing（瀏覽器不猜 Content-Type）
  response.headers.set("X-Content-Type-Options", "nosniff");

  // 防 clickjacking（不允許 iframe 嵌入）
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // 強制 HTTPS（1 年，含 subdomains）
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Referrer Policy（跨站只送 origin，不帶 path）
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 關閉不必要的瀏覽器功能
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  return response;
}

export const config = {
  matcher: [
    /*
     * 套用到所有路由，排除：
     * - _next/static（靜態檔案）
     * - _next/image（圖片最佳化）
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
