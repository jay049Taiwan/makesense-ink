"use client";

import { useCart } from "@/components/providers/CartProvider";
import SafeImage from "./SafeImage";

export interface BottomSheetItem {
  id: string;
  name: string;
  price: number;
  photo?: string | null;
  type: "article" | "product";
  description?: string | null;
  stock?: number; // 商品用：傳入後才能判斷代訂；undefined 視為「不檢查庫存」
}

/**
 * LIFF 模式用的 Bottom Sheet — 推薦商品/文章快速預覽 + 加入購物車
 * 從底部滑入，點灰色遮罩或加入購物車後關閉
 * 不會遞迴（Sheet 裡面不再有推薦區）
 */
export default function BottomSheet({
  item,
  onClose,
}: {
  item: BottomSheetItem | null;
  onClose: () => void;
}) {
  const { addItem } = useCart();

  if (!item) return null;

  const isOutOfStock = item.type === "product" && typeof item.stock === "number" && item.stock <= 0;

  const handleAdd = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      type: "商品",
    });
    onClose();
  };

  const handlePreorder = () => {
    addItem({
      id: `preorder-${item.id}`,
      name: item.name,
      subtitle: "代訂（書店缺貨）",
      price: item.price,
      type: "預購",
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      onClick={onClose}
    >
      {/* 灰色遮罩 */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet 本體 */}
      <div
        className="relative w-full max-w-lg rounded-t-2xl overflow-hidden"
        style={{ background: "#fff", animation: "sheetUp 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 把手 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* 圖片 */}
        <div className="aspect-[16/9] mx-4 rounded-lg overflow-hidden">
          <SafeImage src={item.photo} alt={item.name} placeholderType={item.type === "product" ? "product" : "article"} />
        </div>

        {/* 資訊 */}
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
            {item.name}
          </h3>
          {item.price > 0 && (
            <p className="text-base font-bold mt-1" style={{ color: "var(--color-rust)" }}>
              NT$ {item.price.toLocaleString()}
            </p>
          )}
          {item.type === "product" && item.description && (
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "#555" }}>
              {item.description.length > 300 ? item.description.slice(0, 300) + "…" : item.description}
            </p>
          )}
          {/* 缺貨提示 */}
          {isOutOfStock && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: "#fff8ef", border: "1px solid #f0d9a8" }}>
              <p className="text-sm font-medium" style={{ color: "#8a6d3b" }}>📚 此商品目前缺貨</p>
              <p className="text-xs mt-1" style={{ color: "#b8997a" }}>可由旅人書店代訂，到貨時通知您</p>
            </div>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="px-4 pb-6 pt-2 flex gap-3 flex-wrap">
          {item.type === "product" ? (
            <>
              {item.price > 0 && !isOutOfStock && (
                <button
                  onClick={handleAdd}
                  className="flex-1 min-w-[120px] py-3 rounded-xl text-white font-semibold text-sm"
                  style={{ background: "var(--color-brown)" }}
                >
                  ＋ 加入購物車
                </button>
              )}
              {item.price > 0 && isOutOfStock && (
                <button
                  onClick={handlePreorder}
                  className="flex-1 min-w-[120px] py-3 rounded-xl text-white font-semibold text-sm"
                  style={{ background: "#e8935a" }}
                >
                  📦 請書店代訂
                </button>
              )}
              <a
                href="/bookstore"
                className="flex-1 min-w-[100px] py-3 rounded-xl text-center font-semibold text-sm"
                style={{ background: "var(--color-parchment)", color: "var(--color-brown)" }}
              >
                看更多
              </a>
            </>
          ) : (
            <a
              href={`/post/${item.id}`}
              className="flex-1 py-3 rounded-xl text-center font-semibold text-sm"
              style={{ background: "var(--color-parchment)", color: "var(--color-brown)" }}
            >
              查看詳情
            </a>
          )}
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-sm"
            style={{ border: "1px solid var(--color-dust)", color: "var(--color-mist)" }}
          >
            關閉
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
