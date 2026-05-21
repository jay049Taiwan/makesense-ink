---
name: Footer 四頁面上下半部架構
description: 關於我們/展售合作/空間體驗/內容採輯四個頁面的資料來源架構 — 上半部來自 DB05 官網備項、下半部來自 Supabase 動態資料
type: project
originSessionId: f8f02db8-9b4a-4873-961d-1abbc5b17ff7
---
## Footer 連結的四個頁面架構

每個頁面分上半部和下半部：

### 上半部：DB05 官網備項（編輯性內容）

從 Notion DB05「登記內容」撈取，篩選條件：
1. `文案選項` = `網頁社群` + `社群細項` = `Sense官網`
2. `官網備項` 對應到各頁面

| 頁面 | 路由 | DB05 官網備項值 |
|------|------|----------------|
| 關於我們 | /sense | 關於我們（footer) |
| 展售合作 | /market-booking | 展售合作（footer) |
| 空間體驗 | /space-experience | 空間體驗（footer) |
| 內容採輯 | /content-curation | 內容採輯（footer) |

頁面正文（Notion blocks）直接渲染為官網上半部內容。

**Why:** 頁面上半部的文案由 Notion 團隊在 DB05 維護，透過官網備項標籤對應到官網各頁面位置。這個機制讓非工程師也能直接從 Notion 更新官網文案。

**How to apply:** 前端查詢時需用 `文案選項=網頁社群` + `社群細項=Sense官網` + `官網備項` 篩選，抓取頁面正文（content），渲染為上半部。目前 Supabase articles 表尚未同步「官網備項」欄位，需先新增欄位或直接走 Notion API。

### 下半部：Supabase 動態資料（各頁面不同展示邏輯）

| 頁面 | 下半部區塊 |
|------|----------|
| 關於我們 /sense | 時間軸、核心能力、營運效益 |
| 展售合作 /market-booking | 自製商品、展售品牌、活動招商 |
| 空間體驗 /space-experience | 空間體驗、走讀路線 |
| 內容採輯 /content-curation | 關鍵字 |

下半部詳細設定待補充。
