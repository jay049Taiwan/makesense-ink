export default function DashboardPage() {
  // 此頁的內容會依角色不同而不同
  // 一般會員：總覽（點數、報名、等級）
  // 合作單位：合作概覽（產品數、提案數、帳務摘要）
  // 工作人員：工作台（iframe → staff.makesense.site）

  return (
    <div>
      {/* 一般會員版 — 總覽 */}
      <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--color-ink)" }}>歡迎回來</h2>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-5" style={{ background: "#fff", border: "1.5px solid var(--color-teal)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-mist)" }}>我的點數</p>
          <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>0</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-mist)" }}>進行中的報名</p>
          <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-rust)" }}>0</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-mist)" }}>我的等級</p>
          <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-teal)" }}>Lv.1</p>
        </div>
      </div>

      {/* 合作單位版 — 合作概覽（角色為 vendor 時顯示） */}
      <div className="rounded-xl p-6 mb-6" style={{ background: "var(--color-warm-white)", border: "1px solid var(--color-dust)", display: "none" }}>
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>合作概覽</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>4</p>
            <p className="text-xs" style={{ color: "var(--color-mist)" }}>上架產品</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>3</p>
            <p className="text-xs" style={{ color: "var(--color-mist)" }}>合作提案</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>NT$ 12,340</p>
            <p className="text-xs" style={{ color: "var(--color-mist)" }}>本月營收</p>
          </div>
        </div>
      </div>

      {/* 工作人員版 — 工作台 iframe（角色為 staff 時顯示） */}
      <div style={{ display: "none" }}>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-parchment)", minHeight: "calc(100vh - 200px)", border: "1px solid var(--color-dust)" }}
        >
          <div className="flex items-center justify-center h-full p-12 text-center">
            <div>
              <p className="text-lg mb-2" style={{ color: "var(--color-bark)" }}>工作台</p>
              <p className="text-sm" style={{ color: "var(--color-mist)" }}>
                iframe → staff.makesense.site（需 JWT bridge token 登入）
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
