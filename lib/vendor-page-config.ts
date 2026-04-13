/**
 * Module-level store — 記錄廠商為各活動設定的預購商品
 * dev 環境下同一個 browser session 內共享
 * key: activityId, value: product IDs
 */
export const activityProductConfig: Record<string, string[]> = {};

/**
 * 市集預購配置
 * key: marketSlug, value: 廠商陣列（含商品）
 * 廠商從合作後台設定後寫入此處，生成 /buy/[slug] 頁面
 */
export interface MarketVendorConfig {
  id: string;
  name: string;
  description?: string;
  products: Array<{
    id: string;
    name: string;
    price: number;
    note?: string;
    photo?: string;
    stock?: number;
  }>;
}

export interface MarketConfig {
  title: string;
  date?: string;
  pickupNote?: string;
  vendors: MarketVendorConfig[];
}

export const marketConfig: Record<string, MarketConfig> = {};
