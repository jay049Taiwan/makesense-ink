---
name: dbcheck
description: |
  DB 級全套稽核入口。集成 nsc + nvc + npcc 三合一(+ check3-5 選配),對指定 DB 跑欄位設計 / 資料填寫 / page 內文 / 跨系統同步全套健檢。
  觸發詞：`dbcheck`、「DB 健檢」「整 DB 稽核」「dbcheck DB05」「dbcheck 快」「dbcheck 同步」「dbcheck DB05 全套」。
  與 hihicheck 區分:hihicheck 看單 page 內容驗收;dbcheck 看整 DB 結構/值/內文。
  唯讀,不主動改任何東西,等 四九 明確指示才動。
---

# 啟動器（主版在 Notion）

主版 page ID：`3669ff25fdab81bb8f01d56adfb6ff9b`
父頁：「Claude skill指南」

## 觸發後

1. 抓主版頁拿最新流程
2. 依主版 Step 0~4 跑：URL 解析 → 規模 check → 派子 agent 並列跑 nsc/nvc/npcc → 聚合三段報告 → 問要不要動
3. 拒絕 page URL,退件「這是 page 級,請用 hihicheck」
4. 不主動改任何東西,動之前 四九 必須明確說「修 X」

## 變化指令

- `dbcheck DB05` 只掃 DB05
- `dbcheck <db-url>` / `dbcheck <view-url>` 用 URL 指定範圍
- `dbcheck 快` 只跑 nsc
- `dbcheck 同步` 加跑 check3-5
- `dbcheck DB05 全套` 三合一 + check3-5
- `dbcheck DB05 schema` / `value` / `content` 只跑單一層

## 例外

- 給 page URL → 退件提示用 hihicheck
- Notion MCP 連不上 → 告知無法執行,不要 fallback 用舊資料
