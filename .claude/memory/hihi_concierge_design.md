---
name: 嗨嗨總管 Telegram Bot 完整設計
description: 四九 私人 AI 總管 Bot 的完整架構、職責、互動模式、部署路線（已決定 Plan B Mac 本地）
type: project
originSessionId: d473c56b-7f86-4e72-9048-e8320f32a06e
---
## 核心定位
**「像真人同事一樣傳訊息問你的 AI 顧問」**
- 角色：四九 私人 AI 總管
- 平台：Telegram Bot 私訊（chat_id `8523155253` 鎖定，只有 四九 一人）
- 介面：iPhone Telegram，像聊天一樣

## ⭐ Telegram 整體 scope（2026/04/24 確認）
**Telegram 整個生態系（Bot、Mini App、未來群組）只給「工作團隊」用，不對外**

| 對象 | 工具 |
|---|---|
| 工作團隊（內部）| **Telegram**（Bot + Mini App + 未來群組）|
| 客戶 / 合作夥伴 / 公眾（外部）| LINE OA + makesense.ink 官網 + LIFF |

實作含意：
- 所有 Telegram 入口都鎖「DB08 關係選項=工作團隊」（同步到 Supabase staff 表）
- 未來群組只邀請 staff
- AI 主動推送只給 staff
- Bot 指令只回應 staff
- 不需設計「外部使用者誤觸」防護

## ⏸️ 暫緩執行（2026/04/17 重新排序）
**先做 makesense-ink `/telegram/workbench` 同步官網工作台 → 跑順 → 再回頭做 AI 嗨嗨總管**

理由：先把 Telegram mini-app 的工作介面做對，後面 AI 派工才有「可執行」的目標。否則 AI 推了任務，使用者還是要切到網站才能做，體驗斷掉。

完整願景：Telegram 變統一工作中樞 = 嗨嗨總管 Bot（AI 對話）+ mini-app 工作台（五 Tab 執行介面），全程不離開 Telegram。

## 部署決策（2026/04/17 確定，排序在 mini-app 同步之後）
**Plan B：Mac 本地跑**

**Why:** 走 Plan A（Zeabur 24/7）成本月 NT$3,700+（必須用 Anthropic API key，因 Claude Pro/Max 訂閱不允許 server 部署，違者封號）。對小公司是有感支出，且還沒驗證 Bot 值不值。

**How to apply:**
- 用 Mac 本機跑 Claude Code + 官方 Telegram channel plugin（`/plugin install telegram@claude-plugins-official`）
- 用 四九 現有 Claude Pro/Max 訂閱，**$0 額外費用**
- Mac 需保持不睡眠（用 caffeinate 或系統設定）
- 先跑 1-2 週體驗，確認價值後再評估升級到 Zeabur

## 未來升級路線（如果 Mac 不夠用）
- **路線 C（縮減版 Zeabur）**：~NT$1,500-2,000/月，取消每小時巡查只保留每日一次 + 對話
- **路線 A（完整 Zeabur 24/7）**：~NT$3,700/月（Sonnet）或 NT$5,800（Opus）
- 上 Zeabur 必設 Anthropic Console 月度硬上限 USD $150 = NT$4,800 防爆

## Bot 三大職責
1. **🔍 查**：抓 Notion 資料給 四九 看
2. **💬 問**：推決策＋預覽改動方案
3. **✏️ 改**：四九 按確認後執行（三級權限）

## 改 Notion 三級權限（四九 2026/04/17 確認可改但要先問）
| 等級 | 範圍 | 怎麼問 |
|---|---|---|
| 🟢 例行 | 系統內部記錄 | 第一次問「以後這類自動做？」→ 同意後自動 |
| 🟡 中度 | 改單筆業務資料 | 每次預覽問「這樣改可以嗎？」 |
| 🔴 重要 | 不可逆／批量 | 兩段確認：預覽 → 確認 → 「真的要動囉？」最後確認 |

**鐵律：不刪除，只封存。**

## 真人同事感七個特徵
1. 一次只問一題（內部 Queue 排隊）
2. 訊息短像聊天（Prompt 約束「嗨嗨」人格、不用 embed）
3. 記得對話脈絡（短期 state）
4. 有節奏不打擾（推送節奏控制 + 勿擾時段晚 11 ~ 早 8）
5. 按鈕／打字都能回（Telegram + Claude 自然語言解析）
6. **記得歷史判斷**（auto memory + Notion DB10 對話記錄）
7. **主動推理＋提建議**（每日總管巡查 + 跨 DB 分析）

## 記憶系統三層
- **短期**：當前對話脈絡
- **中期**：這週/這個月判斷模式
- **長期**：歷史所有判斷 → 萃取成「四九 Profile」決策模型

儲存：所有對話 → 寫進 Notion **DB10「嗨嗨總管對話記錄」**（待新建）。每週讓 Claude 讀一次整批 → 更新 四九 profile。

## 主動推理五種模式
| 模式 | 例子 |
|---|---|
| 跨 DB 關聯 | DB05 報名爆量 + DB07 庫存不夠 → 推「要補貨嗎？」 |
| 趨勢偵測 | DB08 合併次數激增 → 推「命名規範要檢討？」 |
| 遺漏提醒 | DB04 交接 14 天沒動 → 推「要關掉還是重派？」 |
| 機會發掘 | DB08 對象最近多筆 DB05 提到 → 推「加深關係？」 |
| 風險預警 | DB09 deadline 將至但 DB04 沒進度 → 推「要爆了」 |

## 推送節奏分級
| 等級 | 時機 |
|---|---|
| 🔴 緊急 | 即時推（DB09 今日 deadline、訂單異常） |
| 🟡 重要 | 一天內推（新報名、AI 重要建議） |
| 🟢 一般 | 累積到每日早上 10 點批次推（DB08 審查、文案建議） |

## 學習迴圈
推建議 → 四九 反應（採納/拒絕/沒回/之後再說）→ 記錄進 DB10 → 每週 Claude review：採納率高的多推、低的調整、常說「之後再說」的時段學成繁忙時段 → 更新 四九 profile

## 跟 Notion AI 代理的分工
- **Notion AI 代理**（後台幹活）：嗨嗨聯想填 ai_對應xx + 寫 9 個 X引用（X被引由 Notion dual-sync 自動鏡射，AI 不需操作）、嗨嗨分析寫文案、DB 內部小自動化
- **Telegram 嗨嗨總管**（iPhone 上跟 四九 聊）：把要決策的事推給 四九、教 四九 怎麼改、執行 四九 確認後的動作

## 關於 Return by Death（轉生機制）
- GitHub: https://github.com/cutevisor/return-by-death
- 解決 Claude Code 長時間 session context 爆掉問題
- 機制：摘要當前對話 → 寫進 markdown 記憶檔 → 自動重啟 → 新 session 讀記憶
- 純 shell + systemd + markdown，4 個小檔案
- **macOS 可用**（systemd 需替換成 launchd，或手動用 tmux 管理）
- Plan B 第一階段先不裝，跑順了再加

## 待新建項目
1. **DB10「嗨嗨總管對話記錄」**（Notion 新建 DB）
2. **四九 Profile**（一份檔案，先存 auto memory 或專屬 Notion 頁面）
3. **Telegram Bot Token**（四九 到 BotFather 申請，5 分鐘）
4. **Claude Code Telegram channel plugin 設定**

## 開發階段（Plan B）
1. **第一階段：基礎對話**
   - Mac 安裝 Telegram channel plugin
   - Bot Token 配對 + chat_id 鎖定
   - 對話跑通（Telegram 跟 Claude Code 聊、能讀 Notion）
   - 三級權限機制建立

2. **第二階段：DB10 對話記錄 + 主動推送**
   - 新建 DB10
   - Claude Code 內建 schedule 跑「DB08 重複偵測」
   - Queue 排隊機制 + 推送節奏
   - 操作教學清單

3. **第三階段：主動推理 + 學習迴圈**
   - 每日總管巡查
   - 五種主動推理模式
   - 每週 四九 profile 更新

## 四九 要做的動作（極少）
1. 到 Telegram 找 @BotFather 申請 Bot（5 分鐘），把 Bot Token 給我
2. 確認 Mac 設定為「不睡眠」（或用 caffeinate）
3. 體驗一週後告訴我感想，決定要不要繼續優化

其他全部由我（Claude Code）在當前 session 處理。
