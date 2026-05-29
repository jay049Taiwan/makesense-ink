---
name: hihigm
description: 嗨嗨總管 連續問答 skill。讀 target page 的執行構想 + 欄位組合,依「範例 / 同類匹配 / 純執行構想」三段 fallback 跟四九對話,把答案 append 進 target「執行構想」欄位的需求層。可寫(跟 /hihicheck 唯讀不同)。
---

# 嗨嗨總管 連續問答(hihigm)

被 `/hihigm <輸入>` 觸發。任務:跟四九對話、把 target page 的需求層收清楚、append 進 target page 的「執行構想」欄位。

---

## 啟動鐵律

1. **可寫,但只寫一個地方** — 只動 target page 的「執行構想」欄位,**永遠 append 帶日期戳「── YYYY-MM-DD HH:MM 總管 連續問答 ──」**,絕不蓋既有內容,尤其「── 四九修正 ──」標記**絕不動**。
2. **不依賴母 session context** — 派子 agent 去查工作區、找對標、讀範例 page。母 session 可能有偏見。
3. **找對標 = self-bootstrapping** — 不需要四九手動分類 target 類型;target 自己的欄位組合就是身分證明,系統自己找同類。
4. **永遠在做同一件事:找「該有但沒有」的東西去問** — 「該有」的來源是對標 page,沒對標就退到欄位組合指南。**不跑死板問題清單**,所有問題從 gap 動態算。
5. **寫入前 re-fetch 看現狀;寫入後 re-fetch 驗結果** — 任何 verify 失敗,回報、不假裝成功。

---

## 輸入分流

`/hihigm <輸入>`:

- 輸入**含 Notion URL** → 該 URL = target page,跑主流程
- 輸入**只有文字、沒 URL** → 退件:「請給我 target page 的 Notion URL,不然我不知道要把需求層寫進哪一頁」
- 輸入**空** → 同上退件

---

## 主流程(5 步)

```
1. fetch target page
   讀:執行構想欄位現有內容 + 全部欄位組合 + 主要 relation
   找:「── 四九修正 ──」標記位置(記下不能蓋的範圍)

2. 找對標(3 段 fallback,見下方)

3. 比對「對標 / 欄位組合指南」vs「target 現況」→ 算出 gap 清單

4. 問四九 fill gap(每輪 1-3 題,選項式優先,「其他」逃生口必留)
   停止訊號(任一觸發即停):
   - gap 清單清空
   - 四九說「夠了,寫吧」
   - 連續 2 輪沒新資訊產生

5. 把答案整理成需求層段落 → append 進「執行構想」→ re-fetch 驗證
```

### 對標 3 段 fallback

```
① 四九的輸入含第二個 Notion URL?(範例 page)
   YES → 用範例 page 比對問答

② 沒範例 → 派子 agent 查 Notion:跟 target 完全匹配欄位組合的其他 page
   有 ≥1 筆 → 用這些同類 page 比對問答
   多筆時取 top 3 給四九挑(排序規則本輪先簡單:最近完成優先;
   未來再升級為「黃金範例 > 已發佈 > 最近」)

③ 沒範例也沒完全匹配 → 用 target 現況 + 欄位組合指南 直接問
```

### 寫入格式

```
── YYYY-MM-DD HH:MM 總管 連續問答 ──
[範疇] 做什麼 / 不做什麼
[受眾] 給誰用 / 為了什麼
[規模] 量、時程
[規則] 必提 / 禁用 / 風格
[參照] 對標 page URL(若走 ① 或 ②)
```

各 token 視 target 類型可增刪,但「不留空 token」 — 沒答到的標「待四九補」明寫,不空白。

---

## 子 agent 派工(強制,結構保證)

**至少派 2 個並行子 agent**:

### Agent A:對標搜尋(general-purpose)

```
任務:對指定 target page,找對標候選。

Target URL: <TARGET_URL>
四九有沒有另外指定範例:<YES/NO + URL if YES>

步驟:
1. fetch target,讀完整欄位組合
2. 若四九有指定範例 → 直接 fetch 它、回傳。結束。
3. 否則 → 查工作區同欄位組合的其他 page(完全匹配):
   - 用 Notion MCP fetch tool(先 ToolSearch
     "select:mcp__73449d04-01f2-4d79-b0b5-908d1d64b42d__fetch")
   - 撈 ≥3 筆候選(若工作區有的話)
   - 排序:最近完成日期優先
4. 若完全匹配 0 筆 → 回傳「沒有對標」

回傳格式:
- 模式 = ① / ② / ③
- 候選清單(每筆:title、URL、執行構想摘要 1-2 句)

繁體中文。
```

### Agent B:target 現況讀取(general-purpose)

```
任務:讀 target page 的完整現況。

Target URL: <TARGET_URL>

步驟:
1. fetch 該 page
2. 列出所有有值的欄位(欄位名 + 值簡述)
3. 「執行構想」欄位:全文回傳
4. 標出「── 四九修正 ──」標記的位置(用 line offset 或前後文 quote)
5. 主要 relation 連到哪些 page(只列名 + URL,不展開)

回傳:結構化摘要 + 「執行構想」全文 + 不能覆寫的範圍標記。
繁體中文。
```

### Agent C:寫入後驗證(在寫入後派,general-purpose)

```
任務:確認剛寫入的內容真的在,且沒蓋到既有內容。

Target URL: <TARGET_URL>
剛寫入的段落(原文):<APPENDED_TEXT>
寫入前的「執行構想」全文 snapshot:<SNAPSHOT>

步驟:
1. fetch target 現在的「執行構想」全文
2. 確認:
   - 新段落是否完整存在於文末
   - SNAPSHOT 的所有內容是否原封不動保留(尤其「── 四九修正 ──」)
3. 任一條不對 → 回 ❌ + 差異描述
   全對 → 回 ✅

繁體中文。
```

---

## 主 session 跟四九互動的方式

子 agent A、B 回來之後,主 session:

1. 跟四九 chat 顯示:「找到對標模式 = ①/②/③,候選 X 筆」
2. 若模式 ②,讓四九挑哪一個(或「都不像 → 走模式 ③」)
3. 算出 gap 清單
4. 用 AskUserQuestion 或一般對話,每輪問 1-3 題
5. 收答案直到停止訊號
6. 整理成寫入格式,**先給四九看一次**「我會寫這段進去」 → 四九確認
7. 寫入 → 派 Agent C 驗證 → 報告結果

---

## 邊界

- ✅ 寫:target page 的「執行構想」欄位(append 帶日期戳)
- ❌ 不寫:其他任何欄位、page content、relation、智動狀態、別的 page
- ❌ 不蓋:「── 四九修正 ──」標記、其他既有 append 段落
- ❌ 不在四九未確認最終寫入內容前寫
- ❌ 不腦補答案 — 四九答模糊就追問或標「待四九補」

---

## 結尾鐵律

- **寫入前必 re-fetch 看現狀,寫入後必派 Agent C re-fetch 驗結果**
- 任何 verify 失敗 → 報錯不裝
- 找不到對標 → fallback 到下一段,不腦補
- 「── 四九修正 ──」標記絕不動
- 寫入內容必須先給四九過目確認
