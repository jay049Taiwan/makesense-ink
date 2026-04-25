"use client";

import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  notionId?: string | null;
  ended?: boolean;
  size?: "sm" | "md";
  fullWidth?: boolean;
}

export default function QuickBookButton({ slug, notionId, ended, size = "sm", fullWidth = true }: Props) {
  const router = useRouter();
  const padY = size === "sm" ? 7 : 10;
  const padX = size === "sm" ? 10 : 14;
  const fontSize = size === "sm" ? 12 : 13;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: `${padY}px ${padX}px`,
    fontSize,
    fontWeight: 500,
    cursor: ended ? "not-allowed" : "pointer",
    transition: "background 180ms",
    border: "none",
    borderRadius: 6,
    width: fullWidth ? "100%" : undefined,
    whiteSpace: "nowrap",
  };

  function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (ended) return;
    const target = notionId || slug;
    router.push(`/events/${target}#booking`);
  }

  if (ended) {
    return (
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} style={{
        ...baseStyle,
        background: "rgba(122,92,64,0.08)",
        color: "var(--color-mist, #b89e7a)",
      }}>
        已結束
      </button>
    );
  }

  return (
    <button type="button" onClick={handle} style={{
      ...baseStyle,
      background: "#e8935a",
      color: "#fff",
    }}>
      立即報名 →
    </button>
  );
}
