// Root-level 404 — 覆蓋不在 locale routing 範圍內的壞連結
// （locale 路由下的 404 由 app/[locale]/not-found.tsx 處理）
// 此頁不可用 next-intl Link，改用原生 <a>

export default function RootNotFound() {
  return (
    <html lang="zh-TW">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f2ede6",
          fontFamily: "'Noto Sans TC', sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <p
          style={{
            fontSize: "7rem",
            fontWeight: 700,
            lineHeight: 1,
            color: "#e8e0d4",
            margin: "0 0 1rem",
            fontFamily: "Georgia, serif",
          }}
        >
          404
        </p>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 600, color: "#1a1612", margin: "0 0 0.5rem" }}>
          找不到這個頁面
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#9ba8a0", margin: "0 0 2rem" }}>
          頁面可能已移除，或連結有誤。
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href="/"
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "0.5rem",
              background: "#5c6b4a",
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            回到首頁
          </a>
          <a
            href="/events"
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "0.5rem",
              border: "1px solid #e8e0d4",
              color: "#8b7355",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
              background: "#fff",
            }}
          >
            看看活動
          </a>
        </div>
      </body>
    </html>
  );
}
