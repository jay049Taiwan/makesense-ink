"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/components/providers/CartProvider";

interface PaywallButtonProps {
  product: {
    id: string;
    notionId: string;
    name: string;
    price: number;
    subCategory?: string | null;
  };
  articleTitle: string;
}

export default function PaywallButton({ product, articleTitle }: PaywallButtonProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const handleUnlock = () => {
    addItem({
      id: `product-${product.notionId}`,
      name: product.name || articleTitle,
      subtitle: "付費解鎖",
      type: "商品",
      price: product.price,
      qty: 1,
      productId: product.notionId,
    });
    router.push("/checkout");
  };

  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: "var(--color-warm-white)", border: "1.5px solid var(--color-teal)" }}>
      <p className="text-4xl mb-3">🔒</p>
      <p className="text-base font-medium mb-2" style={{ color: "var(--color-ink)" }}>
        此內容為付費文章
      </p>
      <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
        購買後可完整閱讀此篇文章
      </p>
      <button
        onClick={handleUnlock}
        className="px-8 py-3 rounded-lg text-base font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--color-teal)" }}
      >
        付費解鎖 NT$ {product.price.toLocaleString()}
      </button>
      <p className="text-xs mt-4" style={{ color: "var(--color-mist)" }}>
        到門市現場付現（線上金流尚未接上）
      </p>
    </div>
  );
}
