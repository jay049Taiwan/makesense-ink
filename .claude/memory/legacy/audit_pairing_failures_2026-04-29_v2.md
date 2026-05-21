---
type: project
date: 2026-05-03
supersedes: audit_pairing_failures_2026-04-29.md
scope: makesense-ink ↔ Notion DB04/05/06/07/08/09 ↔ Supabase
originSessionId: a7d43a70-af42-47c9-9677-a6a2e1de0f31
---

> ⚠️ **[LEGACY]** 2026-04-29 v2 配對失敗稽核，已被 `audit_pairing_failures_2026-04-29_v3.md` 取代。schema 已多輪改名，僅供歷史。

# 配對稽核 v2（2026-05-03 重做）

> 直接以「現在」的 Notion schema 為準。昨天 v1 報告已過時。
> 比對範圍：`/Users/jay049/Documents/工作參考資料/makesense-ink/` 程式碼 vs 6 個 Notion DB（04/05/06/07/08/09）vs Supabase `public` schema。

## 抓 schema 結果（本次）

| DB | name | 屬性數 | title 欄位 |
|----|------|--------|-----------|
| DB04 | DB04交接協作 | 349 | **協作名稱**（NOT「交接名稱」）|
| DB05 | DB05登記表單 | 362 | 表單名稱 |
| DB06 | DB06進銷明細 | 325 | 明細名稱 |
| DB07 | DB07 庫存控管 | ~125 | 庫存名稱 |
| DB08 | DB08關係經營 | 127 | 經營名稱 |
| DB09 | DB09日期紀錄 | ~80 | 紀錄名稱 |

DB04 有兩個重要更名/重組需要全站對齊：
- 「交接名稱」→ 已不是 title。實際 title 是 **協作名稱**。
- 「對應發佈單位」→ 已換成 **對應辦理單位**（這條昨天 v1 也記到了）。
- 「活動類型」→ 已不存在。改用 **活動細項**（10 項：工坊手作 / 陳列展售 / 數位活動 / 典禮儀式 / 文化冊展 / 講座課程 / 園遊市集 / 導覽走讀 / 藝文表演 / 其他）。
- 「單價」→ 不存在。實際是 **實際單價** / **預計單價**。
- 「距離(km)」→ DB04 沒有此欄位（連 `距離` 也沒有，只有 `距離km`）。
- 「最低數量」→ DB04 沒有；DB05 有。
- 「簡介摘要」→ DB04 沒有；DB05/06/07/08 有。
- 「發佈狀態」→ DB04 沒有；用 **登記發佈** status（已發佈/待發佈/不發佈）。

DB09 有兩個欄位 code 在用但其實已不存在：
- 「日期名稱」→ 不存在（title 是 紀錄名稱）。
- 「範圍名稱」→ 不存在。
- DB09 的時間 = **範圍日期** date（OK，code 已 fallback）。

---

## A. 🔴 程式讀的欄位 Notion 不存在（會 null/壞掉）

### A1. DB04 events 同步 — 一票欄位都對不到（最嚴重）

**檔案：`app/api/sync/route.ts` line 450-518（syncEvents）**

```ts
501  title: extractText(props["主題名稱"]?.rich_text)
        || extractTitle(props["交接名稱"]?.title)        // 🔴 交接名稱 不是 title
502  theme:      extractSelect(props["活動類型"]?.select) // 🔴 應為 活動細項
503  event_type: extractSelect(props["活動類型"]?.select) // 🔴
506  distance_km: extractNumber(props["距離(km)"]?.number) // 🔴 DB04 無此欄位
507  price:       extractNumber(props["單價"]?.number)     // 🔴 應為 實際單價/預計單價
514  event_category: extractSelect(props["交接類型"]?.select) // ✅ 還在
516  status: extractStatus(props["發佈狀態"]?.status)     // 🔴 應為 登記發佈
488  pubRel = extractRelation(props["對應發佈單位"]?.relation) // 🔴 應為 對應辦理單位
```

**檔案：`app/api/sync/single/route.ts` line 200-260（DB04 single sync）**

```ts
205  publisherRels = rel(props["對應辦理單位"])  // ✅ 已改正
233  num(props["單價"])                          // 🔴 應為 實際單價/預計單價
242  title: tx(props["主題名稱"]) || t(props["交接名稱"]) // 🔴 交接名稱
243  theme: sel(props["活動類型"])                // 🔴 應為 活動細項
244  event_type: sel(props["活動類型"])           // 🔴
247  distance_km: num(props["距離(km)"])          // 🔴 DB04 無
250  capacity: num(props["數量上限"])             // ✅ 在
251  min_capacity: num(props["最低數量"])         // 🔴 DB04 無「最低數量」
253  description: tx(props["簡介摘要"])           // 🔴 DB04 無「簡介摘要」
259  status: st(props["發佈狀態"])                // 🔴 應為 登記發佈
```

**結論：events 表幾乎所有欄位讀取都壞了**。activities sync 後 Supabase events 會出現 title 用 "未命名活動"、theme/event_type/distance_km/price=0/status=null。

---

**檔案：`scripts/run-sync.mjs` line 134-156（DB04 漸進同步）**

```ts
146  title: extractTitle(props["交接名稱"]?.title)  // 🔴
147  theme: extractSelect(props["活動類型"]?.select) // 🔴
148  event_type: extractSelect(props["活動類型"]?.select) // 🔴
150  price: extractNumber(props["單價"]?.number)    // 🔴
156  status: extractStatus(props["發佈狀態"]?.status) // 🔴 應為 登記發佈
```

**檔案：`scripts/backfill-partner-fields.mjs` line 109**
```ts
const pubRel = extractRelation(props["對應發佈單位"]?.relation) // 🔴 對應辦理單位
```

**檔案：`lib/fetch-bookstore.ts` line 93, 96**
```ts
93  title: extractTitle(props["交接名稱"]?.title)  // 🔴
96  type: extractSelect(props["活動類型"]?.select)  // 🔴 應為 活動細項
```

**檔案：`app/[locale]/buy/[slug]/layout.tsx` line 64-65**
```ts
64  const title = t(props["主題名稱"]) || t(props["交接名稱"])  // 🔴
65  const dateProp = props["執行時間"]?.date || props["活動日期"]?.date // 🔴 活動日期 不存在於任何 DB
```

**檔案：`scripts/generate-search-index.mjs` line 47**
```ts
query(DB04, { property: "活動類型", select: { is_not_empty: true } } ...) // 🔴 filter 失效
```

### A2. DB09 行事曆/時間軸

**檔案：`lib/fetch-all.ts` line 407-410**
```ts
407  const dateRange = props["起算日期"]?.date || props["範圍日期"]?.date;  // 起算日期 DB09 沒有；範圍日期 ✅
410  title: extractTitle(props["日期名稱"]?.title || props["範圍名稱"]?.title)  // 🔴 兩個都不存在
```
DB09 title 是 `紀錄名稱`，沒有「日期名稱/範圍名稱/起算日期」。Fallback 全部失效，所有 DB09 page 會抓不到 title 或 date。

### A3. 其他

**檔案：`lib/fetch-all.ts` line 216**
```ts
quantity: extractNumber(props["檢查數量"]?.number) || 1
```
DB05/DB06 確實有 `檢查數量`（OK），但語意可能誤；不算 bug。

---

## A 總計：🔴 10 個獨立 property name 對不上 schema，影響 7 個檔案，~30 行：

| 程式碼讀的名字 | 應該是什麼 | 出現次數 |
|---|---|---|
| `交接名稱`（DB04 title）| `協作名稱` | 5 |
| `對應發佈單位`（DB04 relation）| `對應辦理單位` | 2 |
| `活動類型`（DB04 select）| `活動細項` | 7（含 1 個 filter）|
| `距離(km)`（DB04 number）| 無（DB04 沒這欄位）| 2 |
| `單價`（DB04 number）| `實際單價` 或 `預計單價` | 3 |
| `發佈狀態`（DB04 status）| `登記發佈` | 7 |
| `最低數量`（DB04）| 無（DB04 沒這欄位） | 1 |
| `簡介摘要`（DB04）| 無（DB04 沒這欄位） | 1 |
| `日期名稱`（DB09 title）| `紀錄名稱` | 1 |
| `範圍名稱`（DB09 title）| `紀錄名稱` | 1 |
| `起算日期`（DB09 date）| `範圍日期` | 1 |
| `活動日期`（layout.tsx fallback）| 不存在 | 1 |

---

## B. 🟡 Supabase 欄位 vs Notion 欄位（同步永遠 null）

Supabase tables 全清單已讀取（28 表/視圖）。對 DB04 events 表：
- `events.duration_min` — code 從 dateInfo end-start 計算（OK）
- `events.distance_km` — Notion DB04 沒有 `距離(km)` 欄位 → 永遠 null。CLAUDE.md 已寫「distance_km 從 DB04『距離(km)』number 欄位同步」但欄位實際不存在。需要在 DB04 加 `距離(km)` 或 `距離km` 欄位，或者改別名。
- `events.related_partner_ids` — code 用 `對應對象 + 對應發佈單位` 合併（後者已改名 對應辦理單位，導致一半資料丟失）。
- `events.event_type` — Notion `活動類型` 已不存在。
- `events.theme` — 同上。
- `events.price` — `單價` 不存在。需要決定要拿 `實際單價` 還是 `預計單價`。

對 events 而言這些欄位實質都是「同步壞掉」（A 類），不是「Supabase 多欄位」。

products / topics / persons / partners 等 DB07/DB08 同步 — 抽樣檢查 `app/api/sync/route.ts` 320-440 — 欄位 `經營名稱 / 經營類型 / 關係選項 / 簡介摘要 / Email / 電話 / 地址 / 聯絡人 / FB粉專 / IG粉專 / 官網ID / 對應作者 / 對應發行 / 庫存名稱 / 庫存售價 / 商品ID / 進貨屬性 / 頁面狀態` 全部 ✅ 存在。

DB05 articles 同步 — `表單名稱 / 主題名稱 / 簡介摘要 / 上傳檔案 / 文案細項 / 官網備項 / 對應協作 / 對應庫存 / 對應對象` 全部 ✅。

**結論：B 類有意義的只有 events 那幾條，且都已併入 A 類。**

---

## C. 🟢 Notion 有但程式沒讀（backlog，非 bug）

DB04 有 349 properties，code 只讀十多個。其餘像 `值班顧店狀態 / Pos小結 / 場地細項 / 餐飲細項 / 包車細項 / 預估維護 …` 等都是 Notion 後台用，不需要進 Supabase，無需處理。

---

## 受影響最嚴重的 DB

1. **DB04** — events 同步 50% 欄位壞掉，是這次 schema 大調整的震央。
2. **DB09** — 行事曆 fetch-all.ts 抓不到 title/date，整個 timeline 元件可能空白。
3. DB05/06/07/08 受影響輕微（單筆欄位都 OK，只是 fallback 路徑碰到 DB04 名字才壞）。

---

## 最該優先修的 5 條（含檔案行號）

1. **`app/api/sync/route.ts` 488, 501-516**（sync events 主路徑）
   - 488: `對應發佈單位` → `對應辦理單位`
   - 501: `交接名稱` → `協作名稱`
   - 502-503: `活動類型` → `活動細項`
   - 506: `距離(km)` → 確認 DB04 欄位名（建議在 Notion 補欄位）
   - 507: `單價` → `實際單價` (或 `預計單價`)
   - 516: `發佈狀態` → `登記發佈`

2. **`app/api/sync/single/route.ts` 233, 242-259**（webhook 即時同步，影響「發佈更新」按鈕流程）
   - 233 / 242 / 243 / 244 / 247 / 251 / 253 / 259 同上對齊。

3. **`scripts/run-sync.mjs` 146-156**（n8n daily sync 漸進腳本，每天 8AM 跑）
   - 146 / 147 / 148 / 150 / 156 同上對齊。

4. **`lib/fetch-all.ts` 407-410**（DB09 行事曆/時間軸 fallback 全失效）
   - 407: 移除 `起算日期` fallback，只保留 `範圍日期`。
   - 410: `日期名稱 / 範圍名稱` → `紀錄名稱`。

5. **`lib/fetch-bookstore.ts` 93, 96** + **`app/[locale]/buy/[slug]/layout.tsx` 64-65**（市集預購頁與書店事件卡讀不到 title）
   - 93/64: `交接名稱` → `協作名稱`
   - 96: `活動類型` → `活動細項`
   - 65: 移除 `活動日期` fallback。

附帶（修第 1-3 條時順便 fix）：
- `scripts/backfill-partner-fields.mjs` 109: `對應發佈單位` → `對應辦理單位`
- `scripts/generate-search-index.mjs` 47: `活動類型` filter → `活動細項`

---

## 不需處理（已對齊）

- DB04 title 與「主題名稱」共存：CLAUDE.md 規範 priority `主題名稱 > title`，因此修正 title 欄位名後 events 仍能正常拿到顯示用 title。
- 14 個 ai_* 欄位純 Notion 內部用，不需 Supabase 對應（已在每個 DB 確認存在）。
- DB05 `對應對象 / 表單類型 / 登記選項 / 庫存細項 / 文案細項 / 官網備項 / 主題名稱 / 上傳檔案 / 錄取狀態 / 紀錄備項 / 請款請購 / 登記單價 / 責任執行` 全部 OK。
- DB06 `明細名稱 / 登記售價 / 登記進價 / 登記單價 / 登記數量 / 對應庫存 / 對應表單 / 對應協作 / 對應明細 / 進出退換` 全部 OK。
- DB07 `庫存名稱 / 庫存售價 / 庫存類型 / 商品ID / 商品選項 / 選書細項 / 進貨屬性 / 對應作者 / 對應發行 / 對應標籤 / 對應表單 / 頁面狀態 / 發佈狀態 / 產品照片` 全部 OK。
- DB08 `經營名稱 / 經營類型 / 關係選項 / 會員狀態 / 單位選項 / 職級細項 / Email / 電話 / 地址 / 聯絡人 / FB粉專 / IG粉專 / 官網ID / 自對標籤 / 對應標籤庫存 / 對應標籤協作 / 對應標籤表單 / 行政區域 / LINE_UID` 全部 OK。
