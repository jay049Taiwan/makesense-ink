---
type: project
date: 2026-04-29
supersedes: audit_pairing_failures_2026-04-29_v2.md
scope: makesense-ink × Notion DB01-09 × Supabase（v3 完整稽核）
originSessionId: a7d43a70-af42-47c9-9677-a6a2e1de0f31
---

> ⚠️ **2026/05/09 標註**：此為歷史稽核報告（2026-04-28 ~ 2026-05-05 期間產出）。所述「現行」schema 已於 2026/05/06~05/08 大幅改名（互動選項→互動類別、登記選項→登記類別、文案細項→文案選項、內容選項→素材類別、預約報名→填寫報名、請款請購→紀錄費用、活動細項→活動選項、走讀行旅→導覽走讀、紀錄備項→紀錄細項；DB05 大分類「圖文影音」→「內容素材」）。**僅供歷史脈絡，不要當作現行 schema 依據；現況以 MEMORY.md / makesense-ink/CLAUDE.md 為準**。

---

# 配對失敗稽核 v3 — 2026-04-29

## 方法
1. 透過 Notion MCP fetch 抓 9 個 DB 的 schema（DB04/05/06/08 大檔走 cache 解析）
2. 透過 Supabase MCP `list_tables` 抓 public schema（35 張表）
3. 程式碼掃描範圍：`/Users/jay049/Documents/工作參考資料/makesense-ink/` 下 176 個 `.ts/.tsx/.mjs`（排除 node_modules、.next）
4. 比對三類：
   - 🔴 程式讀的 Notion 欄位 → 該 DB schema 不存在
   - 🔴 程式寫的 Supabase 欄位 → 該 table schema 不存在
   - 🟡 filter `equals:` / write `name:` 的 select 值 → DB schema 沒這選項

## 結論：找到 1 個確定問題（其餘均通過）

### 🔴 唯一確定的 Bug

**`app/api/line-pay/confirm/route.ts:45`**
```ts
.from("orders").update({
  status: "confirmed",
  payment_method: "line_pay",
  payment_transaction_id: transactionId,  // ❌ orders 沒這欄
  updated_at: new Date().toISOString(),
}).eq("id", orderId);
```

**問題**：`orders` table 沒有 `payment_transaction_id` 欄位。Supabase 會吞掉這個欄位（PostgREST 預設行為）或回傳錯誤。LINE Pay 交易 ID 沒被記錄下來，未來退款／對帳會找不到。

**修法（擇一）**：
- A. 加 column：`alter table orders add column payment_transaction_id text;`
- B. 寫進 `meta`/`refund_info` 之類的 jsonb（如果未來不會用 transaction_id 做查詢）
- C. 直接拿掉這行（如果 LINE Pay 那邊有自己的 log）

建議 A，金流資訊獨立成欄。

---

## 通過項目（無問題）

### Notion 欄位讀取 — 84 個唯一 Notion 欄位引用，84 個都在某個 DB schema 裡
- 唯一兩個一開始疑似不存在的：
  - `props["庫存總計"]`（DB07 formula 欄位）— ✅ 實為 formula，正確
  - `props["範圍日期"]?.date`（DB09 date 欄位）— ✅ 正確（DB09 title 改名後此欄留作日期欄）
- DB04 改名後的新名稱全數對齊：`協作名稱`、`活動細項`、`實際單價`、`預計單價`、`登記發佈`、`距離km`、`對應辦理單位`、`最低數量`、`簡介摘要`
- DB07 `頁面狀態` status 三選項（`有頁面`/`無頁面`/`無狀態`）正確
- DB09 title 從「日期/範圍名稱」改為 `紀錄名稱`、日期欄改為 `範圍日期` — 程式只讀 `範圍日期` ✅

### Supabase 寫入欄位 — 28 張被寫入的表，欄位全數對齊
- `space_bookings` 新欄位全部正確：`source` / `notion_db04_id` / `attendee_count` / `notion_page_id`
- `members.brand_profile`、`orders.refund_info`、`order_items.meta` 等 JSONB 欄位的內部 key 不限制（誤報已排除）
- `events.distance_km` / `events.duration_min` / `point_ledger.type='距離行程'` 正確

### Select / Status 選項值寫入 — 29 處全部合法
- `表單類型`：`報名登記` ✅（DB05）
- `登記選項`：`預約報名` / `紀錄庫存` ✅（DB05）
- `明細類型`：`報名登記` / `庫存紀錄` ✅（DB06）
- `庫存細項`：`出貨` ✅（DB05）
- `庫存選項`：`出貨` ✅（DB04）
- `庫存類型`：`商品` ✅（DB07）
- `發佈狀態`：`待發佈` / `已發佈` ✅（DB07）
- `會員狀態`：`會員` ✅（DB08）
- `關係選項`：`個人` / `合作夥伴` / `工作團隊` ✅（DB08）
- `經營類型`：`觀點` / `標籤` ✅（DB08）
- `執行狀態`：`預計提案`（DB01）/ `已完成` `執行中`（DB02/03）✅
- `門市選項`：`場地使用` ✅（DB04）
- `協作選項`：`活動辦理` ✅（DB04）

### Filter `equals:` 值 — 29 個全部合法

### syncSpaceBookings + syncDb08Places 新功能讀取 — 全部對齊
- syncSpaceBookings (`route.ts:566-620`) 讀的 DB04 欄位全在 schema：
  `門市選項`、`對應地點`、`對應對象`、`執行時間`、`數量上限`、`簡介摘要` ✅
- syncDb08Places (`route.ts:395+`) 讀的 DB08 欄位全在 schema

### 100% 通過的 DB
全部 9 個 DB（DB01-09）：程式讀／寫的 Notion 欄位全部對齊 schema。

---

## 統計

| 類別 | 引用數 | 不對齊 |
|---|---|---|
| Notion 欄位讀寫（中文 prop） | 84 unique（307 行） | 0 |
| Notion select/status filter `equals:` | 29 行 | 0 |
| Notion select/status write `name:` | 29 行 | 0 |
| Supabase from() | 28 unique tables（285 行） | 0 |
| Supabase insert/upsert/update 欄位 | 52 處 | **1**（`orders.payment_transaction_id`）|

## v2 相比新增覆蓋
- ✅ 校驗了今天剛改的 DB04 全部新欄位名（協作名稱／活動細項／實際單價／預計單價／登記發佈／距離km／對應辦理單位／最低數量／簡介摘要）
- ✅ 校驗了 DB07 條碼收斂（`商品ID` 仍是 Notion text，程式 `barcode-lookup/route.ts` 正確）
- ✅ 校驗 space_bookings 整合（external/internal source、notion_db04_id、attendee_count）
- ✅ 校驗 DB07 `頁面狀態` 三選項邏輯
- ✅ 校驗 DB09 改名（範圍日期 / 紀錄名稱）
- ✅ 校驗 `statusFieldFor()` 在不同 DB 用不同欄位名（events 用「登記發佈」、其他用「發佈狀態」）—`app/api/sync/single/route.ts:155/176/189` 行為正確
