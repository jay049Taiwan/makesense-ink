"use client";

import { useCart } from "@/components/providers/CartProvider";
import SafeImage from "./SafeImage";

export interface BottomSheetItem {
  id: string;
  name: string;
  price: number;
  photo?: string | null;
  type: "article" | "product";
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

  const handleAdd = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      type: "商品",
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
        </div>

        {/* 操作按鈕 */}
        <div className="px-4 pb-6 pt-2 flex gap-3">
          {item.type === "product" && item.price > 0 ? (
            <button
              onClick={handleAdd}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm"
              style={{ background: "var(--color-brown)" }}
            >
              加入購物車
            </button>
          ) : (
            <a
              href={item.type === "product" ? `/product/${item.id}` : `/post/${item.id}`}
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
