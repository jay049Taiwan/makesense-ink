"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/components/providers/CartProvider";
import { useLiff } from "@/components/providers/LiffProvider";
import SafeImage from "@/components/ui/SafeImage";
import BottomSheet, { type BottomSheetItem } from "@/components/ui/BottomSheet";
import BarcodeScanner from "@/components/liff/BarcodeScanner";

interface ProductItem {
  id: string;
  name: string;
  price: number;
  photo: string | null;
  slug: string;
  author?: string;
}

function ProductCard({ item, onTap }: { item: ProductItem; onTap: (item: ProductItem) => void }) {
  return (
    <button
      onClick={() => onTap(item)}
      className="rounded-xl overflow-hidden text-left w-full transition-shadow hover:shadow-md"
      style={{ background: "#fff", border: "1px solid #ece8e1" }}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <SafeImage src={item.photo} alt={item.name} placeholderType="product" />
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-2" style={{ color: "#2d2a26" }}>{item.name}</h3>
        {item.author && item.author !== "—" && (
          <p className="text-xs mt-0.5" style={{ color: "#999" }}>{item.author}</p>
        )}
        <p className="text-sm font-bold mt-1" style={{ color: "#b87333" }}>
          NT$ {item.price.toLocaleString()}
        </p>
      </div>
    </button>
  );
}

export default function LiffShopPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [recommend1, setRecommend1] = useState<ProductItem[]>([]);
  const [recommend2, setRecommend2] = useState<ProductItem[]>([]);
  const [sheetItem, setSheetItem] = useState<BottomSheetItem | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState("");
  const { addItem } = useCart();
  const { liffUser } = useLiff();

  const mapProduct = (p: any): ProductItem => {
    let photo: string | null = null;
    try { photo = JSON.parse(p.images || "[]")[0] || null; } catch {}
    return { id: p.notion_id || p.id, name: p.name, price: p.price, photo, slug: p.notion_id || p.id };
  };

  // 載入推薦商品（個人化）
  useEffect(() => {
    (async () => {
      let purchasedIds: string[] = [];
      let preferredCategory = "";
      let relatedTopicIds: string[] = [];

      // 如果有登入，查購買紀錄做個人化推薦
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
            const orderIds = orders.map(o => o.id);
            const { data: items } = await supabase
              .from("order_items")
              .select("item_id, meta")
              .in("order_id", orderIds);

            if (items && items.length > 0) {
              purchasedIds = items.map(i => i.item_id).filter(Boolean);

              // 統計購買類別偏好
              const categories: Record<string, number> = {};
              for (const item of items) {
                const cat = (item.meta as any)?.category || "";
                if (cat) categories[cat] = (categories[cat] || 0) + 1;
              }
              // 找最常買的類別
              const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
              if (sorted.length > 0) preferredCategory = sorted[0][0];
            }

            // 查購買商品的相關觀點
            if (purchasedIds.length > 0) {
              const { data: prods } = await supabase
                .from("products")
                .select("related_topic_ids")
                .in("notion_id", purchasedIds.slice(0, 10));

              if (prods) {
                for (const p of prods) {
                  const topics = (p.related_topic_ids as string[]) || [];
                  relatedTopicIds.push(...topics);
                }
                relatedTopicIds = [...new Set(relatedTopicIds)];
              }
            }
          }
        }
      }

      // 「你可能會喜歡」— 偏好類別優先，否則最新
      let query1 = supabase
        .from("products")
        .select("id, notion_id, name, price, images, author_id, category")
        .eq("status", "active")
        .gt("stock", 0)
        .or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位");

      if (preferredCategory) {
        query1 = query1.eq("category", preferredCategory);
      }

      const { data: rec1 } = await query1
        .order("updated_at", { ascending: false })
        .limit(8);

      // 排除已買過的
      const filtered1 = (rec1 || [])
        .filter(p => !purchasedIds.includes(p.notion_id || p.id))
        .slice(0, 4);

      // 如果偏好類別不夠 4 件，補最新商品
      if (filtered1.length < 4) {
        const { data: fallback } = await supabase
          .from("products")
          .select("id, notion_id, name, price, images, author_id")
          .eq("status", "active")
          .gt("stock", 0)
          .or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位")
          .order("updated_at", { ascending: false })
          .limit(8);

        const existingIds = new Set(filtered1.map(p => p.notion_id || p.id));
        const extra = (fallback || [])
          .filter(p => !purchasedIds.includes(p.notion_id || p.id) && !existingIds.has(p.notion_id || p.id))
          .slice(0, 4 - filtered1.length);
        filtered1.push(...extra);
      }

      setRecommend1(filtered1.map(mapProduct));

      // 「你應該感興趣」— 同觀點商品優先，否則隨機
      if (relatedTopicIds.length > 0) {
        const { data: topicProds } = await supabase
          .from("products")
          .select("id, notion_id, name, price, images, author_id, related_topic_ids")
          .eq("status", "active")
          .gt("stock", 0)
          .or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位")
          .limit(20);

        const matched = (topicProds || [])
          .filter(p => {
            if (purchasedIds.includes(p.notion_id || p.id)) return false;
            const topics = (p.related_topic_ids as string[]) || [];
            return topics.some(t => relatedTopicIds.includes(t));
          })
          .slice(0, 4);

        if (matched.length > 0) {
          setRecommend2(matched.map(mapProduct));
          return;
        }
      }

      // Fallback: 用不同排序
      const { data: random } = await supabase
        .from("products")
        .select("id, notion_id, name, price, images, author_id")
        .eq("status", "active")
        .gt("stock", 0)
        .or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位")
        .order("created_at", { ascending: true })
        .limit(8);

      const rec1Ids = new Set(filtered1.map(p => p.notion_id || p.id));
      const filtered2 = (random || [])
        .filter(p => !purchasedIds.includes(p.notion_id || p.id) && !rec1Ids.has(p.notion_id || p.id))
        .slice(0, 4);
      setRecommend2(filtered2.map(mapProduct));
    })();
  }, [liffUser]);

  // 搜尋
  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search-index?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSearchResults((data.products || []).map((p: any) => ({
        id: p.slug, name: p.name, price: p.price, photo: p.photo, slug: p.slug,
      })));
    } catch {} finally { setSearching(false); }
  }, []);

  // 搜尋防抖
  useEffect(() => {
    const timer = setTimeout(() => { if (query) handleSearch(query); }, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // 條碼掃描結果
  const handleBarcodeScan = async (code: string) => {
    setShowScanner(false);
    setScanError("");
    setSearching(true);
    try {
      const res = await fetch(`/api/barcode-lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.product) {
        setSheetItem({
          id: data.product.slug, name: data.product.name, price: data.product.price,
          photo: data.product.photo, type: "product",
        });
      } else {
        // 掃到條碼但找不到商品 — 提示並自動帶入搜尋
        const scanned = data.scannedCode || code;
        setScanError(`條碼「${scanned}」尚未建檔，請嘗試用名稱搜尋`);
        setTimeout(() => setScanError(""), 5000);
      }
    } catch { setScanError("查詢失敗，請再試一次"); setTimeout(() => setScanError(""), 3000); }
    finally { setSearching(false); }
  };

  const openSheet = (item: ProductItem) => {
    setSheetItem({ id: item.id, name: item.name, price: item.price, photo: item.photo, type: "product" });
  };

  const isShowingSearch = query.trim().length > 0;

  return (
    <div className="pb-4">
      {/* 頂部搜尋列 */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: "#f8f7f4" }}>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋書籍、選物..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "#fff", border: "1px solid #ece8e1", color: "#2d2a26" }}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 rounded-xl flex items-center justify-center"
            style={{ background: "#7a5c40", color: "#fff" }}
            title="掃描條碼"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>
        {scanError && (
          <p className="text-xs mt-2 px-1" style={{ color: "#e74c3c" }}>{scanError}</p>
        )}
      </div>

      {/* 條碼掃描器 */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* 搜尋結果 */}
      {isShowingSearch ? (
        <div className="px-4 mt-2">
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {searchResults.map((item) => (
                <ProductCard key={item.id} item={item} onTap={openSheet} />
              ))}
            </div>
          ) : !searching && (
            <p className="text-center text-sm py-8" style={{ color: "#999" }}>
              找不到「{query}」相關商品
            </p>
          )}
        </div>
      ) : (
        /* 推薦區 */
        <div className="px-4 mt-2 space-y-6">
          {/* 你可能會喜歡 */}
          {recommend1.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3" style={{ color: "#2d2a26" }}>
                你可能會喜歡
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {recommend1.map((item) => (
                  <ProductCard key={item.id} item={item} onTap={openSheet} />
                ))}
              </div>
            </section>
          )}

          {/* 你應該感興趣 */}
          {recommend2.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3" style={{ color: "#2d2a26" }}>
                你應該感興趣
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {recommend2.map((item) => (
                  <ProductCard key={item.id} item={item} onTap={openSheet} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <BottomSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </div>
  );
}
