---
name: DB06 訂單建立時明細類型規則
description: makesense.ink 訂單寫入 Notion DB06 時，明細類型欄位必須為「報名登記」
type: feedback
originSessionId: cb92f33f-3e50-45b7-a8e5-5b779817f340
---
官網 /api/checkout 建立 Notion DB06 明細時，欄位「明細類型」一律設為「報名登記」（不是「庫存紀錄」，也不用按商品類型分流）。

**Why:** 四九 在 2026/04/23 明確指示：來自訂單的 DB06 明細都算報名登記，這是他規劃 Notion schema 時的分類意圖。

**How to apply:** 修改 `makesense-ink/app/api/checkout/route.ts` 的 DB06 建立區段，以及未來任何「訂單→DB06」的寫入邏輯（例如錄取確認、退款、補建 DB06 的流程），`明細類型` 都用 `"報名登記"`，不要按 `item.type` 或 `orderMode` 切換。
