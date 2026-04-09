"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="mx-auto max-w-[1140px] px-4">
        {/* Desktop */}
        <div className="flex items-baseline gap-4 h-16">
          {/* Brand: 旅人書店 */}
          <Link
            href="/bookstore"
            className="text-[22px] font-semibold text-brand-brown whitespace-nowrap leading-10 hover:opacity-80 transition-opacity"
          >
            旅人書店
          </Link>

          {/* Brand: 宜蘭文化俱樂部 */}
          <Link
            href="/cultureclub"
            className="text-[22px] font-semibold text-brand-teal whitespace-nowrap leading-10 hover:opacity-80 transition-opacity"
          >
            宜蘭文化俱樂部
          </Link>

          {/* Search bar */}
          <div className="flex-1 min-w-[100px] self-center hidden sm:block">
            <div className="max-w-[680px] mx-auto">
              <input
                type="text"
                placeholder="搜尋..."
                className="w-full h-9 px-4 rounded-full border border-border bg-brand-cream text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-all"
              />
            </div>
          </div>

          {/* Member login */}
          <Link
            href="/dashboard"
            className="ml-auto whitespace-nowrap self-center text-sm font-medium text-brand-brown hover:text-brand-teal transition-colors"
          >
            會員登入
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden ml-2 self-center p-2"
            aria-label="開啟選單"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="sm:hidden pb-4 border-t border-border pt-3 flex flex-col gap-3">
            <input
              type="text"
              placeholder="搜尋..."
              className="w-full h-9 px-4 rounded-full border border-border bg-brand-cream text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
            <Link
              href="/bookstore"
              onClick={() => setMenuOpen(false)}
              className="text-brand-brown font-medium"
            >
              旅人書店
            </Link>
            <Link
              href="/bookstore/market-booking"
              onClick={() => setMenuOpen(false)}
              className="text-muted pl-3"
            >
              展售合作
            </Link>
            <Link
              href="/bookstore/space-booking"
              onClick={() => setMenuOpen(false)}
              className="text-muted pl-3"
            >
              空間體驗
            </Link>
            <Link
              href="/cultureclub"
              onClick={() => setMenuOpen(false)}
              className="text-brand-teal font-medium"
            >
              宜蘭文化俱樂部
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="text-brand-brown font-medium"
            >
              會員中心
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
