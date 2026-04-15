"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/components/providers/CartProvider";
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

  // 載入推薦商品
  useEffect(() => {
    (async () => {
      // 你可能會喜歡 — 最新商品
      const { data: latest } = await supabase
        .from("products")
        .select("id, notion_id, name, price, images, author_id")
        .eq("status", "active")
        .gt("stock", 0)
        .or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位")
        .order("updated_at", { ascending: false })
        .limit(4);

      // 你應該感興趣 — 隨機 4 件（用不同排序模擬）
      const { data: random } = await supabase
        .from("products")
        .select("id, notion_id, name, price, images, author_id")
        .eq("status", "active")
        .gt("stock", 0)
        .or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位")
        .order("created_at", { ascending: true })
        .limit(4);

      const mapProduct = (p: any): ProductItem => {
        let photo: string | null = null;
        try { photo = JSON.parse(p.images || "[]")[0] || null; } catch {}
        return { id: p.notion_id || p.id, name: p.name, price: p.price, photo, slug: p.notion_id || p.id };
      };

      setRecommend1((latest || []).map(mapProduct));
      setRecommend2((random || []).map(mapProduct));
    })();
  }, []);

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
        setScanError(`找不到條碼「${code}」對應的商品`);
        setTimeout(() => setScanError(""), 3000);
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
