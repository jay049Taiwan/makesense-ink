"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface SectionCarouselProps {
  children: ReactNode;
  /** visible item width for scroll calculation (default 196 = 180+16) */
  itemWidth?: number;
}

export default function SectionCarousel({ children, itemWidth = 196 }: SectionCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateButtons = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateButtons();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateButtons, { passive: true });
    const ro = new ResizeObserver(updateButtons);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateButtons); ro.disconnect(); };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = itemWidth * 3;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      <div ref={trackRef} className="hscroll-track">
        {children}
      </div>
      {/* Left arrow */}
      {canPrev && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-opacity opacity-0 group-hover:opacity-100"
          style={{ background: "#fff", border: "1px solid #ddd", color: "#333" }}
          aria-label="向左捲動"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      {/* Right arrow */}
      {canNext && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-opacity opacity-0 group-hover:opacity-100"
          style={{ background: "#fff", border: "1px solid #ddd", color: "#333" }}
          aria-label="向右捲動"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}
    </div>
  );
}
