export default function VendorProductsPage() {
  const products = [
    { id: 1, name: "宜蘭手工皂禮盒", status: "publish", price: 580, stock: 24, sku: "SP-001", sold: 45 },
    { id: 2, name: "龜山島明信片組", status: "publish", price: 150, stock: 100, sku: "SP-002", sold: 230 },
    { id: 3, name: "藺草杯墊（四入）", status: "draft", price: 220, stock: 15, sku: "SP-003", sold: 18 },
    { id: 4, name: "旅人帆布袋", status: "publish", price: 350, stock: 0, sku: "SP-004", sold: 67 },
  ];

  const statusLabel: Record<string, { text: string; bg: string; color: string }> = {
    publish: { text: "上架中", bg: "rgba(78,205,196,0.12)", color: "#3aa89f" },
    draft: { text: "草稿", bg: "#f0f0f0", color: "#999" },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>我的產品</h2>
        <span className="text-sm" style={{ color: "var(--color-mist)" }}>from WooCommerce・{products.length} 項</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-dust)" }}>
              {["商品名稱", "狀態", "價格", "庫存", "SKU", "已售"].map((h) => (
                <th key={h} className="text-left py-3 px-2 font-medium" style={{ color: "var(--color-mist)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const st = statusLabel[p.status] || statusLabel.draft;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--color-dust)" }}>
                  <td className="py-3 px-2 font-medium" style={{ color: "var(--color-ink)" }}>{p.name}</td>
                  <td className="py-3 px-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.text}</span>
                  </td>
                  <td className="py-3 px-2" style={{ color: "var(--color-rust)" }}>NT$ {p.price}</td>
                  <td className="py-3 px-2" style={{ color: p.stock === 0 ? "var(--color-rust)" : "var(--color-ink)" }}>
                    {p.stock === 0 ? "缺貨" : p.stock}
                  </td>
                  <td className="py-3 px-2" style={{ color: "var(--color-mist)" }}>{p.sku}</td>
                  <td className="py-3 px-2" style={{ color: "var(--color-ink)" }}>{p.sold}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
