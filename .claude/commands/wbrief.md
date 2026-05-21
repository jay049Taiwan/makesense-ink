---
description: "Website brief — 把 makesense.ink 官網的當下技術棧、服務、設定整理成可貼到別 session 的 brief。預設輸出全套，可帶參數聚焦（例「只要 envar」「重點是 Notion 結構」）。"
argument-hint: "[可選：focus 範圍，例「envar」「Notion」「部署」「LINE」「全部」]"
---

# /wbrief — Website Brief 官網架構外送單

四九 要把 makesense.ink 的當下狀況提供給別 session（讓對方接手做 web 相關工作）。

## 跟 nowwhat-makesense 的關係
- **nowwhat-makesense**（自動觸發）：「網站基本配置」「nowwhat」這類隨口問，給完整 snapshot
- **/wbrief**（明確 slash）：可帶 `$ARGUMENTS` 聚焦特定面向

兩個都會抓 Notion 主版頁 `3599ff25fdab81b49442d966829e308b`，差別在裁剪。

## 鐵律
1. **以 code block 包整段**（一鍵複製）
2. **絕不貼任何 secret 值**（API key、token 內容）— 只列 key 名
3. **講話確實**：不確定的事註明
4. **繁中**

## 觸發後流程

### Step 1：抓 Notion 主版

`fetch` page `3599ff25fdab81b49442d966829e308b`，找到「快照內容」區塊（被 ` ```markdown ... ``` ` 包起來那段）。

### Step 2：依 `$ARGUMENTS` 裁剪

| 四九 帶的詞 | 留哪些 section |
|---|---|
| 空白 / `全部` / `all` | 全段、跟 nowwhat-makesense 完全一樣 |
| `envar` / `環境變數` | 只留 envar key 清單 + 常見地雷 |
| `notion` / `db` | 只留 Notion 9 個 DB 表 + 高頻指南 |
| `部署` / `vercel` / `deploy` | 主要服務 / 端點表 + 常用指令 + envar |
| `line` | 三種入口表 + LINE 相關 envar |
| `telegram` | Telegram 相關段 + 四九 ID |
| `角色` / `dashboard` | 三種角色表 + 三種入口表 + 關鍵檔案 |
| `關鍵檔` / `路徑` | 關鍵檔案區塊 + 本機路徑 |
| 其他自由詞 | 用判斷力擷取相關段、不確定就全段 + 註明「未明確 focus，全段附上」 |

### Step 3：輸出格式

```
# Website Brief — makesense.ink
產生時間：YYYY-MM-DD HH:MM
焦點：<args 或「全部」>

<裁剪後的內容>

---
（小提醒：以上來自 Notion 主版頁 3599ff25fdab81b49442d966829e308b。
若要看完整 snapshot、把 focus 設為「全部」即可。）
```

整段用四個反引號包起來（內部含三反引號）。

### Step 4：結尾建議

加一句：
> 「貼到新對話前可以加『以上是 makesense.ink 官網現況、請依此接手 X 任務』」

## 例外

- Notion MCP 連不上 → 告知無法執行（不要 fallback 用過期 memory）
- `$ARGUMENTS` 指了找不到對應的詞 → 全段附上 + 註明「未對應裁剪規則」

## 四九 給的偏好

`$ARGUMENTS`
