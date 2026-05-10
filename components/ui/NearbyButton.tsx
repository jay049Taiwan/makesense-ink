"use client";

import { useState } from "react";

interface Shop {
  notion_id: string;
  name: string;
  address_text: string | null;
  region: string | null;
  distance_km: number;
}

/**
 * 「附近看看」按鈕 — 商品頁加入購物車旁邊
 * 流程：點擊 → 取得 GPS → 呼叫 /api/nearby → BottomSheet 列 5 家 20km 內賣同類別的觀點店
 */
export default function NearbyButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);

  async function handleClick() {
    setError(null);
    setShops([]);
    setOpen(true);
    setLoading(true);

    if (!navigator.geolocation) {
      setError("您的瀏覽器不支援定位功能");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/nearby?productId=${productId}&lat=${latitude}&lng=${longitude}`);
          const json = await res.json();
          if (!json.ok) {
            setError(json.error || "查詢失敗");
          } else {
            setShops(json.shops || []);
          }
        } catch (e: any) {
          setError(e.message || "網路錯誤");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "需要開啟定位權限才能找附近的店"
            : err.code === err.POSITION_UNAVAILABLE
            ? "無法取得您的位置"
            : "定位逾時，請再試一次";
        setError(msg);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="h-10 px-3 rounded text-xs font-medium border transition-colors flex items-center gap-1 whitespace-nowrap"
        style={{ borderColor: "var(--color-bark)", color: "var(--color-bark)" }}
        title="找附近 20km 內賣同類商品的店家"
      >
        📍 附近看看
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: "var(--color-bark)" }}>
                📍 附近看看
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-xl leading-none"
                style={{ color: "var(--color-mist)" }}
                aria-label="關閉"
              >
                ×
              </button>
            </div>

            {loading && (
              <p className="text-sm text-center py-6" style={{ color: "var(--color-mist)" }}>
                正在搜尋你附近的店家…
              </p>
            )}

            {error && !loading && (
              <div className="py-6 text-center">
                <p className="text-sm mb-3" style={{ color: "#e53e3e" }}>
                  {error}
                </p>
                <button
                  onClick={handleClick}
                  className="text-xs underline"
                  style={{ color: "var(--color-bark)" }}
                >
                  重新嘗試
                </button>
              </div>
            )}

            {!loading && !error && shops.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: "var(--color-mist)" }}>
                附近 20 公里內沒有合作店家販售同類商品。
                <br />
                <span className="text-xs">不妨在這裡直接下單支持我們～</span>
              </p>
            )}

            {!loading && !error && shops.length > 0 && (
              <>
                <p className="text-xs mb-3" style={{ color: "var(--color-mist)" }}>
                  以下 {shops.length} 家店家也販售同類商品（20km 內）
                </p>
                <ul className="space-y-3">
                  {shops.map((shop) => (
                    <li key={shop.notion_id}>
                      <a
                        href={`/viewpoint/${shop.notion_id}`}
                        className="block p-3 rounded-lg border transition-colors hover:bg-amber-50"
                        style={{ borderColor: "var(--color-dust)" }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                            {shop.name}
                          </span>
                          <span
                            className="text-xs whitespace-nowrap font-medium"
                            style={{ color: "var(--color-teal)" }}
                          >
                            {shop.distance_km} km
                          </span>
                        </div>
                        {shop.address_text && (
                          <p className="text-xs" style={{ color: "var(--color-mist)" }}>
                            {shop.address_text}
                          </p>
                        )}
                        {!shop.address_text && shop.region && (
                          <p className="text-xs" style={{ color: "var(--color-mist)" }}>
                            {shop.region}
                          </p>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
