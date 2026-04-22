"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useDevRole } from "@/components/providers/DevRoleProvider";

interface OrderItem {
  id: string;
  itemType: string;
  name: string;
  subtitle: string | null;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

function orderNumber(id: string) {
  return `MS-${id.slice(0, 8).toUpperCase()}`;
}

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "已確認", color: "#2e7d32", bg: "#e8f5e9" },
  pending: { label: "待審核", color: "#e8935a", bg: "#fff4eb" },
  cancelled: { label: "已取消", color: "#999", bg: "#f5f5f5" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { data: session } = useSession();
  const devRole = useDevRole();
  const isDev = process.env.NODE_ENV === "development";
  const email = isDev ? devRole.email : (session?.user?.email || "");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email || email === "—" || !orderId) { setLoading(false); return; }
    fetch(`/api/orders?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data: any) => {
        const match = (data.orders || []).find((o: any) => o.id === orderId);
        if (!match) { setOrder(null); return; }
        setOrder({
          id: match.id,
          status: match.status,
          total: Number(match.total) || 0,
          createdAt: match.created_at,
          items: (match.order_items || []).map((it: any) => ({
            id: it.id,
            itemType: it.item_type,
            name: it.meta?.name || "（未命名）",
            subtitle: it.meta?.subtitle || null,
            quantity: it.quantity,
            price: it.price,
          })),
        });
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [email, orderId]);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-brand-brown mb-4">訂單紀錄</h2>
        <div className="rounded-xl border border-border p-12 bg-white text-center">
          <p className="text-muted text-sm">載入中...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-brand-brown mb-4">訂單紀錄</h2>
        <div className="rounded-xl border border-border p-12 bg-white text-center">
          <p className="text-muted">找不到這筆訂單</p>
          <Link
            href="/dashboard/orders"
            className="inline-block mt-4 text-sm underline"
            style={{ color: "#7a5c40" }}
          >
            ← 返回所有訂單
          </Link>
        </div>
      </div>
    );
  }

  const s = statusLabel[order.status] || { label: order.status, color: "#666", bg: "#f0f0f0" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-brand-brown">訂單紀錄</h2>
        <Link
          href="/dashboard/orders"
          className="text-sm underline"
          style={{ color: "#7a5c40" }}
        >
          查看所有訂單
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {/* 訂單標頭 */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
          style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-semibold" style={{ color: "#7a5c40" }}>
              {orderNumber(order.id)}
            </span>
            <span
              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: s.bg, color: s.color }}
            >
              {s.label}
            </span>
          </div>
          <span className="text-xs text-muted">{formatDate(order.createdAt)}</span>
        </div>

        {/* 訂單明細 */}
        <div>
          {order.items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 px-5 py-3"
              style={{ borderTop: idx === 0 ? "none" : "1px solid #f5f5f5" }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted mt-0.5 truncate">{item.subtitle}</p>
                )}
                <p className="text-xs text-muted mt-1">
                  NT$ {item.price} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold whitespace-nowrap" style={{ color: "#7a5c40" }}>
                NT$ {item.price * item.quantity}
              </p>
            </div>
          ))}
        </div>

        {/* 總計 */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ background: "#fafafa", borderTop: "1px solid #eee" }}
        >
          <span className="text-sm text-muted">總計</span>
          <span className="text-base font-bold" style={{ color: "#7a5c40" }}>
            NT$ {order.total}
          </span>
        </div>
      </div>
    </div>
  );
}
