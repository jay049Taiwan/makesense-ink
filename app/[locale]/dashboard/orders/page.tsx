"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useDevRole } from "@/components/providers/DevRoleProvider";

interface OrderItem {
  id: string;
  orderId: string;
  itemType: string;
  name: string;
  subtitle: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  createdAt: string;
  orderStatus: string;
}

const typeTabs = ["全部", "商品", "活動", "其他"] as const;
type Tab = (typeof typeTabs)[number];

// item_type 分類判斷
function bucketOf(itemType: string): "商品" | "活動" | "其他" {
  if (["product", "書籍", "商品"].includes(itemType)) return "商品";
  if (["event", "走讀", "講座", "市集", "空間", "諮詢"].includes(itemType)) return "活動";
  return "其他";
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return iso;
  }
}

export default function OrdersPage() {
  const { data: session } = useSession();
  const devRole = useDevRole();
  const isDev = process.env.NODE_ENV === "development";
  const email = isDev ? devRole.email : (session?.user?.email || "");

  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("全部");

  useEffect(() => {
    if (!email || email === "—") { setLoading(false); return; }
    fetch(`/api/orders?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data: any) => {
        const flat: OrderItem[] = (data.orders || []).flatMap((o: any) =>
          (o.order_items || []).map((it: any) => ({
            id: it.id,
            orderId: o.id,
            itemType: it.item_type,
            name: it.meta?.name || "（未命名）",
            subtitle: it.meta?.subtitle || null,
            quantity: it.quantity,
            price: it.price,
            subtotal: it.price * it.quantity,
            createdAt: o.created_at,
            orderStatus: o.status,
          }))
        );
        setItems(flat);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [email]);

  const counts = {
    全部: items.length,
    商品: items.filter((i) => bucketOf(i.itemType) === "商品").length,
    活動: items.filter((i) => bucketOf(i.itemType) === "活動").length,
    其他: items.filter((i) => bucketOf(i.itemType) === "其他").length,
  };

  const filtered =
    activeTab === "全部"
      ? items
      : items.filter((i) => bucketOf(i.itemType) === activeTab);

  return (
    <div>
      <h2 className="text-xl font-semibold text-brand-brown mb-4">訂單紀錄</h2>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {typeTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "bg-brand-brown text-white"
                : "bg-brand-cream text-muted hover:bg-brand-tan/30"
            }`}
          >
            {tab}
            {counts[tab] > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({counts[tab]})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border p-12 bg-white text-center">
          <p className="text-muted text-sm">載入中...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-12 bg-white text-center">
          <p className="text-muted">尚無紀錄</p>
          <p className="text-sm text-muted mt-1">完成結帳後將出現在此</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-white px-5 py-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.name}
                </p>
                {item.subtitle && (
                  <p className="text-xs text-muted mt-0.5 truncate">{item.subtitle}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted">
                  <span>數量 {item.quantity}</span>
                  <span>·</span>
                  <span>單價 NT$ {item.price}</span>
                  <span>·</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs"
                  style={{ background: "#faf8f4", color: "#7a5c40" }}
                >
                  {bucketOf(item.itemType)}
                </span>
                <p className="text-sm font-semibold mt-1" style={{ color: "#7a5c40" }}>
                  NT$ {item.subtotal}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
