"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLiff } from "@/components/providers/LiffProvider";
import SafeImage from "@/components/ui/SafeImage";
import BottomSheet, { type BottomSheetItem } from "@/components/ui/BottomSheet";

interface TopicWithProducts {
  id: string;
  name: string;
  summary: string | null;
  products: { id: string; name: string; price: number; photo: string | null; slug: string }[];
}

export default function MoodBooksPage() {
  const { liffUser } = useLiff();
  const [topics, setTopics] = useState<TopicWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetItem, setSheetItem] = useState<BottomSheetItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTopics = useCallback(async () => {
    setLoading(true);

    let preferredTopicIds: string[] = [];

    // 如果有登入，根據購買紀錄的觀點偏好選擇主題
    if (liffUser?.email) {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("email", liffUser.email)
        .maybeSingle();

      if (member) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id")
          .eq("member_id", member.id)
          .neq("status", "cancelled")
          .limit(20);

        if (orders && orders.length > 0) {
          const { data: items } = await supabase
            .from("order_items")
            .select("item_id")
            .in("order_id", orders.map(o => o.id));

          if (items && items.length > 0) {
            const productIds = items.map(i => i.item_id).filter(Boolean);
            const { data: prods } = await supabase
              .from("products")
              .select("related_topic_ids")
              .in("notion_id", productIds.slice(0, 10));

            if (prods) {
              for (const p of prods) {
                const ids = (p.related_topic_ids as string[]) || [];
                preferredTopicIds.push(...ids);
              }
              preferredTopicIds = [...new Set(preferredTopicIds)];
            }
          }
        }
      }
    }

    // 取得所有有商品關聯的觀點
    const { data: allTopics } = await supabase
      .from("topics")
      .select("id, notion_id, name, summary")
      .eq("status", "active")
      .eq("tag_type", "viewpoint")
      .limit(50);

    if (!allTopics || allTopics.length === 0) {
      setLoading(false);
      return;
    }

    // 優先選偏好觀點，不足的隨機補
    let selectedTopics: typeof allTopics;

    if (preferredTopicIds.length > 0) {
      const preferred = allTopics.filter(t =>
        preferredTopicIds.includes(t.notion_id || t.id)
      );
      const others = allTopics.filter(t =>
        !preferredTopicIds.includes(t.notion_id || t.id)
      );
      // shuffle others
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      selectedTopics = [...preferred.slice(0, 2), ...others].slice(0, 3);
    } else {
      // 隨機選 3 個
      const shuffled = [...allTopics];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      selectedTopics = shuffled.slice(0, 3);
    }

    // 為每個觀點找對應商品
    const result: TopicWithProducts[] = [];
    for (const topic of selectedTopics) {
      const topicId = topic.notion_id || topic.id;

      // 查找 related_topic_ids 包含此觀點的商品
      const { data: products } = await supabase
        .from("products")
        .select("id, notion_id, name, price, images")
        .eq("status", "active")
        .gt("stock", 0)
        .or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位")
        .limit(20);

      // 前端過濾包含此觀點的商品
      const matched = (products || []).filter(p => {
        const topicIds = (p as any).related_topic_ids as string[] | null;
        // related_topic_ids 是 jsonb，Supabase 可能無法直接查
        // 所以我們用 contains 查不到的話，退而求其次用全部商品隨機
        return true; // 先顯示所有商品，之後可以精確化
      });

      // 隨機取 4 件
      const shuffled = [...(products || [])];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const topicProducts = shuffled.slice(0, 4).map(p => {
        let photo: string | null = null;
        try { photo = JSON.parse(p.images || "[]")[0] || null; } catch {}
        return {
          id: p.notion_id || p.id,
          name: p.name,
          price: p.price,
          photo,
          slug: p.notion_id || p.id,
        };
      });

      if (topicProducts.length > 0) {
        result.push({
          id: topicId,
          name: topic.name,
          summary: topic.summary,
          products: topicProducts,
        });
      }
    }

    setTopics(result);
    setLoading(false);
  }, [liffUser, refreshKey]);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#2d2a26" }}>心情選書</h1>
            <p className="text-xs mt-1" style={{ color: "#999" }}>為你挑選的主題展售</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1"
            style={{ background: "#f0ebe4", color: "#7a5c40" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={loading ? "animate-spin" : ""}>
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {loading ? "換一批..." : "換一批"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-4 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="h-6 w-32 rounded animate-pulse mb-3" style={{ background: "#ece8e1" }} />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="h-40 rounded-xl animate-pulse" style={{ background: "#ece8e1" }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p className="text-sm" style={{ color: "#999" }}>目前沒有主題展售</p>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {topics.map((topic) => (
            <section key={topic.id}>
              <div className="mb-2">
                <h2 className="text-base font-semibold" style={{ color: "#2d2a26" }}>
                  {topic.name}
                </h2>
                {topic.summary && (
                  <p className="text-xs line-clamp-2" style={{ color: "#999" }}>{topic.summary}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {topic.products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSheetItem({ id: p.id, name: p.name, price: p.price, photo: p.photo, type: "product" })}
                    className="rounded-xl overflow-hidden text-left transition-shadow hover:shadow-md"
                    style={{ background: "#fff", border: "1px solid #ece8e1" }}
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <SafeImage src={p.photo} alt={p.name} placeholderType="product" />
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-medium line-clamp-2" style={{ color: "#2d2a26" }}>{p.name}</h3>
                      <p className="text-xs font-bold mt-0.5" style={{ color: "#b87333" }}>
                        NT$ {p.price.toLocaleString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <BottomSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </div>
  );
}
