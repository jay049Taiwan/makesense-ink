---
name: notion-value-check
description: |
  Notion DB01~09 的「資料填寫品質」健檢。觸發詞：`nvc`、「notion 值檢查」「審值」「資料品質」「nvc DB05」「nvc 空值」「nvc 孤兒 relation」。
  與 nsc 區分：nsc 看欄位本身是不是設計好，nvc 看每個 page 的值是不是乾淨。
  檢查項目：title 重複、必填欄位空值、relation 孤兒、數值異常、date 圍外、status 缺漏、殭屍 select 值、URL 格式錯。
  不會自動修，等 四九 明確指示才動 page。
---

# 啟動器（主版在 Notion）

主版 page ID：`3599ff25fdab8199bca7e478175445ac`
父頁：「Claude skill指南」

## 觸發後

1. 抓主版頁拿最新檢查清單與「關鍵欄位」名單
2. 依主版 Step 1~5 跑：query 9 DB → 跑 8 項檢查 → 摺疊輸出 → 結尾問是否要修
3. 不主動改 page，動之前 四九 必須明確說「修 X」

## 變化指令

- `nvc DB05` 只掃單一 DB
- `nvc 空值` / `nvc 孤兒 relation` / `nvc 重複 title` 只跑單項
- `nvc 加關鍵欄位 X` / `nvc 拿掉 Y` 修改主版的關鍵欄位清單

## 例外

- Notion MCP 連不上 → 告知無法執行，不 fallback
