---
name: 嗨嗨 n8n pipeline v3 架構
description: 嗨嗨家族 reviewer-in-the-loop n8n pipeline 的架構、workflow 清單、設計方向
type: project
originSessionId: 0e678b4e-32fb-4c51-a723-69ee7e8cc7ed
---
四九 用 n8n + Claude Sonnet 4.6 自建嗨嗨家族 pipeline,取代不可靠的 Notion AI agent。reviewer-in-the-loop:每項兩道關卡,四九 用 Telegram reply 審批推進。

**Why:** Notion AI agent 貴又會寫敷衍占位內容;n8n 串 Claude 可控、可審、便宜（cache 後約 NT$2/篇）。

**How to apply:** 改 pipeline 時優先用獨立 workflow,不要動到已驗證的 Runner。

## 本 session 定位（2026-05-17 四九 明示）
本 Claude Code session = 嗨嗨家族 pipeline 的「設定/架構維修廠」。只做設定層:改 n8n workflow、skill 整合、欄位/JSON 契約、家族架構。
**不做任務層**:不討論「某個 target 該怎麼跑、某篇文案怎麼寫」—— 那是戰場 session 的事。
四九 把架構/維修問題帶來這裡討論並執行;任務問題不在此處理。

## 核心架構方向（2026-05-16 四九 明示）
**每一工項都是「特殊工項」,各有獨立核心能力** — 企劃(目標拆解)/搜查(web search 採集)/分析(抽具名詞彙建 DB08)/聯想(跨類雙層 traversal)/文案(子類指南+voice)/檢核(完整性檢查)。
「Runner 管單純工項」只是過渡;終局是每項各自獨立 workflow、各自專門邏輯。

## 家族權限矩陣（2026-05-17 四九 明示）
每棒各有一塊乾淨獨佔,零不對稱:
- **企劃** — 寫 target`執行構想`(不分 DB,永遠只寫這欄)+ DB06`執行備註`;唯一可往下建子頁(須四九 Telegram 同意)
- **搜查** — 採集網路;可新建 DB08 page、可新建 DB01 page(採到值得推薦的提案→建進 DB01,建議比照建子頁走四九同意)
- **分析** — 家族「認識/鑑定」棒:輸入端唯一可吃照片/外部檔案(多模態);輸出端唯一可寫`分析備註`(每張 page 身份 metadata)
- **聯想** — 唯一可寫名稱含「引用」的欄位(「被引」由 Notion dual-sync 自動鏡射)
- **文案** — 唯一可動 target page content(+ 簡介摘要)
- **檢核** — 唯一可寫`檢核備註`;輸出 4 處:target 的 執行備註+檢核備註、DB06 的 執行備註+檢核備註;不修實質工作欄位

`ai備註` 欄位 2026-05-17 已 9 DB 全部改名 `分析備註`(四九 手動完成)。`分析備註`空 = 該 page 未被分析鑑定。`檢核備註` 為檢核專屬。其他棒要留訊息一律寫自己的`執行備註`。

## workflow 清單（n8n makesense.zeabur.app）
- Kickoff `K7gzlihO43rFJc59` — DB05 button → 查 DB06 按「排序」→ 送第一項關卡A
- Runner `tgAWaiwyNG0k6M4v` — 單項 Claude（企劃/文案等）→ 寫 target → 關卡B
- Reply Handler `WFaIimiMWVBchU3K` — Telegram reply 狀態機;依 ai模式分流（聯想→traversal workflow,其他→Runner）
- 聯想-Traversal `yDWp0oYGwHNhscZI` — 雙層 traversal,純機械無 Claude

## 指示優先序（每項一致鐵律,2026-05-16 四九 明示）
每項執行時指示來源的輕重順序:
1. 最優先 = 該次 DB06 的「執行構想」欄位（這次任務的特定指示）
2. fallback = 該項通用「工作指示」（嗨嗨成員 skill 核心能力規則）
3. 執行構想為空 → 用通用工作指示
4. 四九 Telegram reply 修改 → 改的是「該次執行構想」,通用工作指示永不動
→ 每項 system prompt 開頭都要明文寫這條優先序。

## 企劃「往下拆解」能力（2026-05-17 四九 明示,n8n 待實作）
- 企劃是家族中**唯一可以「往下拆解、新增頁面」**的工項:DB01→DB06 方向,例如從 DB03 一個項目推出要新增 4 個 DB04 page。
- **只能往下、不可往上**:可從 DB03 推出 DB04,但不可從 DB05 一篇文章推出要新辦一場 DB04 活動。
- 章節架構 + 寫作素材寫在 target 的「執行構想」欄位（rich_text,用 ## 章節標題）—— 不寫 page content（文案專屬）、不塞執行備註（log 用）。三者分工:plan=執行構想 / log=執行備註 / 成品=page content。
- **往下建子頁必須四九人工同意**(2026-05-17):建子頁=新增資料、不可逆,企劃要建子頁時必須在 Telegram 把「預計新增哪些子頁」列出來給四九,按 OK 才真的建。等於建子頁多一道專屬確認關卡,不可偷偷新增。
- **規格現況（2026-05-18）**:「往下建子頁」規格已寫進 4-2-2 嗨嗨企劃工作指示 §七(方向限從屬鏈往下、數量企劃自判但須呈報、子頁填 title+對應 relation+執行構想、JSON 頂層 key `建子頁提案`、四九 Telegram 同意關卡)。
- **n8n 現況**:Runner 端仍未實作 —— 待 n8n 補「讀 `建子頁提案` → Telegram 確認關卡 → 建頁並回連母頁」流程。在此之前企劃可規劃、可提案,但 n8n 不會真的建頁。

## 關鍵設計
- 執行順序由 DB06「排序」number 欄位決定（非 ai模式）
- 每項兩道關卡:A=執行前確認執行構想、B=成果確認;reply「好/OK/同意/通過/可以/讚/y/yes」放行
- reply skip=跳過、redo=重跑、其他文字=改寫執行構想
- ai模式值不帶數字前綴,程式用 .includes() 比對
- DB06 觸發 page `ai狀態` 三段流程(2026/05/18 四九 明示):**待執行**=建立時的預設,不觸發任何棒 → **執行中**=觸發該棒開始執行(關卡 A 放行後設此值)→ **完成**=執行完畢。觸發條件全家族統一 = `ai狀態=執行中`(不是「待執行」)。
- prompt caching 要 system prompt ≥1024 token 才會生效
- Telegram 訊息要清掉 / : 全形斜線 等字元,否則 URL parser 報錯
- n8n update_workflow 結構不變時 credential 會保留,大改結構才會清掉
