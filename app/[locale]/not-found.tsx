import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "找不到頁面",
};

export default function NotFound() {
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center"
      style={{ background: "var(--color-parchment)" }}
    >
      <p
        className="text-[6rem] font-bold leading-none mb-2"
        style={{ color: "var(--color-dust)", fontFamily: "'Playfair Display', serif" }}
      >
        404
      </p>
      <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-ink)" }}>
        找不到這個頁面
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-mist)" }}>
        頁面可能已被移除，或者網址有誤。
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--color-brown)" }}
        >
          回首頁
        </Link>
        <Link
          href="/bookstore"
          className="px-6 py-2.5 rounded-lg text-sm font-medium"
          style={{ border: "1px solid var(--color-dust)", color: "var(--color-brown)" }}
        >
          逛書店
        </Link>
      </div>
    </main>
  );
}
