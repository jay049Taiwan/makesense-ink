import Link from "next/link";

/**
 * 「你應該也想知道」— 同類型的其他項目
 * 「你可能也會喜歡」— 跨類型推薦
 *
 * 用於：單一商品、單一活動、單一文章、單一觀點、結帳頁
 */

interface RecommendItem {
  id: number;
  title: string;
  subtitle?: string;
  icon: string;
  href: string;
}

function ItemCard({ item }: { item: RecommendItem }) {
  return (
    <Link
      href={item.href}
      className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
      style={{ border: "1px solid var(--color-dust)", background: "#fff" }}
    >
      <div
        className="aspect-[4/5] flex items-center justify-center"
        style={{ background: "var(--color-parchment)" }}
      >
        <span className="text-2xl opacity-20">{item.icon}</span>
      </div>
      <div className="p-2.5">
        <h3
          className="text-[0.85em] line-clamp-1"
          style={{ color: "var(--color-ink)" }}
        >
          {item.title}
        </h3>
        {item.subtitle && (
          <p className="text-[0.8em]" style={{ color: "var(--color-rust)" }}>
            {item.subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}

export function AlsoWantToKnow({
  items,
}: {
  items?: RecommendItem[];
}) {
  const defaultItems: RecommendItem[] = items || [
    { id: 1, title: "同類型項目 1", icon: "📄", href: "#", subtitle: "NT$ 280" },
    { id: 2, title: "同類型項目 2", icon: "📄", href: "#", subtitle: "NT$ 350" },
    { id: 3, title: "同類型項目 3", icon: "📄", href: "#", subtitle: "NT$ 420" },
    { id: 4, title: "同類型項目 4", icon: "📄", href: "#", subtitle: "NT$ 190" },
  ];

  return (
    <section className="mt-12">
      <h2
        className="text-lg font-semibold mb-4"
        style={{ color: "var(--color-ink)" }}
      >
        你應該也想知道
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {defaultItems.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export function MightAlsoLike({
  items,
}: {
  items?: RecommendItem[];
}) {
  const defaultItems: RecommendItem[] = items || [
    { id: 1, title: "推薦項目 1", icon: "✨", href: "#", subtitle: "NT$ 300" },
    { id: 2, title: "推薦項目 2", icon: "✨", href: "#", subtitle: "NT$ 450" },
    { id: 3, title: "推薦項目 3", icon: "✨", href: "#", subtitle: "NT$ 260" },
    { id: 4, title: "推薦項目 4", icon: "✨", href: "#", subtitle: "NT$ 380" },
  ];

  return (
    <section className="mt-12">
      <h2
        className="text-lg font-semibold mb-4"
        style={{ color: "var(--color-ink)" }}
      >
        你可能也會喜歡
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {defaultItems.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
