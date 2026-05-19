---
name: hihigm
description: |
  嗨嗨總管巡查。觸發詞：`/hihigm`、「hihigm」、「嗨嗨巡查」「巡查嗨嗨」「嗨嗨家族健檢」
  「巡查管線」「找萃取的地方」「嗨嗨 pipeline 檢查」。
  任務：用 Notion 當眼睛，巡查 DB05/DB06 裡嗨嗨家族 reviewer-in-the-loop flow 的
  資料狀態，找出卡住 / 待萃取 / 待跟進的地方，報告只吐在 claude session 聊天，
  不寫進 Notion。只巡查與回報，不自動改 Notion / workflow，除非四九明確說「修」「動手」。
---

# 嗨嗨總管巡查（/hihigm）

四九打 `/hihigm` → **眼睛看 Notion、嘴巴在聊天**。
巡查 Notion DB05/DB06 裡每條嗨嗨 flow 的進行狀態，產「✅ 乾淨 / ⚠️ 萃取點 / ℹ️ 次要」三段報告。

鐵律：
- **報告只輸出在 claude session 聊天，絕不寫進 Notion。**（四九對 Notion AI 沒信心，巡查結論不落 Notion。）
- 只巡查與回報，不自動改 Notion page / 不改 workflow。要動手等四九明說。

## 巡查對象（Notion）

| DB | 名稱 | 用途 | data source id |
|----|------|------|----------------|
| DB06 | 清單明細 | 嗨嗨 flow 的棒次（明細類型=細部流程）+ 搜查產出（明細類型=資料參考）| `3469ff25fdab83c98ff98107ee6a6a1c` |
| DB05 | 登記內容 | flow 的 target 內容頁 | `e5f14f056c7c4b8a804304eab598fd4d` |

用 Notion MCP（`search` / `fetch`，data_source_url 帶 `collection://<id>`）查。
一條 flow = 一個 DB05 target，底下一組 DB06「細部流程」棒次（用 DB06.對應內容 relation 串）。

DB06 細部流程關鍵欄位：`明細名稱`(title) / `ai模式`(select) / `ai狀態`(status：待執行/執行中/完成) /
`排序`(number) / `執行構想`(rich_text) / `對應內容`(relation→DB05) / `執行備註` / `last_edited_time`。

## 巡查步驟

1. 查 DB06「明細類型=細部流程」全部棒次，依 `對應內容` 分組成 flow。
2. 逐條 flow + 逐棒檢查，抓萃取點：
   - **卡住的棒**：`ai狀態=執行中` 但 `last_edited_time` 已過很久（>30 分鐘）→ 棒跑掛了或沒收到回覆。
   - **該觸發沒觸發**：`ai模式` 有值、`ai狀態` 還停在 待執行/空白，且同 flow 前面的棒已完成 → 卡在沒人按 OK。
   - **執行構想空白**：棒的 `ai模式` 有值但 `執行構想` 空 → 會用預設規格跑，產出可能不對。
   - **排序異常**：同一 flow 內 `排序` 重複、跳號、或為空。
   - **半完成 flow**：一組細部流程有完成有未完成、且最後動作時間很舊 → flow 中途斷掉沒收尾。
   - **孤兒棒**：DB06 細部流程 `對應內容` 空、或指向不存在的 DB05。
   - **資料參考堆積/孤兒**：搜查棒建的「明細類型=資料參考」page，`對應內容` 指不到 target，或某 target 底下異常爆量。
3. 對照 DB05 target：`主題名稱`/`簡介摘要` 該被企劃棒填卻還空白、`發佈狀態` 卡住。
4. （次要、一行帶過）n8n 端：用 n8n MCP `search_workflows` 確認 5 個 v4
   （嗨嗨 Kickoff/Runner/Reply Handler/搜查棒/聯想棒 v4）還都 active。

## 報告格式（只在聊天輸出）

- **✅ 乾淨**：通過的 flow / 項目
- **⚠️ 萃取點**：卡住或要跟進的，每點寫「哪條 flow / 哪一棒 → 現象 → 建議動作」，附 Notion page id
- **ℹ️ 次要**：邊界情況、可選優化

最後問四九：要不要動手處理哪幾點（修 Notion 資料 / 重觸發某棒 / 改 workflow）。

## 參考（管線組成，v4 credential-free）

Kickoff（webhook `db05-claude-runner-v26`）/ Runner（`db06-baton-runner`）/
Reply Handler（`hihi-tg-update`）/ 搜查棒（`db06-search`）/ 聯想棒（`db06-lianxiang-traversal`）。
flow_state data table `33eRHCPvnKB1df7g`。四九 Telegram chat id `8523155253`。
