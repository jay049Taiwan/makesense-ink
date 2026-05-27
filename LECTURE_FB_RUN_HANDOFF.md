# 講座課程 FB 覆蓋掃描 — 在有網路的電腦執行交接（Method B）

> 給「網路穩定、能直連 api.notion.com 的電腦／session」用。雲端 web session 的對外網路被防火牆擋（403 Host not in allowlist），所以掃描腳本要在這種環境跑。

## 任務一句話
DB04「協作交接」中每一場「活動選項=講座課程」，應和它在 DB05「登記內容」的 Facebook 貼文建立雙向連結（DB05「對應協作」relation）。本任務先掃出覆蓋率與缺口，再把缺口場次補連。

## 前置需求
- 這台電腦能連 `api.notion.com`（一般家用/辦公網路都可）。
- 已 clone 本專案 repo，且 `.env.local` 有 `NOTION_API_KEY`（與 `scripts/run-sync.mjs` 共用同一把）。
- 已 `npm install`（需要 `@notionhq/client` ^5.17.0，repo 既有依賴）。

## 步驟 1 — 取得腳本
```bash
git fetch origin claude/focused-gauss-fTck7
git checkout claude/focused-gauss-fTck7      # 或 git pull origin claude/focused-gauss-fTck7
```

## 步驟 2 — 跑完整掃描
```bash
node scripts/scan-lecture-fb.mjs
```
- 終端會印：總場數 / 已連 FB / 缺口（0 篇）/ 缺口清單。
- 完整明細寫到 `/tmp/lecture-fb-report.json`（要改路徑：`--out 自訂路徑.json`）。
- 內建分頁 + 502/504/429/timeout 自動重試（上次卡住的就是 timeout）。

### 報告 JSON 內容
- `totals`：lecture_events、fb_posts_scanned、**fb_posts_missing_社群細項**、covered_events、gap_events、fb_posts_unlinked_to_lectures
- `gaps`：缺口場次（id / url / 協作名稱 / 主題名稱）
- `covered`：已覆蓋場次 + 各自連到的 FB 貼文
- `unlinked_fb_posts`：沒連到任何講座場的 FB 貼文（補連時的配對候選）

## 步驟 3 — 補連缺口
配對是判斷題（哪篇貼文配哪場），確認後執行：
```bash
node scripts/scan-lecture-fb.mjs patch <貼文ID> <活動ID> [第二個活動ID ...]
```
- 先讀既有連結再「合併」（只增不減），支援一篇配多場（雙連/多連）。
- 把 `/tmp/lecture-fb-report.json` 貼回給我（Claude），我可以幫你逐筆比對 gaps × unlinked_fb_posts、產出整批 patch 指令。

## B 階段實測發現（已反映在腳本，務必知道）
1. **社群細項常漏填**：有真的 FB 貼文（例：「回顧場文案114庄頭」）`素材類別=文案`、有 facebook.com 連結，但**沒填社群細項**。所以腳本的 FB 判斷已放寬為 `素材類別=文案 且（社群細項=Facebook 或 登記連結含 facebook.com）`。`totals.fb_posts_missing_社群細項` 會告訴你有幾篇是這樣——數字大代表 DB05 該欄位該補。
2. **標題會誤導**：「回顧場文案114庄頭」標題像講座，內容其實是「森本集市／好書散步日」**市集**回顧，且已連到別的活動。補連時**以貼文內文描述的活動為準**，不要只看標題。
3. **講座事件的「對應內容」常只連表單**：書店講座的對應內容多是報名表/細部流程/外部聯繫，不是 FB 貼文——這類就是缺口。

## 鐵律
- 只動 DB05「對應協作」；DB04「對應內容」由 dual-sync 自動鏡射，不要兩邊都改。
- 不要碰 X引用 / X被引 那 18 個引用欄位。
- 不確定的配對不要連，列出來等四九決定。
- relation property id：DB05 對應協作 = `WDxNQw`；DB04 對應內容 = `Astz`（QXN0eg）。腳本用「名稱」操作不碰 id，但若手動用 raw API patch DB05 貼文，key 要用名稱「對應協作」或 id `WDxNQw`，**不要用 Astz**（那是 DB04 側、會 400）。

## 跑完之後待決定
掃完講座課程，要不要繼續跑其他活動類型（陳列展售／文化冊展／園遊市集剩餘／會議展演）——等覆蓋率出來再決定。
