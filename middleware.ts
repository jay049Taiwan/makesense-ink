import { NextRequest, NextResponse } from "next/server";

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

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // 如果是主網域或 localhost，不做任何事
  if (mainDomains.some((d) => hostname.startsWith(d))) {
    return NextResponse.next();
  }

  // 取得子網域（例：bookstore.makesense.ink → bookstore）
  const subdomain = hostname.split(".")[0];

  // 沒有對應的子網域，不做任何事
  if (!subdomainMap[subdomain]) {
    return NextResponse.next();
  }

  const targetPath = subdomainMap[subdomain];
  const url = request.nextUrl.clone();

  // 全站共用路徑 — 不加子網域前綴，直接通過
  const globalPaths = ["/login", "/dashboard", "/checkout", "/terms", "/privacy", "/api/"];
  if (globalPaths.some((p) => url.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 子網域根路徑 → 重寫到對應路徑
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = targetPath;
    return NextResponse.rewrite(url);
  }

  // 子網域下的子路徑也重寫（避免重複前綴）
  if (!url.pathname.startsWith(targetPath)) {
    url.pathname = targetPath + url.pathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
};
