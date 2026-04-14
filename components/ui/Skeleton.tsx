/**
 * 通用骨架屏元件 — 頁面載入時顯示
 */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "var(--color-dust)", opacity: 0.3 }}
    />
  );
}

/** 頁面級骨架：Hero + 卡片 grid */
export function PageSkeleton() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 py-8">
      {/* Hero */}
      <SkeletonBlock className="w-full aspect-[16/7] mb-8" />
      {/* Title */}
      <SkeletonBlock className="w-48 h-8 mb-4" />
      <SkeletonBlock className="w-96 h-4 mb-8" />
      {/* Cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <SkeletonBlock className="w-full aspect-[4/3] mb-2" />
            <SkeletonBlock className="w-3/4 h-4 mb-1" />
            <SkeletonBlock className="w-1/2 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 文章詳情骨架 */
export function ArticleSkeleton() {
  return (
    <div className="w-full max-w-[800px] mx-auto px-4 py-8">
      <SkeletonBlock className="w-full aspect-[16/9] mb-6" />
      <SkeletonBlock className="w-2/3 h-8 mb-3" />
      <SkeletonBlock className="w-1/3 h-4 mb-8" />
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonBlock key={i} className="w-full h-4 mb-3" />
      ))}
    </div>
  );
}

/** Dashboard 骨架 */
export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 py-8">
      <SkeletonBlock className="w-full h-24 mb-6 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <SkeletonBlock className="w-full h-64 rounded-lg" />
    </div>
  );
}
