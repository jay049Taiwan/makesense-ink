---
description: 嗨嗨檢核 — 手動觸發的驗收檢查。接 Notion URL 跑 pipeline 5 項檢核;接結構化完成報告則驗證聲明是否屬實。一律唯讀、一律派子 agent 取線上現場狀態(避免母 session context 偏見)。含混輸入直接退件要表單,不腦補。
---

請依使用者輸入的 $ARGUMENTS 觸發並執行 skill `hihicheck`。優先使用 Skill tool 載入 `hihicheck` 並按其 SKILL.md 規範執行。
