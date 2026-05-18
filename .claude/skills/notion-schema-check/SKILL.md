---
name: notion-schema-check
description: |
  Notion 9 個 DB（DB01~09）的 schema/欄位健檢工具。觸發詞：`nsc`、「notion 欄位檢查」「審欄位」「Notion schema check」「整 schema」「nsc DB05」「nsc 快」「nsc 完整」「nsc relation」。
  每次觸發跑全掃（或指定範圍），輸出「哪裡不對勁」報告。檢查項目：description 缺漏、命名混雜、跨 DB 撞名、select 殭屍選項、relation 異常、欄位殭屍、AI 欄位待設。
  不會自動修，等 四九 明確指示才動 schema。
---

# 啟動器（主版在 Notion）

主版 page ID：`3599ff25fdab816892b8cb2f24d07d11`
父頁：「Claude skill指南」

## 觸發後

1. 抓主版頁拿最新流程
2. 依主版 Step 1~4 跑：fetch 9 DB schema → 跑 7 項檢查 → 輸出報告 → 問要不要修
3. 不主動改 schema，動之前 四九 必須明確說「修 X」

## 變化指令

- `nsc DB05` 只掃單一 DB
- `nsc 快` 跳過殭屍檢查
- `nsc 完整` 全跑（預設）
- `nsc relation` / `nsc 命名` / `nsc 無說明` 只跑單一檢查項

## 例外

- Notion MCP 連不上 → 告知無法執行，不要 fallback 用舊資料
