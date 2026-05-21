---
description: "check3+5 — makesense DB schema 三路稽核＋五重驗證。DB schema 改動後自動找出所有需對齊位置（程式碼 / 本地 MD / Notion 指南），產整合報告，再動手修。禁用字串偵測、DB04 欄位值核對、分析備註/檢核備註 改名殘留掃描（揪舊名 ai備註/ai_meta）等。"
argument-hint: "[不填直接跑全掃]"
---

**動手前必讀**：完整 SOP 的單一真相來源 = 本機 skill `~/.claude/skills/check3-5.md`（三路並掃 / 禁用字串清單 / 誤報規則 / DB04 有效值 / 5 重驗證 / 工作流程）。打 `/check3&5` 即依該 SOP 執行全掃。

## 為什麼真相來源在本機、不在 Notion

check3&5 是 **Claude-Code-only 工具** —— 要讀 code、讀本機 MD、跨系統比對 Supabase，這些 Notion AI agent 都搆不到、Notion 內無法執行。所以它不走「Notion 主版」啟動器模式，SOP 直接住在本機 skill 檔。

> 舊 Notion 頁 `3609...` 已於 2026/05/18 退役（原本一頁雙裝 check3&5 + 嗨嗨檢核棒；檢核棒已遷 4-2-7、check3&5 SOP 收回本機）。
