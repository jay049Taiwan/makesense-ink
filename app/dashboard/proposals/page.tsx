export default function VendorProposalsPage() {
  const proposals = [
    { id: 1, title: "2026 春季聯名企劃", status: "執行中", type: "品牌合作", created: "2026-03-15" },
    { id: 2, title: "森本集市 05 場攤位申請", status: "預計提案", type: "市集攤位", created: "2026-04-01" },
    { id: 3, title: "宜蘭在地食材禮盒開發", status: "已結案", type: "商品開發", created: "2025-12-10" },
  ];

  const statusStyle: Record<string, { bg: string; color: string }> = {
    執行中: { bg: "rgba(78,205,196,0.12)", color: "#3aa89f" },
    預計提案: { bg: "#FFF3E0", color: "#E65100" },
    已結案: { bg: "#f0f0f0", color: "#999" },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>合作提案</h2>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "var(--color-teal)" }}>
          + 新增提案
        </button>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--color-mist)" }}>from Notion DB01・{proposals.length} 筆</p>

      <div className="space-y-3">
        {proposals.map((p) => {
          const st = statusStyle[p.status] || statusStyle["預計提案"];
          return (
            <div key={p.id} className="rounded-lg p-4 flex items-center justify-between"
              style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
              <div>
                <h3 className="text-sm font-medium mb-1" style={{ color: "var(--color-ink)" }}>{p.title}</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{p.status}</span>
                  <span style={{ color: "var(--color-mist)" }}>{p.type}</span>
                  <span style={{ color: "var(--color-mist)" }}>{p.created}</span>
                </div>
              </div>
              <button className="text-xs px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--color-dust)", color: "var(--color-bark)" }}>
                查看
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
