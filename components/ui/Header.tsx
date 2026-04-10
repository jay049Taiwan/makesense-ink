"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import SearchDropdown from "./SearchDropdown";
import type { SearchResults } from "./SearchDropdown";

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();

  // 搜尋狀態：索引載入一次，之後純本地搜尋
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [index, setIndex] = useState<any>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // 載入搜尋索引（只載一次，CDN 快取 5 分鐘）
  useEffect(() => {
    fetch("/api/search-index")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => {});
  }, []);

  // 純客戶端即時搜尋 — 零延遲
  const results: SearchResults | null = useMemo(() => {
    if (!index || query.length < 2) return null;
    const q = query.toLowerCase();
    return {
      products: index.products?.filter((p: any) => p.n.toLowerCase().includes(q)).slice(0, 5).map((p: any) => ({ name: p.n, category: p.c, slug: p.s, photo: p.p })) || [],
      activities: index.activities?.filter((a: any) => a.n.toLowerCase().includes(q)).slice(0, 5).map((a: any) => ({ title: a.n, date: a.d, type: a.t, slug: a.s })) || [],
      articles: index.articles?.filter((a: any) => a.n.toLowerCase().includes(q)).slice(0, 5).map((a: any) => ({ title: a.n, type: a.t, date: a.d, slug: a.s })) || [],
      keywords: index.keywords?.filter((k: any) => k.n.toLowerCase().includes(q)).slice(0, 5).map((k: any) => ({ name: k.n, slug: k.s })) || [],
    };
  }, [index, query]);

  const handleInput = (value: string) => {
    setQuery(value);
    setShowDropdown(value.length >= 2);
  };

  // 點擊外部關閉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !(searchRef.current as any).contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ESC 關閉
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const searchIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
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
            旅人書店
          </Link>
          <Link href="/cultureclub" className="whitespace-nowrap hover:opacity-80 transition-opacity" style={{ fontSize: 22, fontWeight: 600, color: "#4ECDC4", lineHeight: "40px", textDecoration: "none" }}>
            宜蘭文化俱樂部
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
                  placeholder="搜尋書籍、活動、文章..."
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

          {/* 登入狀態 */}
          {session?.user ? (
            <div className="ml-auto relative group">
              <Link href="/dashboard" className="whitespace-nowrap flex items-center justify-center h-9 px-5 rounded text-sm font-medium text-white transition-colors hover:opacity-90" style={{ background: "#b89e7a", textDecoration: "none" }}>
                {truncate(session.user.email || session.user.name || "會員", 15)}，你好
              </Link>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white rounded shadow-lg border py-1 min-w-[120px] z-50">
                <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-gray-50" style={{ color: "#333" }}>會員中心</Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50" style={{ color: "#999" }}>登出</button>
              </div>
            </div>
          ) : (
            <Link href="/login" className="ml-auto whitespace-nowrap flex items-center justify-center h-9 px-5 rounded text-sm font-medium text-white transition-colors hover:opacity-90" style={{ background: "#4ECDC4", textDecoration: "none" }}>
              註冊/登入
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden ml-1 p-2" aria-label="開啟選單">
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
                  placeholder="搜尋..."
                  className="flex-1 ml-2 text-sm outline-none bg-transparent"
                />
                {clearBtn}
              </div>
              {showDropdown && results && (
                <SearchDropdown results={results} onClose={() => { setShowDropdown(false); setMenuOpen(false); }} />
              )}
            </div>
            <Link href="/bookstore" onClick={() => setMenuOpen(false)} style={{ color: "#7a5c40", fontWeight: 500 }}>旅人書店</Link>
            <Link href="/market-booking" onClick={() => setMenuOpen(false)} className="pl-3" style={{ color: "#666" }}>展售合作</Link>
            <Link href="/space-booking" onClick={() => setMenuOpen(false)} className="pl-3" style={{ color: "#666" }}>空間租借</Link>
            <Link href="/cultureclub" onClick={() => setMenuOpen(false)} style={{ color: "#4ECDC4", fontWeight: 500 }}>宜蘭文化俱樂部</Link>
            {session?.user ? (
              <>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: "#b89e7a", fontWeight: 500 }}>會員中心</Link>
                <button onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }} className="text-left" style={{ color: "#999" }}>登出</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ color: "#4ECDC4", fontWeight: 500 }}>註冊/登入</Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
