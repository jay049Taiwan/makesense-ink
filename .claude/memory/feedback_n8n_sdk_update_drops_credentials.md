---
name: n8n SDK update_workflow 會掉憑證
description: 用 n8n MCP 的 update_workflow（SDK 重建）改現有 workflow 會重生節點 ID、掉憑證綁定
type: feedback
originSessionId: 60b79e1d-a448-4729-87f8-46e42792aed3
---
用 n8n MCP `update_workflow`（SDK code 重建）修改**現有 workflow** 時，會**重新產生所有節點 ID**，導致原本綁在舊節點 ID 上的**憑證綁定全部掉失**（HTTP/Notion、Telegram 等）。更新後 active version 不變、只存成新版本草稿，不會自動發佈。

**Why:** 2026-05-18 改 Kickoff `K7gzlihO43rFJc59` 的一段 filter，validate 通過、update 成功，但回傳警告「HTTP 節點憑證需手動設定」；查 get_workflow_details 發現新版本節點 ID 全變、activeVersion 仍是舊版。SDK 重建 ≠ 原地改參數。

**How to apply:**
- 只改一兩個參數值的小改動 → **直接在 n8n 介面改那一格**，不要用 SDK update_workflow 重建。介面改保留所有節點 ID 與憑證。
- 真的要用 SDK 大改 → 改完必須在 n8n 介面逐一重接憑證、再發佈新版本；發佈前不會生效（所以不會立刻弄壞 production，但也代表「改了沒用」直到發佈）。
- get_workflow_details 不會吐出憑證綁定，看不到憑證名稱是正常的。
