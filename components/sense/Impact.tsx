// 05A 營運實績 — 改成左欄列表式（搭配右欄核心能力並排）

import { CUSTOM_METRICS } from "@/lib/sense-data";

interface Stats {
  events: number;
  partners: number;
}

interface Row {
  id: string;
  subtitle: string;
  label: string;
  value: number;
  unit: string;
  narrative?: string;
  highlight?: boolean;
}

export default function Impact({ stats }: { stats: Stats }) {
  const rows: Row[] = [
    {
      id: "creators",
      subtitle: "Creators Supported",
      label: "陪伴青創爸媽",
      value: CUSTOM_METRICS.creators,
      unit: "位",
      narrative: "從品牌定位、空間運營到產品上架，一起讓育兒與創業並行。",
      highlight: true,
    },
    {
      id: "spaces",
      subtitle: "Heritage Spaces Revitalized",
      label: "活化歷史空間",
      value: CUSTOM_METRICS.spaces,
      unit: "處",
      narrative: "把老屋、舊街區、閒置店面，重新接回當代生活。",
      highlight: true,
    },
    {
      id: "events",
      subtitle: "Events Curated",
      label: "策劃文化活動",
      value: stats.events > 0 ? stats.events : CUSTOM_METRICS.defaultEvents,
      unit: "場",
    },
    {
      id: "partners",
      subtitle: "Partner Orgs",
      label: "策展合作夥伴",
      value: stats.partners > 0 ? stats.partners : CUSTOM_METRICS.defaultPartners,
      unit: "組",
    },
    {
      id: "reach",
      subtitle: "In-person Reach",
      label: "現場參與觸及",
      value: CUSTOM_METRICS.reach,
      unit: "人次",
    },
    {
      id: "press",
      subtitle: "Press Coverage",
      label: "媒體露出 · 報導",
      value: CUSTOM_METRICS.press,
      unit: "則",
    },
  ];

  return (
    <div>
      {/* section header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 10.5, letterSpacing: "0.18em",
          color: "var(--color-mist)", textTransform: "uppercase",
        }}>
          § 05A　Operational Impact
        </div>
        <div style={{
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 10, color: "var(--color-mist)",
        }}>
          2014 → 2026
        </div>
      </div>
      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 500, color: "var(--color-ink)", marginBottom: 14, letterSpacing: "0.02em" }}>
        營運實績
      </h2>
      <p style={{ fontSize: 12.5, lineHeight: 1.85, color: "var(--color-bark)", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(122,92,64,0.18)" }}>
        十二年來，我們不只辦活動 — 而是把人、空間與內容編織在一起。
        標記 <span style={{
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 10, padding: "1px 6px",
          background: "rgba(232,147,90,0.12)", color: "#c97540",
          letterSpacing: "0.1em", border: "1px solid rgba(232,147,90,0.35)",
        }}>IMPACT</span> 的，是我們最在意的影響力指標。
      </p>

      {/* rows */}
      <div>
        {rows.map((r, i) => (
          <div key={r.id} style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "start",
            gap: 16,
            padding: "16px 0",
            borderBottom: i < rows.length - 1 ? "1px solid rgba(122,92,64,0.12)" : undefined,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 9.5, letterSpacing: "0.18em",
                  color: "var(--color-mist)", textTransform: "uppercase",
                }}>
                  {r.subtitle}
                </span>
                {r.highlight && (
                  <span style={{
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: 9, padding: "1px 5px",
                    background: "rgba(232,147,90,0.1)",
                    color: "#c97540",
                    letterSpacing: "0.12em", border: "1px solid rgba(232,147,90,0.3)",
                  }}>
                    IMPACT
                  </span>
                )}
              </div>
              <div style={{
                fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500,
                color: "var(--color-ink)", marginBottom: r.narrative ? 5 : 0,
              }}>
                {r.label}
              </div>
              {r.narrative && (
                <p style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--color-bark)" }}>
                  {r.narrative}
                </p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
              <span style={{
                fontFamily: "var(--font-serif)",
                fontSize: 38, fontWeight: 500,
                color: "var(--color-ink)", lineHeight: 1, letterSpacing: "-0.02em",
              }}>
                {r.value.toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-bark)" }}>{r.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <p style={{
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        fontSize: 9.5, color: "var(--color-mist)",
        marginTop: 14, letterSpacing: "0.1em",
      }}>
        資料來源：現思文化 Notion 營運紀錄　·　活動 / 夥伴採官網即時統計　·　其餘為歷年累積
      </p>
    </div>
  );
}
