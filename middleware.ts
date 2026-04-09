import { NextRequest, NextResponse } from "next/server";

// 子網域 → 路徑對應
const subdomainMap: Record<string, string> = {
  bookstore: "/bookstore",
  cultureclub: "/cultureclub",
  sense: "/sense",
  insight: "/viewpoint-stroll",
};

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // 取得子網域（例：bookstore.makesense.ink → bookstore）
  const subdomain = hostname
    .replace(".makesense.ink", "")
    .replace(".makesense-ink.vercel.app", "")
    .replace(".localhost:3000", "");

  // 如果是主網域或沒有對應的子網域，不做任何事
  if (
    subdomain === hostname ||
    subdomain === "makesense" ||
    subdomain === "www" ||
    subdomain === "localhost:3000" ||
    !subdomainMap[subdomain]
  ) {
    return NextResponse.next();
  }

  const targetPath = subdomainMap[subdomain];

  // 如果用戶訪問子網域的根路徑，重寫到對應路徑
  // 例：bookstore.makesense.ink/ → 內部重寫為 /bookstore
  // 例：bookstore.makesense.ink/market-booking → 內部重寫為 /bookstore/market-booking
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = targetPath;
    return NextResponse.rewrite(url);
  }

  // 子網域下的子路徑也重寫
  // 例：cultureclub.makesense.ink/about → /cultureclub/about
  // 但要避免重複前綴：如果路徑已經以 targetPath 開頭就不加
  if (!url.pathname.startsWith(targetPath)) {
    url.pathname = targetPath + url.pathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // 排除靜態資源和 API
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
};
