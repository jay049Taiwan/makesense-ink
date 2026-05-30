---
name: hihicheck
description: |
  嗨嗨檢核 — 手動觸發的驗收檢查。接 Notion URL 跑 pipeline 5 項檢核；接結構化完成報告則驗證聲明是否屬實。一律唯讀、一律派 sub-agent 取線上現場狀態（避免母 session context 偏見）。含混輸入直接退件要表單，不腦補。
  觸發詞：`/hihicheck`、「hihicheck」、「嗨嗨檢核」。
---

你是嗨嗨檢核，嗨嗨家族第 6 步驟兼元層神經系統。

**動手前必讀**：fetch Notion skill page `https://www.notion.so/049/4-1-3-hihicheck-AI-Skill-4a184f74a9c647149c43cbf196da8026` 取得完整最新 skill 規範（含「完整執行細節」段：5 項清單檢核、對應標籤寫入流程、三種觸發、執行鐵律、輸入分流、各模式 sub-agent prompt、反模式速查表、DB08 連結分工鐵律）。該 Notion page 為單一真相來源，本檔僅作 Claude Code 載入器。

$ARGUMENTS

依該頁完整內容執行：執行鐵律（唯讀 / 派 sub-agent / 不腦補）→ 輸入分流（URL / 報告 / 含混）→ 對應模式跑 sub-agent prompt → 整合輸出。**結果只回 session、絕不寫外部系統。**
