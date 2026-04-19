import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

// next-intl middleware (handles locale detection + prefix)
const intlMiddleware = createMiddleware(routing);

// 子網域 → 路徑對應
const subdomainMap: Record<string, string> = {
  bookstore: "/bookstore",
  cultureclub: "/cultureclub",
  sense: "/sense",
  insight: "/viewpoint-stroll",
};

// 主網域清單（不做子網域路由的）
const mainDomains = [
  "localhost",
  "makesense.ink",
  "www.makesense.ink",
  "makesense-ink.vercel.app",
];

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // 跳過 API、靜態資源、Telegram、feed、SEO 檔案
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/telegram/") ||
    pathname.startsWith("/feed.xml") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/manifest.webmanifest") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  // ── 子網域路由 ──
  const isMain = mainDomains.some((d) => hostname.startsWith(d));

  if (!isMain) {
    const subdomain = hostname.split(".")[0];
    if (subdomainMap[subdomain]) {
      const targetPath = subdomainMap[subdomain];
      const url = request.nextUrl.clone();

      // 全站共用路徑不加子網域前綴
      const globalPaths = ["/login", "/dashboard", "/checkout", "/terms", "/privacy"];
      if (globalPaths.some((p) => pathname.startsWith(p))) {
        return intlMiddleware(request);
      }

      // 子網域根路徑 → 重寫到對應路徑
      if (pathname === "/" || pathname === "") {
        url.pathname = targetPath;
        return NextResponse.rewrite(url);
      }

      // 檢查是否已有 locale prefix
      const localeMatch = pathname.match(/^\/(en|ja|ko)(\/|$)/);
      if (localeMatch) {
        const rest = pathname.slice(localeMatch[0].length - 1) || "/";
        if (!rest.startsWith(targetPath)) {
          url.pathname = `/${localeMatch[1]}${targetPath}${rest === "/" ? "" : rest}`;
          return NextResponse.rewrite(url);
        }
      } else if (!pathname.startsWith(targetPath)) {
        url.pathname = targetPath + pathname;
        return NextResponse.rewrite(url);
      }
    }
  }

  // ── i18n locale routing ──
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|feed\\.xml|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|telegram).*)"],
};
