"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useDevRole } from "@/components/providers/DevRoleProvider";
import { supabase } from "@/lib/supabase";

interface ProductRow {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  category: string | null;
  status: string | null;
  photo_url: string | null;
  sold?: number;
  avgRating?: string | null;
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  上架中: { bg: "rgba(78,205,196,0.12)", color: "#3aa89f" },
  下架:   { bg: "#f5f0eb",              color: "#8C7A6A" },
  缺貨:   { bg: "#FDF0F0",              color: "#B85C5C" },
  預購中: { bg: "#FFF3E0",              color: "#C4864A" },
};

function StockBadge({ stock }: { stock: number | null }) {
  if (stock === null) return <span style={{ color: "var(--color-mist)" }}>—</span>;
  if (stock === 0) return <span style={{ color: "#B85C5C", fontWeight: 600 }}>缺貨</span>;
  if (stock <= 3) return <span style={{ color: "#C4864A", fontWeight: 600 }}>{stock}</span>;
  return <span style={{ color: "var(--color-ink)" }}>{stock}</span>;
}

export default function VendorProductsPage() {
  const { data: session } = useSession();
  const devRole = useDevRole();
  const isDev = process.env.NODE_ENV === "development";

  const email = isDev ? devRole.email : (session?.user?.email || "");
  const partnerName = isDev ? devRole.displayName : ((session as any)?.displayName || "");

  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!email) { setLoading(false); return; }

      // 查 Supabase：先找 partner，再查商品
      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("contact->>email" as any, email)
        .maybeSingle();

      if (partner?.id) {
        const { data } = await supabase
          .from("products")
          .select("id, name, price, stock, category, status, images")
          .eq("publisher_id", partner.id)
          .order("created_at", { ascending: false });

        setItems((data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          category: p.category,
          status: p.status === "active" ? (p.stock === 0 ? "缺貨" : "上架中") : "下架",
          photo_url: (() => { try { const imgs = JSON.parse(p.images || "[]"); return imgs[0] || null; } catch { return null; } })(),
        })));
      }

      setLoading(false);
    }

    load();
  }, [email]);

  if (loading) {
    return <p className="text-sm py-12 text-center" style={{ color: "var(--color-mist)" }}>載入中…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>商品管理</h2>
        <span className="text-sm" style={{ color: "var(--color-mist)" }}>
          {partnerName && `${partnerName}・`}{items.length} 項
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
          <p style={{ color: "var(--color-mist)" }}>尚未有商品上架</p>
          <p className="text-xs mt-2" style={{ color: "var(--color-mist)" }}>商品資料由現思團隊在 Notion 建立後自動同步</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-dust)" }}>
                {["商品名稱", "狀態", "售價", "庫存", "已售", "評分", "類型"].map((h) => (
                  <th key={h} className="text-left py-3 px-2 font-medium" style={{ color: "var(--color-mist)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const statusKey = item.status || "下架";
                const st = statusStyle[statusKey] || statusStyle["下架"];
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-dust)" }}>
                    <td className="py-3 px-2 font-medium" style={{ color: "var(--color-ink)" }}>
                      {item.photo_url && (
                        <img src={item.photo_url} alt="" className="inline-block w-7 h-7 rounded object-cover mr-2 align-middle" />
                      )}
                      {item.name}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                        {statusKey}
                      </span>
                    </td>
                    <td className="py-3 px-2" style={{ color: "var(--color-rust)" }}>
                      {item.price != null ? `NT$ ${item.price.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <StockBadge stock={item.stock} />
                    </td>
                    <td className="py-3 px-2" style={{ color: "var(--color-ink)" }}>
                      {item.sold ?? "—"}
                    </td>
                    <td className="py-3 px-2">
                      {item.avgRating
                        ? <span style={{ color: "#f5a623" }}>★ {item.avgRating}</span>
                        : <span style={{ color: "var(--color-mist)" }}>—</span>}
                    </td>
                    <td className="py-3 px-2" style={{ color: "var(--color-mist)" }}>
                      {item.category || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
