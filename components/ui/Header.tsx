"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "#fff", borderBottom: "1px solid #e8e0d4" }}
    >
      <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>
        {/* Desktop */}
        <div className="flex items-center gap-4 h-16">
          {/* 旅人書店 */}
          <Link
            href="/bookstore"
            className="whitespace-nowrap hover:opacity-80 transition-opacity"
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#7a5c40",
              lineHeight: "40px",
              textDecoration: "none",
            }}
          >
            旅人書店
          </Link>

          {/* 宜蘭文化俱樂部 */}
          <Link
            href="/cultureclub"
            className="whitespace-nowrap hover:opacity-80 transition-opacity"
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#4ECDC4",
              lineHeight: "40px",
              textDecoration: "none",
            }}
          >
            宜蘭文化俱樂部
          </Link>

          {/* Search bar */}
          <div className="flex-1 min-w-[100px] hidden sm:block">
            <div className="mx-auto" style={{ maxWidth: 600 }}>
              <div
                className="flex items-center h-10 px-4 rounded-full"
                style={{ border: "2px solid #ddd", background: "#fff" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#999"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="搜尋書籍、活動、文章..."
                  className="flex-1 ml-2 text-sm outline-none bg-transparent"
                  style={{ color: "#333" }}
                />
              </div>
            </div>
          </div>

          {/* 註冊/登入 */}
          <Link
            href="/login"
            className="ml-auto whitespace-nowrap flex items-center justify-center h-9 px-5 rounded text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: "#4ECDC4", textDecoration: "none" }}
          >
            註冊/登入
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden ml-1 p-2"
            aria-label="開啟選單"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="#333"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav
            className="sm:hidden pb-4 pt-3 flex flex-col gap-3"
            style={{ borderTop: "1px solid #e8e0d4" }}
          >
            <div
              className="flex items-center h-10 px-4 rounded-full"
              style={{ border: "2px solid #ddd" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="搜尋..."
                className="flex-1 ml-2 text-sm outline-none bg-transparent"
              />
            </div>
            <Link href="/bookstore" onClick={() => setMenuOpen(false)} style={{ color: "#7a5c40", fontWeight: 500 }}>
              旅人書店
            </Link>
            <Link href="/market-booking" onClick={() => setMenuOpen(false)} className="pl-3" style={{ color: "#666" }}>
              展售合作
            </Link>
            <Link href="/space-booking" onClick={() => setMenuOpen(false)} className="pl-3" style={{ color: "#666" }}>
              空間租借
            </Link>
            <Link href="/cultureclub" onClick={() => setMenuOpen(false)} style={{ color: "#4ECDC4", fontWeight: 500 }}>
              宜蘭文化俱樂部
            </Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} style={{ color: "#4ECDC4", fontWeight: 500 }}>
              註冊/登入
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
