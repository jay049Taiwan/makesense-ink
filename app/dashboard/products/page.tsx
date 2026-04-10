import { auth } from "@/lib/auth";
import { fetchPersonByEmail, fetchVendorInventory } from "@/lib/fetch-all";
import type { VendorInventoryItem } from "@/lib/fetch-all";

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  上架中:   { bg: "rgba(78,205,196,0.12)", color: "#3aa89f", label: "上架中" },
  下架:     { bg: "#f5f0eb",              color: "#8C7A6A", label: "下架" },
  缺貨:     { bg: "#FDF0F0",              color: "#B85C5C", label: "缺貨" },
  預購中:   { bg: "#FFF3E0",              color: "#C4864A", label: "預購中" },
};

function StockDisplay({ stock }: { stock: number | null }) {
  if (stock === null) return <span style={{ color: "var(--color-mist)" }}>—</span>;
  if (stock === 0) return <span style={{ color: "#B85C5C" }}>缺貨</span>;
  if (stock <= 3) return <span style={{ color: "#C4864A" }}>{stock}</span>;
  return <span style={{ color: "var(--color-ink)" }}>{stock}</span>;
}

export default async function VendorProductsPage() {
  const session = await auth();
  const email = session?.user?.email;

  let items: VendorInventoryItem[] = [];

  if (email) {
    const person = await fetchPersonByEmail(email);
    if (person?.id) {
      items = await fetchVendorInventory(person.id, 50);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>我的產品</h2>
        <span className="text-sm" style={{ color: "var(--color-mist)" }}>
          from Notion DB07・{items.length} 項
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
          <p style={{ color: "var(--color-mist)" }}>目前沒有上架中的產品</p>
          <p className="text-xs mt-2" style={{ color: "var(--color-mist)" }}>如有疑問請聯繫現思工作團隊</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 540 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-dust)" }}>
                {["商品名稱", "狀態", "售價", "庫存", "類型"].map((h) => (
                  <th key={h} className="text-left py-3 px-2 font-medium" style={{ color: "var(--color-mist)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const st = statusStyle[item.status] || statusStyle["下架"];
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-dust)" }}>
                    <td className="py-3 px-2 font-medium" style={{ color: "var(--color-ink)" }}>
                      {item.photo && (
                        <img src={item.photo} alt="" className="inline-block w-7 h-7 rounded object-cover mr-2 align-middle" />
                      )}
                      {item.name}
                    </td>
                    <td className="py-3 px-2">
                      {item.status ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                          {item.status}
                        </span>
                      ) : <span style={{ color: "var(--color-mist)" }}>—</span>}
                    </td>
                    <td className="py-3 px-2" style={{ color: "var(--color-rust)" }}>
                      {item.price ? `NT$ ${item.price.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <StockDisplay stock={item.stock} />
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
