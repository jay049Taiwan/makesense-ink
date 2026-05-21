---
name: 票券商品模式（方案 B）
description: 活動票券放在 DB07 作為通用商品，跨活動共用同一票種，order_items 同時記錄票券和對應活動
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---

## 核心決策

活動報名的票券採用「**DB07 通用商品**」模式，不是為每場活動各建一筆票券。

## DB07 票券商品的 schema 位置

票券 = **商品選項 = 數位** + **數位細項 = 票券**。

| DB07 欄位 | 票券的值 |
|---|---|
| 庫存名稱（title）| 例：市集活動票券、導覽走讀票券 |
| 商品選項（select）| **數位**（三選項之一：選書 / 選物 / 數位）|
| 數位細項（select）| **票券** |

## 設計要點

- DB07 有固定票種商品：市集活動票券、導覽走讀票券 等；價格固定
- **一個票種可跨多場活動銷售**（市集票券在活動 A 賣 10 張、活動 B 賣 8 張都算同一個 DB07 商品）
- Supabase `order_items` 表同時記錄 `item_id`（哪個票券商品）和對應的 `event_id`（哪場活動）
- DB07 stock 追蹤的是該票種的總售出/庫存量（跨活動加總）

## 跟 DB05/DB06 的關聯（庫存異動唯一路徑）

票券售出 = 客戶訂購訂單 = 出貨。走這條：

```
DB05 登記內容（一張訂單 = 一筆 DB05）
├── 內容類型   = 報名登記
├── 登記類別   = 紀錄庫存
├── 庫存選項   = 出貨
├── 對應對象   → DB08（客戶）
├── 對應明細   → DB06（1 對 N，多票種一起買時有多筆 DB06）
└── 建立日期

    DB06 清單明細（每個票券品項一筆）
    ├── 明細類型 = 庫存紀錄
    ├── 數量     = 絕對值（幾張票）
    ├── 單價     = number（票價）
    └── 對應庫存 → DB07 票券商品（1 對 1）
```

所以：**一筆訂單買 2 張市集票 + 1 張走讀票 = 1 筆 DB05 + 2 筆 DB06**，兩筆 DB06 分別連到兩個 DB07 票種商品。

## Why

票價固定、票種少，不需要每場活動都建一筆票券。一個通用票種搭配活動關聯更乾淨：
- 活動調整時不用改票券
- 跨活動庫存/售出統計更容易（rollup 到 DB07）
- 合作單位要看「我的票賣了幾張」只要查 DB07 對應的作者/品牌 relation → DB08 錨點反查 DB06 即可

## How to apply

1. **前端 checkout** 同時傳入 `productId`（DB07 票券 ID）和 `eventId`（DB04 活動 ID）
2. **Supabase order_items** 至少有 `order_id, item_id, event_id, quantity, price` 五欄
3. **庫存扣帳** 扣在 Supabase `products.stock`（觸發器或 cron 由 DB06 同步）
4. **Notion 資料流** 依照上方「DB05→DB06→DB07」規則寫入（客戶訂購訂單的出貨路徑）
5. **DB07 票券商品篩選**（供官網顯示）：`商品選項=數位 AND 數位細項=票券`

## 參考

- Supabase tables：`members / orders / order_items / registrations / reviews / products / events / articles ...`（見 `makesense-ink/CLAUDE.md`）
- 庫存異動完整規則：見 `memory/notion_structure.md` 與 `memory/session9_progress.md`
