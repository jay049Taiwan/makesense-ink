"use client";

import { useEffect, useState } from "react";
import { getLiffAccessToken } from "@/lib/liff";
import SafeImage from "@/components/ui/SafeImage";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  sub_category?: string;
  photo: string | null;
  status: string;
  sold30d: number;
  revenue30d: number;
}

function StockBadge({ stock }: { stock: number }) {
  let bg = "#e6f7e6";
  let color = "#1e7d1e";
  let label = "充足";
  if (stock <= 0) {
    bg = "#fde0e0";
    color = "#c0392b";
    label = "無庫存";
  } else if (stock <= 5) {
    bg = "#fff3e0";
    color = "#e65100";
    label = `剩 ${stock}`;
  } else {
    label = `${stock}`;
  }
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color }}>
      {label}
    </span>
  );
}

export default function LiffPartnerProductsPage() {
  const [data, setData] = useState<{ partner: any; products: Product[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = getLiffAccessToken();
      if (!token) {
        setError("請從 LINE 開啟此頁面");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/liff/partner/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: token }),
        });
        const j = await res.json();
        if (!j.ok) setError(j.message || "載入失敗");
        else if (!j.partner) setError("您尚未綁定為合作廠商");
        else setData(j);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="px-4 pt-4 pb-24 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#ece8e1" }} />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="px-4 pt-12 text-center" style={{ minHeight: "100vh" }}>
        <p className="text-base font-semibold" style={{ color: "#2d2a26" }}>{error}</p>
      </div>
    );
  if (!data) return null;

  const lowStock = data.products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStock = data.products.filter((p) => p.stock <= 0).length;

  return (
    <div className="pb-24" style={{ background: "#faf8f4", minHeight: "100vh" }}>
      <div className="px-4 pt-5 pb-3" style={{ background: "#fff", borderBottom: "1px solid #ece8e1" }}>
        <a href="/liff/partner/dashboard" className="text-xs" style={{ color: "#7a5c40" }}>← 返回概覽</a>
        <h1 className="text-lg font-bold mt-1" style={{ color: "#2d2a26" }}>我的商品</h1>
        <p className="text-xs mt-1" style={{ color: "#999" }}>
          共 {data.products.length} 件
          {lowStock > 0 && <span style={{ color: "#e65100" }}> · 低庫存 {lowStock}</span>}
          {outOfStock > 0 && <span style={{ color: "#c0392b" }}> · 缺貨 {outOfStock}</span>}
        </p>
      </div>

      <div className="px-4 mt-3 space-y-2">
        {data.products.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "#fff", border: "1px solid #ece8e1" }}>
            <p className="text-sm" style={{ color: "#999" }}>還沒有商品</p>
          </div>
        ) : (
          data.products.map((p) => (
            <a
              key={p.id}
              href={`/product/${p.id}?liff_mode=true`}
              className="flex gap-3 p-3 rounded-xl"
              style={{ background: "#fff", border: "1px solid #ece8e1" }}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                <SafeImage src={p.photo} alt={p.name} placeholderType="product" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className="text-sm font-medium line-clamp-2 flex-1" style={{ color: "#2d2a26" }}>
                    {p.name}
                  </p>
                  <StockBadge stock={p.stock} />
                </div>
                <p className="text-xs mt-1" style={{ color: "#b87333" }}>
                  NT$ {p.price?.toLocaleString()}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "#666" }}>
                  30 天售出 {p.sold30d} · 營收 ${p.revenue30d.toLocaleString()}
                </p>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
