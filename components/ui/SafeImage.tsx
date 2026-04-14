"use client";

import { useState } from "react";
import ImagePlaceholder from "./ImagePlaceholder";

/**
 * 安全的圖片元件 — 載入失敗時自動 fallback 到 ImagePlaceholder
 * 用來取代所有 <img src={cover_url} /> 的地方
 */
export default function SafeImage({
  src,
  alt = "",
  className = "",
  placeholderType = "default",
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  placeholderType?: "event" | "article" | "product" | "topic" | "space" | "market" | "default";
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <ImagePlaceholder type={placeholderType} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className || "w-full h-full object-cover"}
      onError={() => setFailed(true)}
    />
  );
}
