---
name: hihigm
description: |
  嗨嗨總管巡查。觸發詞：`/hihigm`、「hihigm」、「嗨嗨巡查」「巡查嗨嗨」「嗨嗨家族健檢」
  「巡查管線」「找萃取的地方」「嗨嗨 pipeline 檢查」。
  任務：巡查嗨嗨家族 v3/v4 Telegram reviewer-in-the-loop pipeline 的健康狀態，
  找出需要修整 / 萃取 / 跟進的地方，產巡查報告，不自動動手（除非四九明說）。
---

# 嗨嗨總管巡查（/hihigm）

四九打 `/hihigm` 時，巡查嗨嗨家族 Telegram 管線，產出「乾淨 / 萃取點 / 次要」三段報告。
**只巡查與回報，不自動改 workflow**，除非四九明確說「修」「動手」。

## 管線組成（v4，credential-free）

| 角色 | workflow 名稱 | webhook path |
|------|--------------|--------------|
| Kickoff | 嗨嗨 Kickoff v4 | `db05-claude-runner-v26` |
| Runner | 嗨嗨 Runner v4 | `db06-baton-runner` |
| Reply Handler | 嗨嗨 Reply Handler v4 | `hihi-tg-update`（Telegram bot webhook 指這）|
| 搜查棒 | 嗨嗨 搜查棒 v4 | `db06-search` |
| 聯想棒 | 嗨嗨 聯想棒 v4 | `db06-lianxiang-traversal` |

- flow_state data table id `33eRHCPvnKB1df7g`（欄位 flow_id / auto_mode / last_msg_id）
- 四九 Telegram chat id `8523155253`
- DB06「清單明細」id `3469ff25fdab83c98ff98107ee6a6a1c`
- 設計鐵律：不用 credential 節點，Telegram/Notion/Claude 全走 HTTP Request + `$env`
  （`TELEGRAM_BOT_TOKEN` / `NOTION_INTEGRATION_TOKEN` / `ANTHROPIC_API_KEY` / `N8N_SELF_API_KEY`）

## 巡查步驟

先用 n8n MCP `search_workflows` 撈「嗨嗨」清單拿到當前 5 個 workflow id（id 會隨重佈改變，
一律用名稱查、不寫死）。若搜不到，代表該 workflow `availableInMCP=false`，於報告中標記。

逐項檢查：

1. **上線狀態**：5 個 v4 是否都 active；舊 5 個（Kickoff K7gz / Runner tgAW /
   Reply Handler WFaI / 搜查 IzTY / 聯想 yDWp）是否都 unpublish。
2. **認證乾淨**：每個 workflow 不該有 `credentials` 欄位、不該有 `authentication:
   predefinedCredentialType`、不該有 `n8n-nodes-base.telegram` / `telegramTrigger` 節點。
3. **Telegram webhook**：呼叫 `getWebhookInfo` 確認 url = `.../webhook/hihi-tg-update`、
   `pending_update_count` 不該長期堆積、`last_error_message` 應為空。
4. **近期 executions**：`search_executions` 對 5 個 workflow 撈 status=error，逐筆看錯在哪節點。
5. **多-item 放大**：搜查棒 `Parse Claude` 會吐多 item，確認 gateB tail 入口
   （`Read flow_state B`）有 `executeOnce: true`，否則 auto 模式會重複派工。
6. **flow_state 殭屍列**：data table 內有無 last_msg_id 很舊、卡在中途沒收尾的 flow。
7. **訊息串接 / 按鈕**：關卡 A/B 應為 `✅ OK` / `⏩ OK ALL`（無 Cancel），
   每則訊息應帶 `reply_to_message_id`。

## 報告格式

分三段輸出：
- **✅ 乾淨**：通過的項目
- **⚠️ 萃取點**：需要修 / 跟進的地方，每點寫清楚「現象 → 風險 → 建議修法」
- **ℹ️ 次要**：邊界情況、可選優化

最後問四九：要不要動手修哪幾點。
