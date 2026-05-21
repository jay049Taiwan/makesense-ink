---
name: Telegram Bot 設定
description: 四九 的 Telegram User ID 與 AI 總管 Bot 設計方向
type: reference
originSessionId: d473c56b-7f86-4e72-9048-e8320f32a06e
---
## 四九 的 Telegram User ID
`8523155253`

用途：未來建立「嗨嗨總管」Telegram Bot 時，**chat_id 鎖定這個 ID**，只私訊 四九 一人。其他人傳訊息給 Bot 一律忽略（白名單過濾）。

## 背景
- Discord Bot 已取消，改全面使用 Telegram
- Telegram Bot 將承擔：
  - DB08 資料品質審查推送
  - AI 總管功能（推送、查詢、按鈕回覆）
- 設計原則：單一「嗨嗨總管」Bot 包所有功能，內部用快捷指令分流（/審查、/業績、/今日）

## 待確認事項（下個 session 繼續討論）
- 「同事」分流：AI 嗨嗨家族 vs 真人員工，要不要分管道
- AI 總管定位：通知中心 vs 手機版 Agent
- Bot Token 尚未建立（需到 BotFather 申請）
