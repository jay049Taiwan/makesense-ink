import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      <footer
        className="mt-auto"
        style={{
          background: "#faf8f5",
          borderTop: "1px solid #e8e0d4",
          fontFamily: "'Noto Sans TC', sans-serif",
        }}
      >
        <div className="mx-auto px-4 py-6" style={{ maxWidth: 1200 }}>
          {/* Row 1: Nav + Social + Contact — all in one line */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-5 gap-y-3">
            <nav className="flex items-center gap-x-2 sm:gap-x-4 flex-shrink-0">
              <Link href="/sense" className="hover:text-[#1a1612] transition-colors whitespace-nowrap"
                style={{ fontSize: "0.75rem", color: "#7a6248", letterSpacing: "0.02em" }}>
                關於我們
              </Link>
              <span style={{ width: 1, height: 11, background: "#d0c8bc", display: "inline-block", flexShrink: 0 }} />
              <Link href="/market-booking" className="hover:text-[#1a1612] transition-colors whitespace-nowrap"
                style={{ fontSize: "0.75rem", color: "#7a6248", letterSpacing: "0.02em" }}>
                展售合作
              </Link>
              <span style={{ width: 1, height: 11, background: "#d0c8bc", display: "inline-block", flexShrink: 0 }} />
              <Link href="/space-booking" className="hover:text-[#1a1612] transition-colors whitespace-nowrap"
                style={{ fontSize: "0.75rem", color: "#7a6248", letterSpacing: "0.02em" }}>
                空間場域
              </Link>
              <span style={{ width: 1, height: 11, background: "#d0c8bc", display: "inline-block", flexShrink: 0 }} />
              <Link href="/content-curation" className="hover:text-[#1a1612] transition-colors whitespace-nowrap"
                style={{ fontSize: "0.75rem", color: "#7a6248", letterSpacing: "0.02em" }}>
                內容採輯
              </Link>
            </nav>

            {/* Social + Email icons — 統一間距 */}
            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/travelerbookstore" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
                style={{ width: 28, height: 28, background: "#ede8e0" }} aria-label="Facebook">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#7a6248">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/travelerbookstore" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
                style={{ width: 28, height: 28, background: "#ede8e0" }} aria-label="Instagram">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#7a6248">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="mailto:travelerbookstore@gmail.com"
                className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
                style={{ width: 28, height: 28, background: "#ede8e0" }} aria-label="Email">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a6248" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>
            </div>
            <span style={{ fontSize: "0.8rem", color: "#8b7355" }}>039-325957</span>
            <span style={{ fontSize: "0.8rem", color: "#8b7355" }}>宜蘭縣羅東鎮文化街55號</span>
          </div>

          {/* Row 2: Copyright */}
          <div style={{
            textAlign: "center",
            fontSize: "0.75rem",
            color: "#b0a090",
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid #ede8e0",
          }}>
            &copy; 2012&ndash;{year} 現思文化創藝術有限公司
          </div>
        </div>
      </footer>

      {/* LINE floating button — 56px */}
      <a
        href="https://lin.ee/964ervay"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed z-50 flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-transform"
        style={{ bottom: 24, right: 24, width: 56, height: 56, background: "#06C755" }}
        aria-label="LINE 官方帳號"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      </a>

      {/* Floating cart button — 56px（跟 LINE 一樣大）*/}
      <a
        href="/checkout"
        className="fixed z-50 flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-transform"
        style={{ bottom: 92, right: 24, width: 56, height: 56, background: "#1a1612" }}
        aria-label="購物車"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="m1 1 4 0 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      </a>
    </>
  );
}
