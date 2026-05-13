"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

// ── 排除清單：這些路徑不顯示 EngagementBar ──
const EXCLUDED_PREFIXES = [
  "/checkout", "/dashboard", "/liff", "/dev", "/buy", "/telegram",
  "/login", "/privacy", "/terms",
];
const EXCLUDED_EXACT = [
  "/", "/bookstore", "/cultureclub", "/sense",
  "/market-booking", "/reading-tour", "/space-experience", "/content-curation",
];

function shouldShow(pathname: string): boolean {
  // 去掉 locale 前綴 (/en /ja /ko)
  const path = pathname.replace(/^\/(en|ja|ko)(?=\/|$)/, "") || "/";
  if (EXCLUDED_EXACT.includes(path)) return false;
  if (EXCLUDED_PREFIXES.some(p => path.startsWith(p))) return false;
  return true;
}

// 從 path 解析 item_type / item_id
function resolveItem(pathname: string): { item_type: string; item_id: string } {
  const path = pathname.replace(/^\/(en|ja|ko)(?=\/|$)/, "") || "/";
  const post = path.match(/^\/post\/([^/]+)/);
  if (post) return { item_type: "article", item_id: post[1] };
  const event = path.match(/^\/events\/([^/]+)/);
  if (event) return { item_type: "event", item_id: event[1] };
  const product = path.match(/^\/product\/([^/]+)/);
  if (product) return { item_type: "product", item_id: product[1] };
  const viewpoint = path.match(/^\/viewpoint\/([^/]+)/);
  if (viewpoint) return { item_type: "topic", item_id: viewpoint[1] };
  return { item_type: "page", item_id: path };
}

export default function EngagementBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [lift, setLift] = useState(0);

  const [likeCount, setLikeCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userSaved, setUserSaved] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  const { item_type, item_id } = resolveItem(pathname);

  // Footer 推升效果（同 FloatingActions 邏輯）
  useEffect(() => {
    setMounted(true);
    const update = () => {
      const footer = document.querySelector("footer");
      if (!footer) return;
      const rect = footer.getBoundingClientRect();
      const vh = window.innerHeight;
      const overlap = Math.max(0, vh - rect.top);
      setLift(overlap > 0 ? overlap + 4 : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // 每次路徑變更時拉資料
  useEffect(() => {
    if (!shouldShow(pathname)) return;
    fetch(`/api/engagement?item_type=${item_type}&item_id=${encodeURIComponent(item_id)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setLikeCount(d.likeCount ?? 0);
        setSaveCount(d.saveCount ?? 0);
        setUserLiked(d.userLiked ?? false);
        setUserSaved(d.userSaved ?? false);
      })
      .catch(() => {});
  }, [pathname, item_type, item_id]);

  const handleLike = useCallback(async () => {
    if (!session) { signIn(); return; }
    if (loadingLike) return;
    setLoadingLike(true);
    // 樂觀更新
    const wasLiked = userLiked;
    setUserLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    try {
      const res = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", item_type, item_id }),
      });
      const data = await res.json();
      if (data.ok) {
        setUserLiked(data.state);
        setLikeCount(data.count);
      } else {
        // 回滾
        setUserLiked(wasLiked);
        setLikeCount(c => wasLiked ? c + 1 : c - 1);
      }
    } catch {
      setUserLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : c - 1);
    } finally {
      setLoadingLike(false);
    }
  }, [session, loadingLike, userLiked, item_type, item_id]);

  const handleSave = useCallback(async () => {
    if (!session) { signIn(); return; }
    if (loadingSave) return;
    setLoadingSave(true);
    const wasSaved = userSaved;
    setUserSaved(!wasSaved);
    setSaveCount(c => wasSaved ? c - 1 : c + 1);
    try {
      const title = typeof document !== "undefined" ? document.title : "";
      const res = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save", item_type, item_id,
          item_title: title,
          item_path: pathname,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setUserSaved(data.state);
        setSaveCount(data.count);
      } else {
        setUserSaved(wasSaved);
        setSaveCount(c => wasSaved ? c + 1 : c - 1);
      }
    } catch {
      setUserSaved(wasSaved);
      setSaveCount(c => wasSaved ? c + 1 : c - 1);
    } finally {
      setLoadingSave(false);
    }
  }, [session, loadingSave, userSaved, item_type, item_id, pathname]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = document.title;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareMsg("已複製連結");
        setTimeout(() => setShareMsg(""), 2000);
      } catch {
        setShareMsg("複製失敗");
        setTimeout(() => setShareMsg(""), 2000);
      }
    }
  }, []);

  if (!mounted || !shouldShow(pathname)) return null;

  const barStyle: React.CSSProperties = {
    transform: `translateY(-${lift}px)`,
    transition: "transform 0.18s ease-out",
    background: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(8px)",
    borderTop: "1px solid #ede8e0",
  };

  const btnBase = "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 select-none";

  const buttons = (
    <div className="flex items-center justify-center gap-2">
      {/* 按讚 */}
      <button
        onClick={handleLike}
        disabled={loadingLike}
        className={btnBase}
        style={{
          color: userLiked ? "#e05a5a" : "var(--color-bark)",
          background: userLiked ? "#fef2f2" : "transparent",
          border: `1px solid ${userLiked ? "#fca5a5" : "#ddd"}`,
        }}
        title={session ? (userLiked ? "取消按讚" : "按讚") : "登入後按讚"}
      >
        <span style={{ fontSize: 16 }}>{userLiked ? "❤️" : "🤍"}</span>
        <span>{likeCount > 0 ? likeCount : "按讚"}</span>
      </button>

      {/* 收藏 */}
      <button
        onClick={handleSave}
        disabled={loadingSave}
        className={btnBase}
        style={{
          color: userSaved ? "var(--color-teal)" : "var(--color-bark)",
          background: userSaved ? "#f0fdf9" : "transparent",
          border: `1px solid ${userSaved ? "#99f6e4" : "#ddd"}`,
        }}
        title={session ? (userSaved ? "取消收藏" : "收藏") : "登入後收藏"}
      >
        <span style={{ fontSize: 16 }}>{userSaved ? "🔖" : "📑"}</span>
        <span>{userSaved ? "已收藏" : "收藏"}</span>
      </button>

      {/* 分享 */}
      <button
        onClick={handleShare}
        className={btnBase}
        style={{ color: "var(--color-bark)", border: "1px solid #ddd" }}
        title="分享此頁面"
      >
        <span style={{ fontSize: 16 }}>📤</span>
        <span>{shareMsg || "分享"}</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile: fixed sticky bar，底部跟 footer 推升 */}
      <div
        className="md:hidden fixed left-0 right-0 z-30 py-2 px-4"
        style={{ bottom: 0, ...barStyle }}
      >
        {/* 右側預留空間給 LINE + 購物車浮動鈕（寬 80px） */}
        <div style={{ paddingRight: 80 }}>
          {buttons}
        </div>
      </div>
      {/* Mobile spacer（防止頁面內容被 fixed bar 遮住） */}
      <div className="md:hidden h-14" />

      {/* Desktop: inline bar（在 main 跟 footer 之間） */}
      <div
        className="hidden md:block py-4 px-6"
        style={{ borderTop: "1px solid #ede8e0", background: "#faf9f7" }}
      >
        {buttons}
      </div>
    </>
  );
}
