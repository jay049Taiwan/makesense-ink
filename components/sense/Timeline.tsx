"use client";

import { useState } from "react";
import { TIMELINE_EVENTS, PHASES, type TimelineEvent, type Phase, type EventType } from "@/lib/sense-data";

const TYPE_META: Record<EventType, { label: string; color: string; shape: "diamond" | "star" | "circle" }> = {
  milestone: { label: "里程碑", color: "var(--color-teal)", shape: "diamond" },
  award: { label: "獲獎", color: "#e8935a", shape: "star" },
  event: { label: "活動", color: "var(--color-bark)", shape: "circle" },
};

const PHASE_TINT: Record<string, { band: string; accent: string }> = {
  seed: { band: "rgba(184, 158, 122, 0.18)", accent: "#7a5c40" },
  founding: { band: "rgba(78, 205, 196, 0.18)", accent: "#2da89e" },
  expansion: { band: "rgba(232, 147, 90, 0.16)", accent: "#c97540" },
  now: { band: "rgba(122, 92, 64, 0.18)", accent: "#7a5c40" },
};

const YEAR_START = 2012;
const YEAR_END = 2026;

function phaseYears(p: Phase): [number, number] {
  const m = p.range.match(/(\d{4})\s*[–-]\s*(\d{4})?/);
  if (!m) return [YEAR_START, YEAR_END];
  return [parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : YEAR_END];
}

function parseDate(s: string) {
  const [y, m] = s.split("-").map(Number);
  return { y, m, q: Math.ceil(m / 3) };
}

function EventMark({ type, active }: { type: EventType; active: boolean }) {
  const meta = TYPE_META[type] || TYPE_META.event;
  const size = active ? 14 : 10;
  if (meta.shape === "diamond") {
    return (
      <svg width={size} height={size} viewBox="-7 -7 14 14" style={{ display: "block" }}>
        <rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" fill={meta.color} />
      </svg>
    );
  }
  if (meta.shape === "star") {
    return (
      <svg width={size} height={size} viewBox="-7 -7 14 14" style={{ display: "block" }}>
        <polygon points="0,-6 1.6,-1.8 6,-1.8 2.4,1 3.8,5.4 0,2.8 -3.8,5.4 -2.4,1 -6,-1.8 -1.6,-1.8" fill={meta.color} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="-7 -7 14 14" style={{ display: "block" }}>
      <circle r={size / 2 - 1} fill={meta.color} />
    </svg>
  );
}

function HoverDetail({ hovered }: { hovered: TimelineEvent | null }) {
  return (
    <div style={{
      marginTop: 24, padding: "14px 18px",
      background: "#fff", border: "1px solid rgba(122,92,64,0.2)",
      minHeight: 64, display: "flex", alignItems: "center", gap: 16,
    }}>
      {hovered ? (
        <>
          <EventMark type={hovered.type} active={true} />
          <div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11, color: "var(--color-teal)", letterSpacing: "0.1em" }}>
              {hovered.date} · {TYPE_META[hovered.type].label}
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, marginTop: 4, color: "var(--color-ink)" }}>
              {hovered.title}
            </div>
            {hovered.note && (
              <div style={{ fontSize: 12, color: "var(--color-bark)", marginTop: 4 }}>{hovered.note}</div>
            )}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace", letterSpacing: "0.1em" }}>
          HOVER OVER A MARK · 滑過節點查看詳情
        </div>
      )}
    </div>
  );
}

// ──────────────────── Stage View ────────────────────
function StageView({
  hovered, setHovered,
}: { hovered: TimelineEvent | null; setHovered: (e: TimelineEvent | null) => void }) {
  const totalSpan = YEAR_END - YEAR_START + 1;
  const rawW = PHASES.map(p => {
    const [ps, pe] = phaseYears(p);
    const yc = pe - ps + 1;
    return yc <= 3 ? Math.max(yc / totalSpan, 0.18) : yc / totalSpan;
  });
  const sumW = rawW.reduce((a, b) => a + b, 0);
  const phaseW = rawW.map(w => w / sumW);
  const gridTpl = phaseW.map(w => `${w}fr`).join(" ");
  const isOpen = PHASES[PHASES.length - 1].range.trim().endsWith("–");

  const marks: { year: number; pos: number; tx: string }[] = [];
  let cum = 0;
  PHASES.forEach((p, i) => {
    const [ps, pe] = phaseYears(p);
    const w = phaseW[i] * 100;
    if (i === 0) marks.push({ year: ps, pos: 0, tx: "translateX(0)" });
    marks.push({
      year: pe, pos: cum + w,
      tx: i === PHASES.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
    });
    cum += w;
  });
  const seen = new Set<number>();
  const uniqMarks = marks.filter(m => (seen.has(m.year) ? false : (seen.add(m.year), true)));

  return (
    <div>
      <div className="hidden md:block mb-2" style={{ position: "relative" }}>
        <div style={{
          display: "grid", gridTemplateColumns: gridTpl,
          height: 28, border: "1px solid var(--color-ink)",
        }}>
          {PHASES.map((p, i) => {
            const tint = PHASE_TINT[p.id];
            return (
              <div key={p.id} style={{
                background: tint.band,
                borderRight: i < PHASES.length - 1 ? "1px solid var(--color-ink)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 10.5, letterSpacing: "0.15em",
                color: tint.accent, textTransform: "uppercase",
              }}>
                <span style={{ padding: "0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.sub}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ position: "relative", height: 24, marginTop: 0 }}>
          {uniqMarks.map((m, i) => (
            <div key={i} style={{
              position: "absolute", left: `${m.pos}%`, transform: m.tx, top: 0,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <div style={{ width: 1, height: 6, background: "var(--color-ink)" }} />
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11, color: "var(--color-ink)", whiteSpace: "nowrap" }}>
                {m.year}{m.year === YEAR_END && isOpen ? " →" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-0 mt-6">
        {PHASES.map((p, i) => {
          const evs = TIMELINE_EVENTS.filter(e => e.phase === p.id);
          const milestones = evs.filter(e => e.type === "milestone" || e.type === "award");
          const tint = PHASE_TINT[p.id];
          return (
            <div key={p.id} style={{
              padding: "16px 18px",
              borderTop: "1px dashed rgba(122,92,64,0.25)",
              borderLeft: i > 0 ? "1px dashed rgba(122,92,64,0.25)" : undefined,
            }}>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 10, letterSpacing: "0.2em", color: "var(--color-mist)", marginBottom: 6, textTransform: "uppercase" }}>
                PHASE {String(i + 1).padStart(2, "0")} · {p.sub}
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, color: "var(--color-ink)", marginBottom: 4 }}>
                {p.label}
              </div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11, color: tint.accent, marginBottom: 10, fontWeight: 500 }}>
                {p.range}
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.75, color: "var(--color-bark)", marginBottom: 14 }}>{p.desc}</p>

              <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, color: "var(--color-ink)" }}>{evs.length}</div>
                  <div style={{ fontSize: 9.5, color: "var(--color-mist)", letterSpacing: "0.1em" }}>累積紀錄</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, color: tint.accent }}>{milestones.length}</div>
                  <div style={{ fontSize: 9.5, color: "var(--color-mist)", letterSpacing: "0.1em" }}>關鍵節點</div>
                </div>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {milestones.map((e, idx) => (
                  <li key={idx}
                    onMouseEnter={() => setHovered(e)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ padding: "4px 0", borderBottom: "1px dashed rgba(122,92,64,0.18)", cursor: "default" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <EventMark type={e.type} active={hovered === e} />
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 10, color: "var(--color-mist)" }}>{e.date}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: "var(--color-ink)", lineHeight: 1.5, display: "block" }}>{e.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────── Year View ────────────────────
function YearView({
  hovered, setHovered,
}: { hovered: TimelineEvent | null; setHovered: (e: TimelineEvent | null) => void }) {
  const years: number[] = [];
  for (let y = YEAR_START; y <= YEAR_END; y++) years.push(y);

  return (
    <div className="overflow-x-auto" style={{ paddingBottom: 8 }}>
      <div style={{ minWidth: 760 }}>
        {/* phase bands by year proportion */}
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${years.length}, 1fr)`,
          height: 22, border: "1px solid var(--color-ink)", marginBottom: 12,
        }}>
          {years.map((y, i) => {
            const phase = PHASES.find(p => {
              const [ps, pe] = phaseYears(p);
              return y >= ps && y <= pe;
            });
            const tint = phase ? PHASE_TINT[phase.id] : null;
            return (
              <div key={y} style={{
                background: tint?.band || "transparent",
                borderRight: i < years.length - 1 ? "1px solid rgba(122,92,64,0.15)" : "none",
              }} />
            );
          })}
        </div>

        {/* event marks per year */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${years.length}, 1fr)`, alignItems: "end", minHeight: 80 }}>
          {years.map(y => {
            const evs = TIMELINE_EVENTS.filter(e => parseDate(e.date).y === y);
            return (
              <div key={y} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, justifyContent: "flex-end", paddingBottom: 6,
              }}>
                {evs.map((e, idx) => (
                  <span key={idx}
                    onMouseEnter={() => setHovered(e)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: "default" }}
                  >
                    <EventMark type={e.type} active={hovered === e} />
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* axis */}
        <div style={{ height: 1, background: "var(--color-ink)" }} />

        {/* year labels */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${years.length}, 1fr)`, marginTop: 6 }}>
          {years.map(y => (
            <div key={y} style={{
              textAlign: "center",
              fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11,
              color: y === YEAR_START || y === YEAR_END ? "var(--color-ink)" : "var(--color-bark)",
              fontWeight: y === YEAR_START || y === YEAR_END ? 600 : 400,
            }}>{y}</div>
          ))}
        </div>

        {/* count below */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${years.length}, 1fr)`, marginTop: 8 }}>
          {years.map(y => {
            const count = TIMELINE_EVENTS.filter(e => parseDate(e.date).y === y).length;
            return (
              <div key={y} style={{
                textAlign: "center",
                fontFamily: "var(--font-serif)", fontSize: 13,
                color: count > 0 ? "var(--color-ink)" : "rgba(122,92,64,0.25)",
              }}>{count || "·"}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────── Quarter / Month View ────────────────────
function DenseView({
  granularity, hovered, setHovered,
}: {
  granularity: "quarter" | "month";
  hovered: TimelineEvent | null;
  setHovered: (e: TimelineEvent | null) => void;
}) {
  type Bucket = { y: number; m?: number; q?: number; key: string };
  const buckets: Bucket[] = [];
  for (let y = YEAR_START; y <= YEAR_END; y++) {
    if (granularity === "quarter") {
      for (let q = 1; q <= 4; q++) buckets.push({ y, q, key: `${y}-Q${q}` });
    } else {
      for (let m = 1; m <= 12; m++) buckets.push({ y, m, key: `${y}-${String(m).padStart(2, "0")}` });
    }
  }
  const cellW = granularity === "quarter" ? 32 : 14;
  const matches = (e: TimelineEvent, b: Bucket) => {
    const d = parseDate(e.date);
    if (d.y !== b.y) return false;
    if (granularity === "quarter") return d.q === b.q;
    return d.m === b.m;
  };

  return (
    <div className="overflow-x-auto" style={{ paddingBottom: 12 }}>
      <div style={{ minWidth: buckets.length * (cellW + 2) }}>
        {/* phase band */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${buckets.length}, ${cellW}px)`,
          gap: 2, height: 18, marginBottom: 6, position: "relative",
        }}>
          {buckets.map((b, i) => {
            const phase = PHASES.find(p => {
              const [ps, pe] = phaseYears(p);
              return b.y >= ps && b.y <= pe;
            });
            const tint = phase ? PHASE_TINT[phase.id] : null;
            return (
              <div key={b.key} style={{
                background: tint?.band || "transparent",
                borderTop: "1px solid var(--color-ink)",
                borderBottom: "1px solid var(--color-ink)",
                borderLeft: i === 0 ? "1px solid var(--color-ink)" : undefined,
                borderRight: i === buckets.length - 1 ? "1px solid var(--color-ink)" : undefined,
              }} />
            );
          })}
        </div>

        {/* event stacks */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${buckets.length}, ${cellW}px)`,
          gap: 2, alignItems: "end", minHeight: 80,
        }}>
          {buckets.map(b => {
            const evs = TIMELINE_EVENTS.filter(e => matches(e, b));
            return (
              <div key={b.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
                {evs.map((e, i) => (
                  <span key={i}
                    onMouseEnter={() => setHovered(e)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: "default" }}
                  >
                    <EventMark type={e.type} active={hovered === e} />
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* axis */}
        <div style={{ height: 1, background: "var(--color-ink)", marginTop: 2 }} />

        {/* labels: 季顯示全部，月只在 1 月顯示年 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${buckets.length}, ${cellW}px)`,
          gap: 2, marginTop: 6,
        }}>
          {buckets.map((b) => {
            const showLabel = granularity === "quarter" ? true : b.m === 1;
            const label = granularity === "quarter" ? `${b.y} Q${b.q}` : `${b.y}`;
            return (
              <div key={b.key} style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 9,
                color: showLabel ? "var(--color-ink)" : "transparent",
                whiteSpace: "nowrap", textAlign: "center",
                transform: granularity === "quarter" ? "none" : "rotate(-45deg)",
                transformOrigin: "center top",
              }}>
                {showLabel ? label : "·"}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────── Main ────────────────────
type Scale = "stage" | "year" | "quarter" | "month";

const SCALES: { id: Scale; label: string; sub: string }[] = [
  { id: "stage", label: "階段", sub: "Phase" },
  { id: "year", label: "年", sub: "Year" },
  { id: "quarter", label: "季", sub: "Quarter" },
  { id: "month", label: "月", sub: "Month" },
];

export default function Timeline() {
  const [scale, setScale] = useState<Scale>("stage");
  const [hovered, setHovered] = useState<TimelineEvent | null>(null);

  return (
    <section style={{ background: "var(--color-warm-white)" }}>
      <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
          <div>
            <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
              — 04 / TIMELINE —
            </p>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
              發展歷程
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-bark)" }}>
              2012 — 2026　從一群人的週末走讀，到地方文化生態系
            </p>
          </div>

          {/* scale switcher */}
          <div style={{
            display: "inline-flex",
            border: "1px solid var(--color-ink)",
            background: "#fff",
            padding: 0,
          }}>
            {SCALES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setScale(s.id)}
                style={{
                  appearance: "none",
                  background: scale === s.id ? "var(--color-ink)" : "transparent",
                  color: scale === s.id ? "#fff" : "var(--color-ink)",
                  borderLeft: i > 0 ? "1px solid rgba(122,92,64,0.25)" : "none",
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 11, letterSpacing: "0.1em",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                  minWidth: 56,
                }}
              >
                <span style={{ fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 8.5, opacity: 0.7, textTransform: "uppercase" }}>{s.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {scale === "stage" && <StageView hovered={hovered} setHovered={setHovered} />}
        {scale === "year" && <YearView hovered={hovered} setHovered={setHovered} />}
        {(scale === "quarter" || scale === "month") && (
          <DenseView granularity={scale} hovered={hovered} setHovered={setHovered} />
        )}

        {scale !== "stage" && <HoverDetail hovered={hovered} />}

        <div className="mt-8 flex flex-wrap items-center gap-5" style={{ fontSize: 11, color: "var(--color-bark)" }}>
          {(["milestone", "award", "event"] as EventType[]).map(k => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <EventMark type={k} active={false} />
              {TYPE_META[k].label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
