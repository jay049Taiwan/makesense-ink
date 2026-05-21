---
name: LINE 官方帳號整合交接
description: LINE Bot/LIFF/Rich Menu/Webhook/推播/AI客服 的完整開發狀態，供下一個 session 接手
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---
## LINE 整合目前狀態（2026/04/15）

### 已完成（程式碼）
| 功能 | 檔案 | 狀態 |
|------|------|------|
| LINE Bot SDK | `lib/line.ts` | ✅ client singleton |
| AI 客服（Claude Haiku）| `lib/line-chat.ts` + `app/api/line/chat/route.ts` | ✅ |
| AskPanel 接真實 AI | `app/[locale]/dev/line-simulator/AskPanel.tsx` | ✅ |
| Flex Message 5 種模板 | `lib/line-flex-templates.ts` | ✅ |
| 推播 API | `app/api/line/push/route.ts` | ✅ |
| 群發 API | `app/api/line/broadcast/route.ts` | ✅ |
| Webhook 接收 | `app/api/line/webhook/route.ts` | ✅ |
| 訂單 LINE 通知 | `app/api/checkout/route.ts` 自動觸發 | ✅ |
| 通知觸發器 | `lib/line-notifications.ts` | ✅ |
| Rich Menu 圖片 | `public/images/rich-menu.png`（2500x1686） | ✅ |
| Rich Menu 腳本 | `scripts/setup-rich-menu.ts` | ✅ |
| LIFF Provider | `components/providers/LiffProvider.tsx` | ✅ |
| LIFF Auth API | `app/api/liff/auth/route.ts` | ✅ |
| LIFF Bind API | `app/api/liff/bind/route.ts` | ✅ |
| LINE Login | `lib/auth.ts` NextAuth LINE Provider | ✅ |
| Supabase 推播紀錄 | `line_message_log` 表 | ✅ |

### 已完成（LINE 後台設定）
- Webhook URL: `https://makesense.ink/api/line/webhook` ✅ 驗證通過
- Use webhook: ON ✅
- LIFF App: `2009300819-5OyjRae6`，Endpoint: `https://makesense.ink?liff_mode=true` ✅
- Rich Menu: `richmenu-aec5fb23f5052e443e6431fd3b2c65ef` 已建立 + 圖片上傳 + 設為預設 ✅
- Vercel 環境變數: `LINE_CHANNEL_ACCESS_TOKEN` + `LINE_CHANNEL_SECRET` 已設定 ✅

### 待確認/待做
1. **Auto-reply 和 Greeting 要關掉** — LINE Official Account Manager 裡的自動回覆和招呼語要關閉，否則會跟我們的 webhook 重複回覆
2. **Rich Menu 按鈕功能測試** — LIFF Endpoint 已設好，需實際在 LINE app 測試每個按鈕
3. **AI 客服測試** — 在 LINE 發訊息看 webhook 是否正確回覆
4. **訂單推播測試** — 實際下單後確認 LINE 推播是否送達
5. **報名結果通知** — n8n workflow 需要建「Notion 錄取結果變更 → POST /api/line/push」
6. **LINE 商品搜尋** — 目前 AI 客服只會文字回覆，可以加上搜尋 Supabase 後回傳 Flex Message 商品卡片
7. **LINE 會員綁定流程** — LiffProvider 有 needsBind 狀態，但綁定 UI 尚未在頁面上實作
8. **Flex Message 測試** — 5 種卡片模板未實際發送測試過

### LINE 帳號資訊
- Bot ID: `@964ervay`
- Bot 名稱: 旅人書店
- Provider: sensemakesense
- Messaging API Channel: 旅人書店
- LINE Login Channel: 旅人書店/宜蘭文化俱樂部
- LIFF ID: `2009300819-5OyjRae6`
- Rich Menu ID: `richmenu-aec5fb23f5052e443e6431fd3b2c65ef`

### 環境變數
- `LINE_CHANNEL_ACCESS_TOKEN` — Vercel + .env.local 已設定
- `LINE_CHANNEL_SECRET` — Vercel 已設定，.env.local 尚未加
- `AUTH_LINE_ID=2009300819` — LINE Login
- `AUTH_LINE_SECRET` — LINE Login
- `NEXT_PUBLIC_LIFF_ID=2009300819-5OyjRae6`
- `ANTHROPIC_API_KEY` — AI 客服用（Claude Haiku）

### Webhook 流程
```
用戶在 LINE 發訊息
→ LINE Platform POST https://makesense.ink/api/line/webhook
→ 驗證簽名（LINE_CHANNEL_SECRET）
→ 文字訊息 → generateChatReply()（Claude Haiku）→ replyMessage
→ follow 事件 → 歡迎 Flex Message
→ postback action=ask → AI 介紹訊息
```

### Rich Menu 6 按鈕配置（2026/04/15 重新設計後，權威來源 makesense-ink/CLAUDE.md）
```
📚 選書選物 → /liff/shop        | 🎪 活動體驗 → /liff/events      | 🗺️ 觀點漫遊 → /liff/viewpoints
🛒 確認結帳 → /checkout         | 📮 地方通訊 → /liff/newsletter  | 👤 會員中心 → /liff/member
```
（2026/04/15 舊版曾為 liff://xxx scheme + 「問問我們」第 6 格，已作廢）
