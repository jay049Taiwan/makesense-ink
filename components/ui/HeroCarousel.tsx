"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

export interface HeroSlide {
  image: string | null;
  title: string;
  subtitle?: string;
  cta?: { text: string; href: string };
}

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const len = slides.length;

  const next = useCallback(() => setCurrent((i) => (i + 1) % len), [len]);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + len) % len), [len]);

  // Auto-play every 5 seconds
  useEffect(() => {
    if (len <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, len]);

  if (len === 0) return null;

  const slide = slides[current];

  return (
    <section className="relative rounded-lg overflow-hidden" style={{ height: 360 }}>
      {/* Background */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          background: slide.image
            ? `url(${slide.image}) center/cover no-repeat`
            : "linear-gradient(135deg, #f2ede6, #e8e0d4)",
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 60%)" }} />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-8 sm:p-12">
        <h2
          className="text-2xl sm:text-3xl font-bold mb-2"
          style={{ color: "#fff", fontFamily: "var(--font-serif)", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
        >
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="text-sm sm:text-base mb-4" style={{ color: "rgba(255,255,255,0.85)" }}>
            {slide.subtitle}
          </p>
        )}
        {slide.cta && (
          <Link
            href={slide.cta.href}
            className="inline-flex items-center justify-center h-10 px-6 rounded text-sm font-medium transition-colors"
            style={{ background: "#4ECDC4", color: "#fff", width: "fit-content" }}
          >
            {slide.cta.text}
          </Link>
        )}
      </div>

      {/* Arrows */}
      {len > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.7)", color: "#333" }}
            aria-label="上一張"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.7)", color: "#333" }}
            aria-label="下一張"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}

      {/* Dots */}
      {len > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === current ? "#fff" : "rgba(255,255,255,0.4)" }}
              aria-label={`第 ${i + 1} 張`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
