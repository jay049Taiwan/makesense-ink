"use client";

import { useState } from "react";
import { CAPABILITY_GROUPS } from "@/lib/sense-data";

const GROUP_COLOR: Record<string, string> = {
  space: "var(--color-teal)",
  community: "#e8935a",
  content: "var(--color-bark)",
};

function CapabilityRow({ item, color }: { item: { name: string; weight: number; note?: string }; color: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: "10px 0", borderBottom: "1px dashed rgba(122,92,64,0.18)", cursor: "default" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500 }}>{item.name}</span>
        <span style={{
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 10, color: "var(--color-mist)", letterSpacing: "0.05em",
        }}>
          {Math.round(item.weight * 100)}
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(122,92,64,0.15)", position: "relative" }}>
        <div style={{
          position: "absolute", inset: 0,
          width: `${item.weight * 100}%`, background: color,
          transition: "width 600ms ease",
        }} />
      </div>
      {item.note && (
        <div style={{
          fontSize: 11, lineHeight: 1.65, color: "var(--color-bark)",
          maxHeight: hover ? 48 : 0, opacity: hover ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 220ms, opacity 180ms, margin-top 180ms",
          marginTop: hover ? 6 : 0,
        }}>
          — {item.note}
        </div>
      )}
    </div>
  );
}

export default function Capabilities() {
  return (
    <div>
      {/* section header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 10.5, letterSpacing: "0.18em",
          color: "var(--color-mist)", textTransform: "uppercase",
        }}>
          § 05B　Core Capabilities
        </div>
        <div style={{
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 10, color: "var(--color-mist)", letterSpacing: "0.1em",
        }}>
          DYNAMIC
        </div>
      </div>
      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 500, color: "var(--color-ink)", marginBottom: 14, letterSpacing: "0.02em" }}>
        核心能力
      </h2>
      <p style={{ fontSize: 12.5, lineHeight: 1.85, color: "var(--color-bark)", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(122,92,64,0.18)" }}>
        與其說這是我們會做什麼，不如說這是十二年來，現場把我們磨成什麼樣子。
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {CAPABILITY_GROUPS.map((g, idx) => {
          const color = GROUP_COLOR[g.id] || "var(--color-bark)";
          const avg = Math.round((g.items.reduce((s, it) => s + it.weight, 0) / g.items.length) * 100);
          return (
            <div key={g.id}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 2 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: color, display: "inline-block",
                  }} />
                  <span style={{
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: 9, color: "var(--color-mist)",
                  }}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 2 }}>
                    <div>
                      <div style={{
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        fontSize: 10, letterSpacing: "0.2em",
                        color: "var(--color-mist)", textTransform: "uppercase",
                      }}>
                        {g.sub}
                      </div>
                      <div style={{
                        fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 500,
                        color: "var(--color-ink)",
                      }}>
                        {g.label}
                      </div>
                    </div>
                    <div style={{ whiteSpace: "nowrap" }}>
                      <span style={{
                        fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500,
                        color: color, lineHeight: 1,
                      }}>{avg}</span>
                      <span style={{ fontSize: 10, color: "var(--color-mist)" }}>/100</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--color-bark)", marginTop: 4, marginBottom: 6 }}>
                    {g.desc}
                  </p>
                  {g.items.map((it, i) => (
                    <CapabilityRow key={i} item={it} color={color} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        fontSize: 9.5, color: "var(--color-mist)",
        marginTop: 14, letterSpacing: "0.1em",
      }}>
        計算方式：過去 24 個月該能力相關專案的頻次 × 規模加權　·　hover 顯示備註
      </p>
    </div>
  );
}
