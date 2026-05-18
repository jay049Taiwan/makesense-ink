---
name: notion-page-content-check
description: |
  Notion DB01~09 的「page 內文（body）品質」健檢。觸發詞：`npcc`、「notion 頁內容檢查」「審頁」「page content check」「npcc DB01」「npcc 空頁」「npcc 重複內文」。
  與 nsc / nvc 區分：nsc 看欄位設計、nvc 看欄位值、npcc 看 page 開啟後的內文（body）。
  檢查項目：空頁、只 placeholder、過短、內容重複、缺段落、heading 結構亂、內部連結斷、套件未填。
  預設只掃內容重的 DB（DB01/05/07/08）並抽樣 30 個 page。四九 可以說「npcc 全量」「npcc 全 DB」擴大範圍。
  不會自動修，等 四九 明確指示才動 page。
---

# 啟動器（主版在 Notion）

主版 page ID：`3599ff25fdab8190bdc3f4d3497f9da0`
父頁：「Claude skill指南」

## 觸發後

1. 抓主版頁拿最新檢查清單
2. 依主版 Step 1~5 跑：query → fetch page body → 跑 8 項檢查 → 摺疊輸出 → 結尾問是否要修
3. 預設抽樣（30 page/DB）。`npcc 全量` 跳過抽樣。

## 變化指令

- `npcc DB05` 只掃單一 DB
- `npcc 全量` 不抽樣
- `npcc 全 DB` 連 DB02/03/04/06/09 也掃
- `npcc 空頁` / `npcc 重複` / `npcc 套件未填` 只跑單項

## 例外

- Notion MCP 連不上 → 告知無法執行，不 fallback
- 大量抽樣會耗 30 秒~2 分鐘，跑前先告訴 四九 預估時間
