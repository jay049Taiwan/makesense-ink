"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import SearchDropdown from "./SearchDropdown";
import type { SearchResults } from "./SearchDropdown";
import { useDevRole } from "@/components/providers/DevRoleProvider";
// Cart badge is in the floating button (CartBadge), not in Header
import { trackSearch } from "@/lib/tracking";
import { useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { locales, localeNames, type Locale } from "@/i18n/config";

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

// 取 email @ 之前的 localpart，截斷到最多 10 字
function emailLocalPart(email: string | null | undefined, max: number = 10) {
  if (!email) return "";
  const local = email.split("@")[0] || email;
  return local.length > max ? local.slice(0, max) + "..." : local;
}

export default function Header() {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const devRole = useDevRole();
  // Cart removed from header — floating CartBadge handles it
  const isDev = process.env.NODE_ENV === "development";
  const isLoggedIn = isDev ? true : !!session?.user;
  const userEmail = isDev ? devRole.email : session?.user?.email;
  const userName = isDev ? devRole.displayName : session?.user?.name;
  const router = useRouter();
  const pathname = usePathname();

  // Language switcher
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !(langRef.current as any).contains(e.target)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const switchLocale = (locale: Locale) => {
    router.replace(pathname, { locale });
    setLangOpen(false);
  };

  // 搜尋
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search-index?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const searchResults = {
        products: (data.products || []).map((p: any) => ({ name: p.name, category: p.category, slug: p.slug, photo: p.photo })),
        activities: (data.events || []).map((e: any) => ({ title: e.name, date: e.date, type: e.type, slug: e.slug })),
        articles: (data.articles || []).map((a: any) => ({ title: a.name, type: "文章", date: a.date, slug: a.slug })),
        keywords: (data.topics || []).map((t: any) => ({ name: t.name, slug: t.slug })),
      };
      setResults(searchResults);
      const totalResults = searchResults.products.length + searchResults.activities.length + searchResults.articles.length + searchResults.keywords.length;
      trackSearch(q, totalResults);
    } catch { setResults(null); }
    setSearching(false);
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    setShowDropdown(value.length >= 2);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !(searchRef.current as any).contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowDropdown(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const searchIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );

  const clearBtn = query && (
    <button onClick={() => { setQuery(""); setResults(null); setShowDropdown(false); }} className="p-1 hover:opacity-70">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
    </button>
  );

  return (
    <header className="sticky top-0 z-50" style={{ background: "#fff", borderBottom: "1px solid #e8e0d4" }}>
      <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>
        {/* Desktop */}
        <div className="flex items-center gap-4 h-16">
          <Link href="/bookstore" className="whitespace-nowrap hover:opacity-80 transition-opacity" style={{ fontSize: 22, fontWeight: 600, color: "#7a5c40", lineHeight: "40px", textDecoration: "none" }}>
            {t("bookstore")}
          </Link>
          <Link href="/cultureclub" className="whitespace-nowrap hover:opacity-80 transition-opacity" style={{ fontSize: 22, fontWeight: 600, color: "#4ECDC4", lineHeight: "40px", textDecoration: "none" }}>
            {t("cultureclub")}
          </Link>

          {/* Search bar (Desktop) */}
          <div className="flex-1 min-w-[100px] hidden sm:block relative" ref={searchRef}>
            <div className="mx-auto" style={{ maxWidth: 600 }}>
              <div className="flex items-center h-10 px-4 rounded-full" style={{ border: showDropdown ? "2px solid #4ECDC4" : "2px solid #ddd", background: "#fff", transition: "border-color 0.2s" }}>
                {searchIcon}
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleInput(e.target.value)}
                  onFocus={() => query.length >= 2 && setShowDropdown(true)}
                  placeholder={t("searchPlaceholder")}
                  aria-label={tc("search")}
                  className="flex-1 ml-2 text-sm outline-none bg-transparent"
                  style={{ color: "#333" }}
                />
                {clearBtn}
              </div>
              {showDropdown && results && (
                <SearchDropdown results={results} onClose={() => setShowDropdown(false)} />
              )}
            </div>
          </div>

          {/* 語言切換 */}
          <div className="relative hidden sm:block" ref={langRef}>
            <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors" style={{ color: "#666" }}>
              🌐
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg border py-1 min-w-[100px] z-50">
                {locales.map((loc) => (
                  <button key={loc} onClick={() => switchLocale(loc)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" style={{ color: "#333" }}>
                    {localeNames[loc]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 登入狀態 */}
          {isLoggedIn ? (
            <div className="relative group">
              <Link href="/dashboard" className="whitespace-nowrap flex items-center justify-center h-9 px-5 rounded text-sm font-medium text-white transition-colors hover:opacity-90" style={{ background: "#b89e7a", textDecoration: "none" }}>
                {(userEmail ? emailLocalPart(userEmail) : truncate(userName || "", 10)) || t("member")}你好
              </Link>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white rounded shadow-lg border py-1 min-w-[120px] z-50">
                <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-gray-50" style={{ color: "#333" }}>{t("myRecords")}</Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" style={{ color: "#999" }}>{t("logout")}</button>
              </div>
            </div>
          ) : (
            <Link href="/login" className="whitespace-nowrap flex items-center justify-center h-9 px-5 rounded text-sm font-medium text-white transition-colors hover:opacity-90" style={{ background: "#4ECDC4", textDecoration: "none" }}>
              {t("registerLogin")}
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden ml-1 p-2" aria-label="Menu">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#333">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="sm:hidden pb-4 pt-3 flex flex-col gap-3" style={{ borderTop: "1px solid #e8e0d4" }}>
            {/* Mobile search */}
            <div className="relative">
              <div className="flex items-center h-10 px-4 rounded-full" style={{ border: "2px solid #ddd" }}>
                {searchIcon}
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleInput(e.target.value)}
                  placeholder={tc("search") + "..."}
                  aria-label={tc("search")}
                  className="flex-1 ml-2 text-sm outline-none bg-transparent"
                />
                {clearBtn}
              </div>
              {showDropdown && results && (
                <SearchDropdown results={results} onClose={() => { setShowDropdown(false); setMenuOpen(false); }} />
              )}
            </div>
            <Link href="/bookstore" onClick={() => setMenuOpen(false)} style={{ color: "#7a5c40", fontWeight: 500 }}>{t("bookstore")}</Link>
            <Link href="/cultureclub" onClick={() => setMenuOpen(false)} style={{ color: "#4ECDC4", fontWeight: 500 }}>{t("cultureclub")}</Link>
            {/* Mobile language switcher */}
            <div className="flex gap-2 pl-3">
              {locales.map((loc) => (
                <button key={loc} onClick={() => { switchLocale(loc); setMenuOpen(false); }} className="text-xs px-2 py-1 rounded" style={{ color: "#666", border: "1px solid #ddd" }}>
                  {localeNames[loc]}
                </button>
              ))}
            </div>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: "#b89e7a", fontWeight: 500 }}>{t("myRecords")}</Link>
                <button onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }} className="text-left" style={{ color: "#999" }}>{t("logout")}</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ color: "#4ECDC4", fontWeight: 500 }}>{t("registerLogin")}</Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
