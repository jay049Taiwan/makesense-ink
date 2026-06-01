---
name: hihicheck
description: |
  嗨嗨檢核 — 手動觸發的驗收檢查。觸發詞：`/hihicheck`、「hihicheck」、「嗨嗨檢核」。
  接 Notion URL 跑 pipeline 5 項檢核；接結構化完成報告則驗證聲明是否屬實。
  一律唯讀、一律派子 agent 取線上現場狀態（避免母 session context 偏見）。
  含混輸入直接退件要表單，不腦補。
---

# 啟動器（本檔僅為指針，主版在 Notion）

每次載入此 skill，**先用 Notion MCP 抓取主版頁**：

- 主版 page ID：`4a184f74a9c647149c43cbf196da8026`
- 主版標題：`Skill-02.hihicheck`
- 父頁：「各類指南」（`2799ff25fdab80fea78ee261b4e792a2`）
- 設計頁（角色定位／邊界）：`3639ff25fdab818c87d5f1ea2f812424`（3-8.嗨嗨檢核原廠設定）

**以該頁內容為準**。Sub-agent prompt、主 session 整合輸出格式、反模式速查表都寫在 Notion。

## 例外狀況

- Notion MCP 連不上時：fallback 用本機記憶的核心鐵律：
  1. READ-ONLY，不 PATCH Notion、不執行 n8n、不寫檔案
  2. 一律派 sub-agent 抓現場，不信母 session context
  3. 每條發現帶證據（頁名 + 段落 + 原文片段）
  4. 含混輸入直接退件要表單，不腦補
  5. 寧可少報不要過報（克制力比覆蓋率重要）
