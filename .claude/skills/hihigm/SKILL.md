---
name: hihigm
description: |
  嗨嗨總管巡查入口。觸發詞：`/hihigm`、「hihigm」、「嗨嗨巡查」「巡查嗨嗨」「嗨嗨家族健檢」
  「巡查管線」「找萃取的地方」「嗨嗨 pipeline 檢查」。
  本檔只是入口；嗨嗨總管的工作定義與巡查職責一律以 Notion 指南頁為單一真相來源。
---

# 嗨嗨總管巡查（/hihigm）

**嗨嗨總管的工作內容、巡查職責、巡邏訊號 一律以 Notion 為單一真相來源，不寫在本檔。**
（四九要能直接在 Notion 查改，所以校正過的工作規則一律寫進下列 Notion 頁，不寫 hihigm.md。）

載入此 skill 後：

1. 先用 Notion MCP `fetch` 抓 **「4-2-1-1 嗨嗨總管工作指示」**
   （id `3639ff25fdab806f9710e1e676d4ab0d`）—— 嗨嗨總管全部工作規則的真相來源。
2. 巡邏訊號細節再 fetch **巡邏訊號頁**（id `ae64587214664fdcaff008c3574112f3`）。
3. 依該頁「核心任務 3：主動巡邏與洞察」的巡邏訊號執行巡查（眼睛看 Notion DB01-09 與 DB06 觸發 page）。

## 鐵律

- **校正嗨嗨總管工作內容 → 寫進上述 Notion 指南頁，不寫本檔。** 本檔永遠只當入口。
- `/hihigm` 巡查「報告」只輸出在 claude session 聊天，**不寫進 Notion**（四九對 Notion AI 沒信心，巡查結論不落 Notion）。
- 只巡查與回報，不自動改 Notion page / 不改 workflow。要動手等四九明說。

## 速查（會變動，以 Notion 為準）

- DB06 細部流程 = 觸發 page；target = 名稱含「對應」的 relation 指向的 DB01-09 任一 page。
- n8n v4 workflow（credential-free）：嗨嗨 Kickoff / Runner / Reply Handler / 搜查棒 / 聯想棒 v4。
- flow_state data table `33eRHCPvnKB1df7g`；四九 Telegram chat id `8523155253`。
