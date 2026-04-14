"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <main
      className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center"
      style={{ background: "var(--color-parchment)" }}
    >
      <p
        className="text-[4rem] mb-2"
        style={{ color: "var(--color-dust)" }}
      >
        :(
      </p>
      <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-ink)" }}>
        頁面載入發生錯誤
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-mist)" }}>
        請稍後再試，或回到首頁重新開始。
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--color-brown)" }}
        >
          重新載入
        </button>
        <a
          href="/"
          className="px-6 py-2.5 rounded-lg text-sm font-medium"
          style={{ border: "1px solid var(--color-dust)", color: "var(--color-brown)" }}
        >
          回首頁
        </a>
      </div>
    </main>
  );
}
