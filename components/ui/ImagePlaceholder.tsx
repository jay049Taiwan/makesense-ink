"use client";

/**
 * 統一的圖片佔位元件 — 當資料尚無封面/產品照片時顯示
 * 品牌色漸層背景 + 小 icon，比空白 emoji 好看很多
 */
export default function ImagePlaceholder({
  type = "default",
  className = "",
}: {
  type?: "event" | "article" | "product" | "topic" | "space" | "market" | "default";
  className?: string;
}) {
  const icons: Record<string, string> = {
    event: "🎪",
    article: "📰",
    product: "📖",
    topic: "💡",
    space: "🏠",
    market: "🏷️",
    default: "✦",
  };
  const icon = icons[type] || icons.default;

  return (
    <div
      className={`w-full h-full flex items-center justify-center ${className}`}
      style={{
        background: "linear-gradient(135deg, #f5f0e8 0%, #e8dfd3 50%, #ddd4c4 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-1 opacity-30">
        <span className="text-3xl">{icon}</span>
        <span
          className="text-[10px] tracking-widest uppercase"
          style={{ fontFamily: "'Playfair Display', serif", color: "#7a5c40" }}
        >
          makesense
        </span>
      </div>
    </div>
  );
}
