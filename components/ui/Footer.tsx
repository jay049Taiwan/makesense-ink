import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-auto"
      style={{
        background: "#faf8f5",
        borderTop: "1px solid #e8e0d4",
        padding: "28px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "40px",
        flexWrap: "wrap",
        fontFamily: "'Noto Sans TC', sans-serif",
      }}
    >
      <Link
        href="/sense"
        className="hover:text-[#1a1612] transition-colors"
        style={{
          fontSize: "0.9rem",
          color: "#7a6248",
          textDecoration: "none",
          letterSpacing: "0.04em",
        }}
      >
        關於我們
      </Link>

      <div style={{ width: 1, height: 14, background: "#d0c8bc" }} />

      <Link
        href="/market-booking"
        className="hover:text-[#1a1612] transition-colors"
        style={{
          fontSize: "0.9rem",
          color: "#7a6248",
          textDecoration: "none",
          letterSpacing: "0.04em",
        }}
      >
        異業合作
      </Link>

      <div style={{ width: 1, height: 14, background: "#d0c8bc" }} />

      <Link
        href="/space-booking"
        className="hover:text-[#1a1612] transition-colors"
        style={{
          fontSize: "0.9rem",
          color: "#7a6248",
          textDecoration: "none",
          letterSpacing: "0.04em",
        }}
      >
        空間體驗
      </Link>

      <div
        style={{
          width: "100%",
          textAlign: "center",
          fontSize: "0.78rem",
          color: "#b0a090",
          marginTop: 4,
          paddingTop: 16,
          borderTop: "1px solid #ede8e0",
        }}
      >
        &copy; {year} 現思文化創藝術有限公司
      </div>
    </footer>
  );
}
