---
type: project
date: 2026-04-28
scope: notion-supabase-code schema alignment audit
originSessionId: 47ca24e6-1af8-40cb-8bf2-db080f8efa4e
---

> ⚠️ **2026/05/09 標註**：此為歷史稽核報告（2026-04-28 ~ 2026-05-05 期間產出）。所述「現行」schema 已於 2026/05/06~05/08 大幅改名（互動選項→互動類別、登記選項→登記類別、文案細項→文案選項、內容選項→素材類別、預約報名→填寫報名、請款請購→紀錄費用、活動細項→活動選項、走讀行旅→導覽走讀、紀錄備項→紀錄細項；DB05 大分類「圖文影音」→「內容素材」）。**僅供歷史脈絡，不要當作現行 schema 依據；現況以 MEMORY.md / makesense-ink/CLAUDE.md 為準**。

---

# DB schema 三方稽核（Notion ↔ Supabase ↔ makesense-ink 程式碼）

## 範圍
- Notion：9 個 DB（DB01~DB09）2026-04-28 當下狀態，透過 MCP fetch 抓取
- Supabase：專案 zgwdomvauuxaxtgqqvrn，public schema 全部 26 張 table
- 程式碼：`/Users/jay049/Documents/工作參考資料/makesense-ink/`（特別是 `app/api/sync/route.ts`、`app/api/sync/single/route.ts`、`lib/`）

---

## 0. 整體掃描結果

### 0.1 新增 12 個 AI agent 欄位（2026-04-27 → 04-28 加的）
每個 DB 都新增了：
- `ai_meta`（text）
- `ai_對應對象`（relation → DB08，DB07 改叫 `ai_對應作者`）
- `ai_對應標籤`（relation → DB08）
- `ai_對應發行`（**僅 DB07**，relation → DB08）
- `ai企劃`、`ai分析`、`ai搜查`、`ai文案`、`ai聯想`、`ai進度`（status，三態：待執行/無執行/完成）
- `ai企劃備註`、`ai分析備註`、`ai搜查備註`、`ai文案備註`、`ai聯想備註`、`ai進度備註`（text）
- `提煉分析`（button，每 DB 都有）

**程式碼引用：0 處**（grep `ai_對應|ai_meta|ai企劃|ai分析|ai搜查|ai文案|ai聯想|ai進度` 在整個 makesense-ink 找不到任何引用）。

**Supabase：0 個欄位對應**。

→ 結論：這 12 個欄位純粹給 AI agent（嗨嗨）內部使用，目前不需要同步到 Supabase / 官網。**這是設計，不是 bug**。但要避免未來如果想暴露時忘記補同步。

### 0.2 程式同步覆蓋的 DB
| DB | 進入同步 | 備註 |
|----|----------|------|
| DB01 資源提案 | ❌ | CLAUDE.md 標「不同步（內部管理）」 |
| DB02 績效管考 | ❌ | 不同步 |
| DB03 項目進度 | 部分（lib/staff-tasks.ts 直查 Notion API，工作台用） | 不寫 Supabase |
| DB04 協作交接 | ✅ events / space_bookings | sync/route.ts、sync/single/route.ts |
| DB05 登記表單 | ✅ articles / orders / reservation | sync/single/route.ts 多分流 |
| DB06 進銷明細 | ✅ products.stock 直接更新 | sync/single/route.ts syncSingleTransaction / syncStockBatch |
| DB07 庫存控管 | ✅ products | sync/route.ts、sync/single/route.ts |
| DB08 關係經營 | ✅ topics / persons / partners / staff / members | sync/route.ts、sync/single/route.ts |
| DB09 日期紀錄 | ❌ | CLAUDE.md 標「不同步」 |

---

## 1. DB01 資源提案 — 不同步
- 無 Supabase / 程式碼期待，跳過。

## 2. DB02 績效管考 — 不同步
- 同上。

## 3. DB03 項目進度 — Notion 直查（工作台）
- 程式只在 `lib/staff-tasks.ts`、`lib/fetch-all.ts` 讀，不寫 Supabase。
- 引用欄位：`項目名稱`、`執行狀態`、`對應交接`、`發佈狀態`。Notion 都還在 ✅。

## 4. DB04 協作交接 — events / space_bookings

### 4.1 對照表
| Notion 欄位 | type | Supabase events 欄位 | 程式引用 | 一致？ |
|-------------|------|----------------------|---------|--------|
| 交接名稱 | title | title (fallback) | sync/single/route.ts:237、sync/route.ts:485 | ✅ |
| 主題名稱 | rich_text | title (優先) | 同上 | ✅ |
| 活動類型 | select | theme / event_type | sync/single:238-239 | ✅ |
| 執行時間 | date | event_date | sync/single:200, 240 | ✅ |
| 單價 | number | price (fallback) | sync/single:233 | ✅ |
| 數量上限 | number | capacity | sync/single:243 | ✅ |
| 最低數量 | number | min_capacity | sync/single:243 | ✅ |
| 上傳檔案 | files | cover_url | sync/single:245 | ✅ |
| 簡介摘要 | rich_text | description | sync/single:246 | ✅ |
| 對應地點 | relation→DB08 | location (lookup person.name) | sync/single:203, 247 | ✅ |
| 對應對象 | relation→DB08 | guide / related_partner_ids | sync/single:204, 248 | ✅ |
| **對應辦理單位** | relation→DB08 | （程式找的是 `對應發佈單位` ❌） | sync/single:205 | **❌ 改名未更新** |
| 對應庫存 | relation→DB07 | tickets jsonb | sync/single:215-228 | ✅ |
| 交接類型 | select | event_category | sync/single:250 | ✅ |
| 協作選項 | select | collab_type | sync/single:251 | ✅ |
| 發佈狀態 | status | status | sync/single:252 | ✅ |

### 4.2 ❌ 嚴重不一致
**Bug A：DB04 沒有「對應發佈單位」欄位，實際叫「對應辦理單位」**
- 位置：`app/api/sync/single/route.ts:205`
  ```ts
  const publisherRels = rel(props["對應發佈單位"]);
  ```
- 影響：每次同步 DB04 活動時，`publisherRels` 永遠空陣列，`related_partner_ids` 缺少「主辦/承辦單位」這一筆 DB08 關係。受影響的官網功能：合作夥伴後台「我們承辦的活動」配對、`/dashboard/partner` 的關聯活動、`related_partner_ids` 用於前端顯示的「主辦單位」標籤。

### 4.3 Supabase 欄位 events 中沒被填的
- `route_stops`、`addons`、`keywords` — 程式從不寫，Notion 也沒對應欄位。早期保留欄位。
- ~~`distance_km`、`duration_min`~~（**2026/05 已補齊**）：
  - `distance_km`：Notion DB04 補建「距離(km)」number 欄位，sync route 已讀取並寫入
  - `duration_min`：sync route 從「執行時間」start-end 差值計算（無 end date 預設 120 分鐘）寫入
  - 既有活動需手動按一次「發佈更新」才能回填

---

## 5. DB05 登記表單 — articles / reservation / stock_batch

### 5.1 對照表
| Notion 欄位 | type | Supabase 欄位 | 程式引用 | 一致？ |
|-------------|------|--------------|---------|--------|
| 表單名稱 | title | title (fallback) | sync/single:530 | ✅ |
| 主題名稱 | rich_text | title (優先) | sync/single:530 | ✅ |
| 表單類型 | select | （只用於分流判斷） | sync/single:263 | ✅ |
| 文案細項 | select | （分流） | sync/single:265 | ✅ |
| 登記選項 | select | （分流：意見回饋/紀錄庫存/預約報名） | sync/single:266 | ✅ |
| 庫存選項 | select | （分流：進貨/出貨/盤點） | sync/single:264, 403 | ✅ |
| 官網備項 | select | articles.web_tag (text[]) | sync/single:539 | ✅ |
| 簡介摘要 | rich_text | summary | sync/single:531 | ✅ |
| 上傳檔案 | files | cover_url | sync/single:532 | ✅ |
| 對應對象 | relation→DB08 | related_partner_ids | sync/single:489 | ✅ |
| 對應協作 | relation→DB04 | related_event_id | sync/single:493 | ✅ |
| 對應庫存 | relation→DB07 | related_product_id(s) | sync/single:504 | ✅ |
| 對應明細 | relation→DB06 | （庫存批次用） | sync/single:409 | ✅ |
| 錄取狀態 | status | （reservation 流程） | sync/single:330 | ✅ |
| 執行時間 | date | published_at | sync/single:486, 543 | ✅ |
| 發佈狀態 | status | status | sync/single:542 | ✅ |
| 登記姓名/電話/信箱/出生日/飲食習慣/備註 | rich_text/date | registrations.* | lib/admission-notify.ts:42-47 | ✅ |

### 5.2 ⚠️ 注意事項：官網備項選項
DB05 `官網備項` 當前選項（fetch 確認）：
```
地方通訊 / 觀點論述 / 活動企劃 / 商品介紹 /
地方調研（footer)/ 展售合作（footer)/ 空間體驗（footer)/ 關於我們（footer)/ 走讀漫遊（footer)/
話題推薦 / 地方學堂
```
- 程式對「話題推薦」有特殊處理（sync/single:75-77），對其他選項只是寫進 `web_tag`，前端再依值分頁。
- 「文案撰寫總論指南」與「文案『官網內容』撰寫指南」Notion 頁面提到的選項是「主題展售 / 內容採輯（footer)」等舊名 —— **指南文件與 DB05 實際選項對不上**，但程式無 bug。建議補一筆對照表到指南，或更新 DB05 選項命名。

### 5.3 Supabase orders / registrations / encore_requests / market_applications / vendor_preorders
全部都是 Supabase 端原生表（不是 Notion 同步來的），DB05 同步只負責建立 articles 與更新 orders（admission flow）。一致 ✅。

---

## 6. DB06 進銷明細 — 直接更新 products.stock

### 6.1 對照表
| Notion 欄位 | type | 用途 | 程式引用 | 一致？ |
|-------------|------|------|---------|--------|
| 明細名稱 | title | （未同步） | — | — |
| 登記數量 | number | 增減量 | sync/single:560, 429 | ✅ |
| 對應庫存 | relation→DB07 | 找 product | sync/single:567 | ✅ |
| 進出退換 | rollup（來自 DB05 select） | 動作判斷 | sync/single:558-559 | ✅ |
| 庫存選項 | select（DB05 的，不是 DB06） | 動作（批次流程用） | sync/single:403 | ✅ |
| 對應標籤對象 | relation→DB08 | （未同步到 Supabase） | — | ⚠️ |

### 6.2 觀察
- DB06 schema 還有大量「登記*」與商業欄位（登記售價、登記進價、登記單價、登記評價、明細類型 select）但全都不同步。OK，是設計（Supabase orders/order_items 才是真正交易事實）。
- 「對應標籤對象」是 DB06 連 DB08 的標籤關聯，目前不同步 — 如果未來想做「商品交易 → 觀點/標籤統計」會缺這條 relation 同步。**建議列為 backlog**。

---

## 7. DB07 庫存控管 — products

### 7.1 對照表
| Notion 欄位 | type | Supabase products 欄位 | 程式引用 | 一致？ |
|-------------|------|-----------------------|---------|--------|
| 庫存名稱 | title | name | sync/single:663 | ✅ |
| 商品ID | text | sku | sync/single:662 | ✅ |
| 庫存售價 | number | price | sync/single:665 | ✅ |
| 庫存總計 | formula | stock | sync/single:666 | ✅ |
| 簡介摘要 | rich_text | description | sync/single:667 | ✅ |
| 產品照片 | files | images (jsonb) | sync/single:668 | ✅ |
| 對應作者 | relation→DB08 | author_id | sync/single:620, 669 | ✅ |
| 對應發行 | relation→DB08 | publisher_id / publisher_notion_id | sync/single:621, 670 | ✅ |
| 庫存類型 | select | category | sync/single:639 | ✅ |
| 商品選項 | select | sub_category（拼進 category） | sync/single:640 | ✅ |
| 對應標籤 | relation→DB08 | related_topic_ids (jsonb) | sync/single:643 | ✅ |
| 對應表單 | relation→DB05 | related_article_ids (jsonb) | sync/single:652 | ✅ |
| 進貨屬性 | select | supplier_type | sync/single:673 | ✅ |
| 發佈狀態 | status | status | sync/single:676 | ✅ |
| 頁面狀態 | status | page_status | sync/single:677 | ✅ |

### 7.2 一致性
DB07 同步覆蓋率最完整，沒有改名未更新的問題 ✅。

### 7.3 ⚠️ Supabase 有 `barcode` 欄位但程式不寫
- DB07 沒有「條碼」這種 text 欄位（只有 `條碼貼紙` 是 file）。
- Supabase `products.barcode` 永遠 null。**建議：在 DB07 補一個「商品條碼/EAN」text 欄位，並更新同步**。

---

## 8. DB08 關係經營 — topics / persons / partners / members / staff

### 8.1 對照表
| Notion 欄位 | type | 寫入 Supabase | 程式引用 | 一致？ |
|-------------|------|--------------|---------|--------|
| 經營名稱 | title | topics.name / persons.name / partners.name / staff.name | sync/single:731, 760, 781, 799, 809 | ✅ |
| 經營類型 | select（觀點/標籤/紀錄） | tag_type 映射 | sync/single:695, 732 | ✅ |
| 關係選項 | select（個人/合作夥伴/工作團隊） | members.member_type & 分流 | sync/single:696 | ✅（已是新名） |
| 會員狀態 | status | （isMember 判斷） | sync/single:697 | ✅ |
| 發佈狀態 | status | status | sync/single:698 | ✅ |
| 簡介摘要 | rich_text | topics.summary / persons.bio | sync/single:734, 810 | ✅ |
| 上傳檔案 | files | topics.cover_url | sync/single:734 | ✅ |
| 行政區域 | select 或 multi_select | topics.region (text[]) | sync/single:736-740 | ✅ |
| Email/電話/地址/聯絡人 | text | contact jsonb | sync/single:761, 768, 783-786, 811-815 | ✅ |
| FB粉專/IG粉專/官網ID | url | links jsonb | sync/single:818-820 | ✅ |
| LINE_UID | text | members.line_uid | sync/single:769 | ✅ |
| 單位選項 | select | partners.type | sync/single:781 | ✅ |
| 職級細項 | select | staff.role | sync/single:800 | ✅ |
| 對應標籤庫存 | relation→DB07 | topics.related_product_ids | sync/single:723 | ✅ |
| 對應標籤協作 | relation→DB04 | topics.related_event_ids | sync/single:724 | ✅ |
| 對應標籤表單 | relation→DB05 | topics.related_article_ids | sync/single:725 | ✅ |
| 自對標籤 | relation→DB08 自身 | topics.related_tag_ids | sync/single:726 | ✅ |

### 8.2 注意：「對象選項」→「關係選項」改名
- CLAUDE.md（makesense-ink/CLAUDE.md）的同步邏輯註解明確提到「2026/04/22 改名」(`sync/single/route.ts:696`)。
- 程式已改用「關係選項」✅。
- MEMORY.md 仍然只說「關係選項 select」，沒有舊名陷阱。

### 8.3 Supabase 有但 DB08 沒對應的
- `partners.joined_at`、`persons.updated_at`、`topics.parent_id` — 程式未寫，Notion 也無對應欄位。這些是 Supabase 自動或預留欄位，無 bug。

---

## 9. DB09 日期紀錄 — 不同步
- 預期不同步，無問題。

---

## 10. 三類問題總結

### 🔴 改名未更新（Supabase 同步會抓不到資料）
1. ~~**DB04「對應發佈單位」→ 實際叫「對應辦理單位」**~~ ✅ **已修（2026/04/29）**
   - 檔案：`app/api/sync/single/route.ts:205` 已改為 `rel(props["對應辦理單位"])`

### 🟡 欄位失聯 / 程式期待 Notion 沒有的欄位
- 無。

### 🔵 Supabase 缺欄位（Notion 有資料但無對應）
1. **DB07 條碼欄位**：Supabase 有 `products.barcode` 但 DB07 沒有 text 欄位寫進去（只有 file 形式的 `條碼貼紙`）。
2. **DB06「對應標籤對象」未同步**：未來如要做交易 → 標籤統計需補。
3. **12 個 AI agent 欄位**（ai_meta、ai企劃/分析/搜查/文案/聯想/進度 + 備註 + ai_對應對象/標籤/發行/作者）— 設計上不需同步，記錄供日後決策。

### 🟢 文件 vs 實際選項落差（不影響運作但建議修）
1. 「文案『官網內容』撰寫指南」（Notion 頁面 `3329ff25fdab8017b9a3eae1fb7fb5a2`）裡的 `官網備項` 對照表使用「主題展售 / 內容採輯（footer)」等舊名；DB05 實際選項是「話題推薦 / 地方調研（footer)」等。建議統一為 DB05 實際選項。

---

## 11. 建議行動順序（2026/05 更新進度）
1. ~~**立即修**：sync/single/route.ts:205 把 `對應發佈單位` 改 `對應辦理單位`~~ ✅ 已完成
2. **本週**：驗 DB04 → events.related_partner_ids 有值，必要時手動回填歷史活動。
3. **下週**：DB07 加「商品條碼」text 欄位 + 同步到 products.barcode（POS 用得到）。
4. **長期**：DB06「對應標籤對象」決定要不要同步；指南頁面補 DB05 選項對照。
5. **2026/05 新增**：既有活動 distance_km / duration_min 為 NULL，需各自在 Notion 按一次「發佈更新」才能回填。
