import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import CartBadge from "./CartBadge";

export default function Footer() {
  const t = useTranslations("footer");

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
          {/* Row 1: Nav (mobile wraps) */}
          <nav className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2 mb-3">
            <Link href="/sense" className="hover:text-[#1a1612] transition-colors whitespace-nowrap"
              style={{ fontSize: 16, color: "#7a6248", letterSpacing: "0.02em" }}>
              {t("about")}
            </Link>
            <span className="hidden sm:inline-block" style={{ width: 1, height: 14, background: "#d0c8bc" }} />
            <Link href="/market-booking" className="hover:text-[#1a1612] transition-colors whitespace-nowrap"
              style={{ fontSize: 16, color: "#7a6248", letterSpacing: "0.02em" }}>
              {t("marketBooking")}
            </Link>
            <span className="hidden sm:inline-block" style={{ width: 1, height: 14, background: "#d0c8bc" }} />
            <Link href="/reading-tour" className="hover:text-[#1a1612] transition-colors whitespace-nowrap"
              style={{ fontSize: 16, color: "#7a6248", letterSpacing: "0.02em" }}>
              {t("readingTour")}
            </Link>
            <span className="hidden sm:inline-block" style={{ width: 1, height: 14, background: "#d0c8bc" }} />
            <Link href="/space-experience" className="hover:text-[#1a1612] transition-colors whitespace-nowrap"
              style={{ fontSize: 16, color: "#7a6248", letterSpacing: "0.02em" }}>
              {t("spaceExperience")}
            </Link>
            <span className="hidden sm:inline-block" style={{ width: 1, height: 14, background: "#d0c8bc" }} />
            <Link href="/content-curation" className="hover:text-[#1a1612] transition-colors whitespace-nowrap"
              style={{ fontSize: 16, color: "#7a6248", letterSpacing: "0.02em" }}>
              {t("contentCuration")}
            </Link>
          </nav>

          {/* Row 2: Social + Contact */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-3">
            <a href="https://www.facebook.com/travelerbookstore" target="_blank" rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity" aria-label="Facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#7a6248">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://www.instagram.com/travelerbookstore" target="_blank" rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity" aria-label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#7a6248">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a href="mailto:travelerbookstore@gmail.com"
              className="hover:opacity-70 transition-opacity" aria-label="Email">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#7a6248">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
            <a href="tel:039325957" style={{ fontSize: 14, color: "#8b7355" }} className="hover:text-[#1a1612] transition-colors">
              {t("phone")}
            </a>
            <span style={{ fontSize: 14, color: "#8b7355" }} className="text-center">{t("address")}</span>
          </div>

          {/* Row 3: Brand line */}
          <div style={{
            textAlign: "center",
            fontSize: 12,
            color: "#b0a090",
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid #ede8e0",
            letterSpacing: "0.05em",
          }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontStyle: "italic" }}>makesense</span>
            {" "}since 2012
          </div>
        </div>
      </footer>

      {/* LINE floating button */}
      <a
        href="https://lin.ee/964ervay"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed z-50 flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-transform"
        style={{ bottom: 24, right: 24, width: 56, height: 56, background: "#06C755" }}
        aria-label={t("lineOA")}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      </a>

      {/* Floating cart button */}
      <CartBadge />
    </>
  );
}
