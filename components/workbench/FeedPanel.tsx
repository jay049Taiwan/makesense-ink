"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { staffFetch } from "@/lib/staff-fetch";

// ─── Types ───────────────────────────────────────────────────────────────────

type FeedType = "announcement" | "ai_reporter" | "external_ref" | "progress_report";

interface FeedItem {
  id: string;
  type: FeedType;
  title: string;
  content: string;
  source_url: string | null;
  created_at: string;
  published_at: string;
  created_by: string | null;
  related_notion_id: string | null;
  metadata: Record<string, unknown>;
  is_pinned: boolean;
  is_read: boolean;
}

type FilterTab = "all" | FeedType;

export interface FeedPanelProps {
  isAdmin?: boolean;
  memberId?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "announcement", label: "公告" },
  { key: "ai_reporter", label: "AI報導" },
  { key: "external_ref", label: "外部參考" },
  { key: "progress_report", label: "特派報導" },
];

const TYPE_CONFIG: Record<
  FeedType,
  { badge: string; color: string; bg: string; border: string }
> = {
  announcement: {
    badge: "📢 公告",
    color: "#92400e",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  ai_reporter: {
    badge: "🤖 AI報導",
    color: "#0c4a6e",
    bg: "#f0f9ff",
    border: "#bae6fd",
  },
  external_ref: {
    badge: "🔗 外部參考",
    color: "#4c1d95",
    bg: "#faf5ff",
    border: "#ddd6fe",
  },
  progress_report: {
    badge: "⚠️ 特派報導",
    color: "#7c2d12",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 個月前`;
  return `${Math.floor(months / 12)} 年前`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: FeedType }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <span
      className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.badge}
    </span>
  );
}

function FeedCard({
  item,
  onMarkRead,
}: {
  item: FeedItem;
  onMarkRead: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[item.type];
  const isAnnouncement = item.type === "announcement";
  const showUnread = isAnnouncement && !item.is_read;

  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        position: "relative",
      }}
    >
      {/* Unread dot */}
      {showUnread && (
        <span
          className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
          style={{ background: "#ef4444" }}
        />
      )}

      <div className="flex items-start gap-2 mb-2">
        <TypeBadge type={item.type} />
        <span className="text-xs ml-auto" style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>
          {formatRelativeTime(item.published_at)}
        </span>
      </div>

      {/* Title */}
      <p
        className="font-semibold text-sm mb-1"
        style={{
          color: cfg.color,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {item.title}
      </p>

      {/* Content preview */}
      {item.content && (
        <p
          className="text-sm"
          style={{
            color: "#374151",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.content}
        </p>
      )}

      {/* Source URL */}
      {item.source_url && (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs underline"
          style={{ color: cfg.color }}
        >
          查看來源 →
        </a>
      )}

      {/* Mark as read button */}
      {showUnread && (
        <div className="mt-3">
          <button
            onClick={() => onMarkRead(item.id)}
            className="text-xs px-3 py-1 rounded-lg"
            style={{
              background: "#7a5c40",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            ✓ 已讀
          </button>
        </div>
      )}
    </div>
  );
}

// Pinned unread announcements banner at top
function PinnedAnnouncements({
  items,
  onMarkRead,
}: {
  items: FeedItem[];
  onMarkRead: (id: string) => void;
}) {
  const unread = items.filter((i) => i.type === "announcement" && !i.is_read);
  if (unread.length === 0) return null;

  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 px-1 mb-2"
      >
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
          style={{ background: "#ef4444", color: "#fff" }}
        >
          {unread.length}
        </span>
        <span className="text-xs font-semibold" style={{ color: "#92400e" }}>
          未讀公告
        </span>
      </div>
      {unread.map((item) => (
        <FeedCard key={item.id} item={item} onMarkRead={onMarkRead} />
      ))}
    </div>
  );
}

// Post announcement inline form
function PostAnnouncementForm({ onPosted }: { onPosted: (item: FeedItem) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("標題不能空白");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await staffFetch("/api/workbench/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "發送失敗");
      setTitle("");
      setContent("");
      setOpen(false);
      onPosted(json.item as FeedItem);
    } catch (err: any) {
      setError(err?.message || "未知錯誤");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm py-2.5 rounded-xl mb-4"
        style={{
          background: "#7a5c40",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        ＋ 發公告
      </button>
    );
  }

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
    >
      <p className="text-sm font-bold mb-3" style={{ color: "#92400e" }}>
        📢 新增公告
      </p>
      <input
        type="text"
        placeholder="公告標題（必填）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-sm rounded-lg px-3 py-2 mb-2 outline-none"
        style={{ border: "1px solid #fde68a", background: "#fff", color: "#333" }}
      />
      <textarea
        placeholder="公告內容（選填）"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full text-sm rounded-lg px-3 py-2 mb-2 outline-none resize-none"
        style={{ border: "1px solid #fde68a", background: "#fff", color: "#333" }}
      />
      {error && (
        <p className="text-xs mb-2" style={{ color: "#ef4444" }}>
          ⚠️ {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 text-sm py-2 rounded-lg"
          style={{
            background: submitting ? "#d1c5bb" : "#7a5c40",
            color: "#fff",
            border: "none",
            cursor: submitting ? "wait" : "pointer",
            fontWeight: 600,
          }}
        >
          {submitting ? "發送中…" : "發送公告"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setTitle("");
            setContent("");
            setError("");
          }}
          className="text-sm px-4 py-2 rounded-lg"
          style={{
            background: "transparent",
            color: "#92400e",
            border: "1px solid #fde68a",
            cursor: "pointer",
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FeedPanel({ isAdmin = false, memberId }: FeedPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvedMemberId, setResolvedMemberId] = useState<string | null>(memberId ?? null);

  // Intersection Observer sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchFeed = useCallback(
    async (cursor: string | null, filter: FilterTab, replace: boolean) => {
      if (loading) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (filter !== "all") params.set("type", filter);
        if (cursor) params.set("cursor", cursor);

        const res = await staffFetch(`/api/workbench/feed?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "載入失敗");

        const fetched = (json.items || []) as FeedItem[];
        if (replace) {
          setItems(fetched);
        } else {
          setItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const fresh = fetched.filter((i) => !existingIds.has(i.id));
            return [...prev, ...fresh];
          });
        }
        setNextCursor(json.nextCursor ?? null);
        if (json.memberId && !resolvedMemberId) {
          setResolvedMemberId(json.memberId);
        }
      } catch (err: any) {
        setError(err?.message || "未知錯誤");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, resolvedMemberId]
  );

  // Initial load + filter change
  useEffect(() => {
    setInitialLoading(true);
    setItems([]);
    setNextCursor(null);
    fetchFeed(null, activeFilter, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loading) {
          fetchFeed(nextCursor, activeFilter, false);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, loading, activeFilter]);

  // Mark announcement as read
  const handleMarkRead = useCallback(async (itemId: string) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_read: true } : i))
    );

    try {
      const res = await staffFetch(`/api/workbench/feed/${itemId}/read`, {
        method: "POST",
      });
      if (!res.ok) {
        // Revert on failure
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, is_read: false } : i))
        );
      }
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, is_read: false } : i))
      );
    }
  }, []);

  // Prepend new announcement after posting
  const handlePosted = useCallback((newItem: FeedItem) => {
    setItems((prev) => [{ ...newItem, is_read: false }, ...prev]);
  }, []);

  // Separate pinned unread announcements from rest
  const unreadAnnouncements = items.filter(
    (i) => i.type === "announcement" && !i.is_read && i.is_pinned
  );
  const regularItems =
    activeFilter === "all"
      ? items.filter((i) => !(i.type === "announcement" && !i.is_read && i.is_pinned))
      : items;

  return (
    <div style={{ background: "#faf8f5", minHeight: "60vh" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ background: "#faf8f5", borderBottom: "1px solid #e8e0d4" }}
      >
        <p className="text-sm font-bold" style={{ color: "#7a5c40" }}>
          動態 {items.length > 0 ? `(${items.length})` : ""}
        </p>
        <button
          onClick={() => {
            setInitialLoading(true);
            setItems([]);
            setNextCursor(null);
            fetchFeed(null, activeFilter, true);
          }}
          disabled={loading}
          className="text-xs px-2 py-1 rounded"
          style={{
            color: "#7a5c40",
            background: "transparent",
            border: "1px solid #c4a882",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "…" : "🔄 更新"}
        </button>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-1 px-4 py-2 overflow-x-auto"
        style={{ borderBottom: "1px solid #e8e0d4" }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: activeFilter === tab.key ? "#7a5c40" : "#fff",
              color: activeFilter === tab.key ? "#fff" : "#7a5c40",
              border: `1px solid ${activeFilter === tab.key ? "#7a5c40" : "#c4a882"}`,
              cursor: "pointer",
              fontWeight: activeFilter === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-8">
        {/* Admin: post announcement button */}
        {isAdmin && <PostAnnouncementForm onPosted={handlePosted} />}

        {/* Pinned unread announcements (shown only in 全部 / 公告 tabs) */}
        {(activeFilter === "all" || activeFilter === "announcement") && (
          <PinnedAnnouncements items={unreadAnnouncements} onMarkRead={handleMarkRead} />
        )}

        {/* Main list */}
        {initialLoading ? (
          <p className="text-sm text-center py-10" style={{ color: "#9ca3af" }}>
            載入中…
          </p>
        ) : error ? (
          <p className="text-sm py-4" style={{ color: "#ef4444" }}>
            ⚠️ 載入失敗：{error}
          </p>
        ) : regularItems.length === 0 && unreadAnnouncements.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: "#9ca3af" }}>
            目前沒有動態
          </p>
        ) : (
          regularItems.map((item) => (
            <FeedCard key={item.id} item={item} onMarkRead={handleMarkRead} />
          ))
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {/* Loading more indicator */}
        {loading && !initialLoading && (
          <p className="text-xs text-center py-4" style={{ color: "#9ca3af" }}>
            載入更多…
          </p>
        )}

        {/* End of list */}
        {!loading && !nextCursor && items.length > 0 && (
          <p className="text-xs text-center py-2" style={{ color: "#c4b5a0" }}>
            已顯示全部動態
          </p>
        )}
      </div>
    </div>
  );
}
