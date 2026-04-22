# 官網 ↔ Supabase ↔ Notion 欄位對應交接文件

**整理日期**：2026/04/13  
**整理人**：Claude（依 Noah 指示）  
**對象**：負責資料層整合的工程師  
**專案路徑**：`makesense-ink/`（Next.js 16 on Vercel）

---

## 背景說明

官網目前前端已建好，所有資料層目前用 `lib/mock-data.ts` 假資料撐著。  
這份文件說明：有哪些地方需要接 Supabase、哪些欄位要對應 Notion、需要新增哪些資料表。

**原則**：
- 商業邏輯資料（訂單、廠商商品、預購）→ **Supabase**
- 內容型資料（文章、活動說明、關係經營名錄）→ **Notion**（已存在）
- 官網從 Supabase 查詢，再視需要 JOIN Notion page ID 拿詳細內容

---

## 一、現有 Supabase 資料表（已建，需確認）

### `partners` 表
```sql
id          uuid  primary key
email       text  unique
name        text
role        text   -- 'vendor' | 'staff' | 'member'
contact     jsonb  -- { email, phone, line_id, ... }
notion_id   text   -- 對應 Notion DB08 的 page ID
created_at  timestamptz
```

**查詢方式**（前端已依賴）：
```sql
SELECT id FROM partners WHERE contact->>'email' = $1
```

---

## 二、需要新增的 Supabase 資料表

### 2-1. `vendor_products`（廠商自管商品庫）

廠商在 `/dashboard/partner` → 「資訊」Tab 自行管理，是所有加購/預購的商品來源。

```sql
CREATE TABLE vendor_products (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id   uuid REFERENCES partners(id) ON DELETE CASCADE,
  name        text NOT NULL,
  price       integer NOT NULL,          -- 單位：新台幣
  stock       integer DEFAULT 0,
  note        text,                      -- 備註（選填）
  photo_url   text,                      -- Cloudinary 圖片 URL
  active      boolean DEFAULT true,      -- false = 下架（顯示但不可加購）
  sort_order  integer DEFAULT 0,         -- 廠商自訂排序
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

**前端對應**：`components/booking/MarketPreOrderPanel.tsx` 的 `PreOrderProduct` 介面  
**前端介面**（`app/dashboard/partner/page.tsx`）：
```typescript
export interface VendorProduct {
  id: string;
  name: string;
  photo?: string;    // → photo_url
  price: number;
  stock: number;
  note?: string;
  active: boolean;
}
```

---

### 2-2. `market_events`（市集活動設定）

每一場市集或活動，由 Noah 在後台建立後，可以開放廠商加入。

```sql
CREATE TABLE market_events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text UNIQUE NOT NULL,     -- 對應 /buy/[slug] 的 URL 參數
  title        text NOT NULL,
  event_date   date,
  pickup_note  text DEFAULT '現場取貨，市集當天繳費',
  is_open      boolean DEFAULT true,     -- 是否開放預購
  notion_id    text,                     -- 對應 Notion DB05 的 activity page ID（選填）
  created_at   timestamptz DEFAULT now()
);
```

---

### 2-3. `market_vendor_slots`（市集廠商參與紀錄）

記錄哪個廠商加入哪場市集、以及他們在這場市集展售哪些商品。

```sql
CREATE TABLE market_vendor_slots (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id       uuid REFERENCES market_events(id) ON DELETE CASCADE,
  vendor_id       uuid REFERENCES partners(id) ON DELETE CASCADE,
  vendor_desc     text,                  -- 廠商在這場市集的簡介（可覆蓋預設值）
  is_paid         boolean DEFAULT false, -- 是否已付「預購表單上架費」
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(market_id, vendor_id)
);
```

---

### 2-4. `market_slot_products`（市集廠商此場展售的商品）

廠商的商品庫（vendor_products）中，哪些要在這場市集的預購表單上顯示。

```sql
CREATE TABLE market_slot_products (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id         uuid REFERENCES market_vendor_slots(id) ON DELETE CASCADE,
  vendor_product_id uuid REFERENCES vendor_products(id) ON DELETE CASCADE,
  override_price  integer,               -- 如需市集特別定價（null = 用原價）
  sort_order      integer DEFAULT 0,
  UNIQUE(slot_id, vendor_product_id)
);
```

---

### 2-5. `activity_addon_products`（活動加購商品設定）

廠商在協作平台「項目」Tab 設定活動加購商品，生成 `/buy/[activity_slug]` 頁面用。

```sql
CREATE TABLE activity_addon_products (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_notion_id text NOT NULL,      -- 對應 Notion DB05 的 activity page ID
  vendor_id         uuid REFERENCES partners(id) ON DELETE CASCADE,
  vendor_product_id uuid REFERENCES vendor_products(id) ON DELETE CASCADE,
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(activity_notion_id, vendor_product_id)
);
```

**前端目前用**：`lib/vendor-page-config.ts` 的 `activityProductConfig`（module-level in-memory）  
**改為**：從此表查詢 → `GET /api/activity-addons?activityId=xxx`

---

### 2-6. `preorders`（民眾預購/報名訂單）

所有透過 `/buy/[slug]` 頁面送出的訂單集中存放。

```sql
CREATE TABLE preorders (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_type      text NOT NULL,         -- 'market' | 'activity' | 'product'
  ref_id          text NOT NULL,         -- market slug / activity notion_id / product notion_id
  buyer_name      text NOT NULL,
  buyer_phone     text NOT NULL,
  buyer_email     text,
  items           jsonb NOT NULL,        -- 見下方說明
  total_amount    integer NOT NULL,
  status          text DEFAULT 'pending', -- 'pending' | 'confirmed' | 'cancelled'
  pickup_note     text,
  notion_synced   boolean DEFAULT false, -- 是否已同步到 Notion DB05
  created_at      timestamptz DEFAULT now()
);

-- items jsonb 範例：
-- [
--   { "vendor_id": "...", "vendor_name": "蘭東書坊",
--     "product_id": "...", "product_name": "蘭東案內 06期",
--     "qty": 2, "price": 280, "subtotal": 560 }
-- ]
```

---

## 三、Notion 欄位對應

### DB05 登記表單明細（原子資料層）

民眾送出預購/報名後，需同步一筆到 DB05。

| DB05 欄位名稱 | 類型 | 寫入內容 |
|---|---|---|
| 表單名稱（title） | title | `[市集/活動名稱] - [買家姓名]` |
| 明細內容 | rich_text | 商品清單文字（e.g. "蘭東案內×2、散步圖×1"） |
| 表單類型 | select | `報名登記`（DB05 只有 3 選項：報名登記/共識互動/圖文影音） |
| 對應對象 | relation → DB08 | 廠商的 DB08 page ID（如有）（2026/04/17 校正，舊名「對應標籤對象」已搬到 DB06） |

**同步時機**：`preorders` 的 `notion_synced = false` → 定時 job 或 webhook 觸發同步。

---

### DB08 關係經營（廠商主檔）

合作廠商的 profile 資料來自這裡，Supabase `partners.notion_id` 指向此表。

| DB08 欄位名稱 | 用途 |
|---|---|
| 經營名稱 | 廠商顯示名稱（`MarketPreOrderPanel` 的 vendor.name） |
| 關係選項 | 判斷角色（個人 / 合作夥伴 / 工作團隊）；搭配 會員狀態=會員 判斷是否為會員（2026/04/22 起「對象選項」改名為「關係選項」） |
| 聯絡方式 | 電話、Email、LINE |

**目前前端讀取方式**：  
`lib/fetch-all.ts` 的 `resolveRelationNames(ids)` → 批次抓 DB08 page title

---

### DB01 資源提案（廠商提案）

廠商在 `/dashboard/partner` → 「項目」Tab 提交的合作提案寫入這裡。  
目前前端尚未串接，欄位確認後另行規劃。

---

## 四、前端查詢邏輯（需改寫的地方）

### 4-1. `app/buy/[slug]/page.tsx`

| 目前 | 改成 |
|---|---|
| `marketConfig[slug]`（in-memory） | `supabase.from('market_events').select('..., market_vendor_slots(..., vendor_products(...))')` |
| `activityProductConfig[slug]`（in-memory） | `supabase.from('activity_addon_products').select('..., vendor_products(*)')` |
| 表單送出後僅 setState | POST 到 `/api/preorders` 寫入 Supabase |

---

### 4-2. `app/dashboard/partner/page.tsx`（廠商協作平台）

| 目前 | 改成 |
|---|---|
| `vendorProducts` useState 本地 mock | `supabase.from('vendor_products').select('*').eq('vendor_id', partnerId)` |
| 新增/編輯商品 → 僅更新 state | INSERT / UPDATE `vendor_products` |
| 活動加購設定 → `activityProductConfig[id] = [...]`（in-memory） | INSERT `activity_addon_products` |
| 市集預購 URL 生成 → 僅讀 slug | 查詢 `market_events` 確認 slug 有效 |

---

### 4-3. `app/dashboard/products/page.tsx`

| 目前 | 改成 |
|---|---|
| `getVendorProducts()` mock | `supabase.from('vendor_products').select('*').eq('vendor_id', ...)` |

---

## 五、API Routes 需新增

```
POST /api/preorders          ← 民眾送出預購
GET  /api/market/[slug]      ← 取得市集廠商+商品資料（供 /buy/[slug] 使用）
GET  /api/activity-addons    ← 取得活動加購商品（?activityId=xxx）
GET  /api/vendor/products    ← 廠商查自己的商品（需 JWT）
POST /api/vendor/products    ← 廠商新增商品
PUT  /api/vendor/products/[id]  ← 廠商編輯商品
POST /api/vendor/market-slot ← 廠商將商品加入指定市集
```

---

## 六、待確認事項

1. **市集付費機制**：`market_vendor_slots.is_paid` 欄位的付款流程由誰管理？（目前預留欄位）
2. **庫存扣減時機**：預購成立時立即扣 `vendor_products.stock`？還是現場確認後才扣？
3. **Notion 同步方向**：預購訂單只需要「Supabase → Notion（單向寫入）」？還是需要 Notion 也能回寫狀態？
4. **廠商帳號建立流程**：目前 Supabase `partners` 是 Noah 手動建，還是廠商自行申請審核開通？

---

## 七、目前狀態摘要

| 功能 | 前端 | 資料層 |
|---|---|---|
| 廠商協作平台（概覽/資訊/項目/金流/設定 Tab） | ✅ 完成（mock） | ⬜ 待接 |
| 廠商商品自管（新增/編輯/下架） | ✅ 完成（mock） | ⬜ 待接 Supabase |
| 活動加購商品設定 + URL 生成 | ✅ 完成（in-memory） | ⬜ 待接 Supabase |
| 市集多廠商預購表單（/buy/[slug]） | ✅ 完成（mock） | ⬜ 待接 Supabase |
| 預購表單嵌入文章頁 | ✅ 完成（mock） | ⬜ 待接 Supabase |
| 預購訂單寫入 Supabase | ⬜ 待實作 | ⬜ 待建表 |
| 預購訂單同步 Notion DB05 | ⬜ 待實作 | ⬜ 待確認欄位 |
