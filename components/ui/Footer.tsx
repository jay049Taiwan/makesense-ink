import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import FloatingActions from "./FloatingActions";

export default function Footer() {
  const t = useTranslations("footer");

  const linkStyle: React.CSSProperties = {
    color: "#7a6248",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  };

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
          {/* Main row：桌機一行，手機自動換行 */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs sm:text-lg">
            <Link href="/sense" className="hover:text-[#1a1612] transition-colors" style={linkStyle}>
              {t("about")}
            </Link>
            <span style={{ width: 1, height: 14, background: "#d0c8bc", display: "inline-block" }} />
            <Link href="/market-booking" className="hover:text-[#1a1612] transition-colors" style={linkStyle}>
              {t("marketBooking")}
            </Link>
            <span style={{ width: 1, height: 14, background: "#d0c8bc", display: "inline-block" }} />
            <Link href="/reading-tour" className="hover:text-[#1a1612] transition-colors" style={linkStyle}>
              {t("readingTour")}
            </Link>
            <span style={{ width: 1, height: 14, background: "#d0c8bc", display: "inline-block" }} />
            <Link href="/space-experience" className="hover:text-[#1a1612] transition-colors" style={linkStyle}>
              {t("spaceExperience")}
            </Link>
            <span style={{ width: 1, height: 14, background: "#d0c8bc", display: "inline-block" }} />
            <Link href="/content-curation" className="hover:text-[#1a1612] transition-colors" style={linkStyle}>
              {t("contentCuration")}
            </Link>
            <span style={{ width: 1, height: 14, background: "#d0c8bc", display: "inline-block" }} />
            <Link href="/terms" className="hover:text-[#1a1612] transition-colors" style={linkStyle}>
              服務條款
            </Link>

            {/* 視覺分隔（只在桌機顯示，手機讓它自然換行）*/}
            <span className="hidden sm:inline-block" style={{ width: 1, height: 14, background: "#d0c8bc" }} />

            {/* Social icons */}
            <a href="https://www.facebook.com/travelerbookstore" target="_blank" rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity" aria-label="Facebook">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#7a6248">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://www.instagram.com/travelerbookstore" target="_blank" rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity" aria-label="Instagram">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#7a6248">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a href="https://www.threads.net/@travelerbookstore" target="_blank" rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity" aria-label="Threads">
              <svg width="22" height="22" viewBox="0 0 192 192" fill="#7a6248">
                <path d="M141.537 88.988c-.88-.395-1.77-.77-2.67-1.13-1.56-27.31-16.46-42.94-41.5-43.1h-.34c-15.19 0-27.85 6.4-35.44 17.85l13.81 9.49c5.51-8.24 14.1-10.17 21.63-10.17h.27c8.2.05 14.49 2.23 18.66 6.56 3.08 3.21 5.18 7.61 6.25 13.17-7.62-1.33-15.93-1.73-24.84-1.18-24.49 1.47-40.51 15.3-39.49 34.36.51 9.62 5.1 17.85 12.99 23.34 6.69 4.69 15.22 6.98 24.08 6.49 11.88-.66 21.33-5.07 28.12-13.12 5.19-6.21 8.47-14.23 9.9-24.57 6.22 3.61 10.84 9.01 13.06 15.49 3.76 10.95 3.98 28.91-9.33 42.09-11.6 11.47-25.58 16.5-46.9 16.67-23.8-.19-41.95-7.2-53.93-20.86-11.31-12.9-17.16-31.72-17.4-56.36.24-24.63 6.09-43.45 17.4-56.36 11.98-13.67 30.13-20.68 53.93-20.86 23.98.18 42.33 7.21 54.52 20.92 6.02 6.79 10.51 15.38 13.39 25.55l16.73-4.54c-3.48-12.34-9.03-23-16.6-31.7C130.3 11.39 108.67 2.69 77.1 2.47h-.16C45.46 2.69 23.99 11.43 9.43 28.44-3.54 43.45-10.22 64.8-10.44 91.35v.01.01c.22 26.55 6.9 47.9 19.87 62.91 14.56 16.02 36.03 24.31 67.57 24.54h.12c28.01-.22 47.86-7.52 62.7-22.21 18.51-18.33 17.96-41.14 11.77-54.17-4.34-9.14-12.78-16.46-23-23.49zM97.07 127.54c-8.98.5-18.4-3.79-18.86-12.55-.35-6.57 4.5-13.96 19.73-14.87 1.75-.1 3.47-.15 5.16-.15 5.44 0 10.53.5 15.19 1.47-1.7 20.61-11.83 25.6-21.22 26.1z"/>
              </svg>
            </a>
            <a href="mailto:travelerbookstore@gmail.com"
              className="hover:opacity-70 transition-opacity" aria-label="Email">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#7a6248">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
          </div>

          {/* Brand line */}
          <div style={{
            textAlign: "center",
            fontSize: 13,
            color: "#b0a090",
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid #ede8e0",
            letterSpacing: "0.05em",
          }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontStyle: "italic" }}>makesense</span>
            {" "}since 2012
            <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
            <Link href="/privacy" className="hover:text-[#5a4a3a] transition-colors" style={{ color: "#b0a090" }}>
              隱私政策
            </Link>
          </div>
        </div>
      </footer>

      {/* LINE + 購物車浮動按鈕（共用 lift-on-footer 邏輯） */}
      <FloatingActions />
    </>
  );
}
