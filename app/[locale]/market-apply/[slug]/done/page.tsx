import Link from "next/link";

export default function MarketApplyDonePage() {
  return (
    <div className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 600 }}>
      <p className="text-5xl mb-4">📬</p>
      <h1 className="text-2xl font-semibold mb-3" style={{ color: "var(--color-ink)" }}>
        申請已收到
      </h1>
      <p className="text-sm mb-2" style={{ color: "var(--color-bark)" }}>
        我們會在 3-5 個工作天內審核完成。
      </p>
      <p className="text-sm mb-8" style={{ color: "var(--color-bark)" }}>
        審核結果會以 <strong>Email</strong> 與 <strong>LINE 官方帳號</strong> 通知你。
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/market-booking" className="inline-block px-6 py-2.5 rounded text-sm font-medium"
          style={{ background: "var(--color-teal)", color: "#fff" }}>
          回展售合作
        </Link>
        <Link href="/dashboard" className="inline-block px-6 py-2.5 rounded text-sm font-medium"
          style={{ border: "1px solid var(--color-dust)", color: "var(--color-bark)" }}>
          回會員中心
        </Link>
      </div>
    </div>
  );
}
