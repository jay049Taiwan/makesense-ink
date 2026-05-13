"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

interface Props {
  item_type: string;
  item_id: string;
}

export default function InlineEngagement({ item_type, item_id }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userSaved, setUserSaved] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch(`/api/engagement?item_type=${item_type}&item_id=${encodeURIComponent(item_id)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setLikeCount(d.likeCount ?? 0);
        setUserLiked(d.userLiked ?? false);
        setUserSaved(d.userSaved ?? false);
      })
      .catch(() => {});
  }, [item_type, item_id]);

  const handleLike = useCallback(async () => {
    if (!session) { signIn(); return; }
    if (loadingLike) return;
    setLoadingLike(true);
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
      } else {
        setUserSaved(wasSaved);
      }
    } catch {
      setUserSaved(wasSaved);
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
        setShareMsg("已複製");
        setTimeout(() => setShareMsg(""), 2000);
      } catch {
        setShareMsg("失敗");
        setTimeout(() => setShareMsg(""), 2000);
      }
    }
  }, []);

  if (!mounted) return null;

  const btnStyle = (active: boolean, activeColor: string, activeBg: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    border: `1px solid ${active ? activeColor : "#ddd"}`,
    background: active ? activeBg : "transparent",
    color: active ? activeColor : "var(--color-bark)",
    cursor: "pointer",
    transition: "all 0.15s",
    userSelect: "none",
  });

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2 mb-3">
      {/* 按讚 */}
      <button
        onClick={handleLike}
        disabled={loadingLike}
        style={btnStyle(userLiked, "#e05a5a", "#fef2f2")}
        title={session ? (userLiked ? "取消按讚" : "按讚") : "登入後按讚"}
      >
        <span style={{ fontSize: 14 }}>{userLiked ? "❤️" : "🤍"}</span>
        <span>{likeCount > 0 ? likeCount : "按讚"}</span>
      </button>

      {/* 收藏 */}
      <button
        onClick={handleSave}
        disabled={loadingSave}
        style={btnStyle(userSaved, "var(--color-teal)", "#f0fdf9")}
        title={session ? (userSaved ? "取消收藏" : "收藏") : "登入後收藏"}
      >
        <span style={{ fontSize: 14 }}>{userSaved ? "🔖" : "📑"}</span>
        <span>{userSaved ? "已收藏" : "收藏"}</span>
      </button>

      {/* 分享 */}
      <button
        onClick={handleShare}
        style={btnStyle(false, "", "")}
        title="分享此頁面"
      >
        <span style={{ fontSize: 14 }}>📤</span>
        <span>{shareMsg || "分享"}</span>
      </button>
    </div>
  );
}
