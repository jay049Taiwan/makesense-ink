import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "活動",
};

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div>
      {/* SP-E0: Hero banner */}
      <div
        className="relative flex items-end"
        style={{
          background: "linear-gradient(135deg, var(--color-moss), #3a5230)",
          minHeight: 320,
          padding: "48px 40px",
        }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 1160 }}>
          <p className="text-sm tracking-widest mb-2" style={{ color: "var(--color-mist)", fontFamily: "var(--font-sans)" }}>
            活動
          </p>
          <h1
            className="text-3xl sm:text-4xl font-semibold text-white mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            活動名稱（{slug}）
          </h1>
          <p className="text-sm text-white/70">2026 年 5 月 1 日（四）09:00–17:00</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-10 py-12" style={{ maxWidth: 1160 }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
          {/* Left: Event details */}
          <div>
            {/* Excerpt */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-bark)", fontFamily: "var(--font-serif)" }}>
                關於這場活動
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>
                活動摘要（來自 DB04「簡介摘要」欄位）
              </p>
            </section>

            {/* Route */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-bark)", fontFamily: "var(--font-serif)" }}>
                活動路線
              </h2>
              <ol className="list-decimal pl-5 space-y-2 text-sm" style={{ color: "var(--color-ink)" }}>
                <li>集合點：旅人書店</li>
                <li>第一站：頭城老街</li>
                <li>第二站：蘭陽博物館</li>
                <li>解散：頭城車站</li>
              </ol>
            </section>

            {/* Full content */}
            <section className="mb-8">
              <div
                className="rounded-lg p-6 text-sm leading-relaxed"
                style={{ background: "var(--color-warm-white)", color: "var(--color-ink)" }}
              >
                活動正文（來自 DB05 page content → HTML）
              </div>
            </section>

            {/* Keywords */}
            <div className="flex flex-wrap gap-2">
              {["走讀行旅", "頭城", "文化資產"].map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1 rounded-full text-xs"
                  style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Ticket sidebar (sticky) */}
          <aside className="lg:sticky lg:top-6">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-dust)" }}>
              <div className="p-5" style={{ background: "var(--color-warm-white)" }}>
                <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
                  票價
                </h3>
                <p className="text-xs mb-4" style={{ color: "var(--color-mist)" }}>選擇票種與數量</p>

                {/* Ticket types */}
                {[
                  { name: "成人票", price: 500 },
                  { name: "兒童票", price: 250 },
                  { name: "0元體驗票", price: 0 },
                ].map((ticket) => (
                  <div
                    key={ticket.name}
                    className="flex items-center justify-between py-3"
                    style={{ borderBottom: "1px solid var(--color-dust)" }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{ticket.name}</p>
                      <p className="text-sm" style={{ color: "var(--color-rust)" }}>
                        {ticket.price === 0 ? "免費" : `NT$ ${ticket.price}`}
                      </p>
                    </div>
                    <div className="flex items-center border rounded" style={{ borderColor: "var(--color-dust)" }}>
                      <button className="w-8 h-8 text-sm" style={{ color: "var(--color-bark)" }}>−</button>
                      <span className="w-8 h-8 flex items-center justify-center text-xs">0</span>
                      <button className="w-8 h-8 text-sm" style={{ color: "var(--color-bark)" }}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5">
                <div className="flex justify-between mb-4">
                  <span className="text-sm" style={{ color: "var(--color-muted)" }}>合計</span>
                  <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
                    NT$ 0
                  </span>
                </div>
                <button
                  className="w-full h-11 rounded text-sm font-medium text-white transition-colors"
                  style={{ background: "var(--color-moss)" }}
                >
                  立即報名
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
