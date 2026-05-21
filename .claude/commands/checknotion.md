---
description: "Notion 檢查總入口 — 四九 的 Notion 9 個 DB 稽核。打 /checknotion 跳 menu 問要檢查什麼層次（欄位設計 / 欄位值 / page 內文）。報告 → 等決策 → 才動。預設不修、所有寫入動作要 四九 明說。"
argument-hint: "[類型編號或關鍵字 — 不填會跳 menu]"
---

# checknotion — Notion 檢查總入口

四九 的 Notion DB01~09 稽核助手。**互動模式**：先問要查什麼層次 → 報告 → 等決策 → 才動。

跟 `/checkmac` 平行：checkmac 看本機檔、checknotion 看 Notion。

## 鐵律

1. **絕不自動改 schema 或寫入 page**
2. 報告先給，動作要 四九 明說「修 X」「補 Y」才動
3. 改 schema（DROP COLUMN / RENAME）前必須再次 confirm 一次
4. 全程繁中

## Step 1：判讀類型

解析 `$ARGUMENTS`：

| 四九 說 | 走哪條 |
|---|---|
| `1` / `欄位` / `schema` / `nsc` | A. 欄位設計（schema） |
| `2` / `值` / `value` / `nvc` | B. 欄位填寫品質（值） |
| `3` / `內文` / `page` / `body` / `npcc` | C. page 內文（body） |
| `4` / `全部` / `all` | D. 三層全跑 |
| **空白 / 沒講** | **顯示 menu** |

## Step 2：顯示 menu（無參數時）

```
🩺 checknotion — 想檢查 Notion 哪一層？

1️⃣ 欄位設計（schema）
   description 缺漏 / 命名混雜 / 跨 DB 撞名 / 殭屍欄位 / 殭屍 select 選項 / relation 異常

2️⃣ 欄位值（每筆 page 填得乾不乾淨）
   title 重複 / 必填空值 / 孤兒 relation / 數值異常 / date 圍外 / status 缺漏 / URL 格式

3️⃣ page 內文（body 內容品質）
   空頁 / 只有 placeholder / 過短 / 重複內文 / 缺段落 / heading 結構亂 / 套件未填

4️⃣ 全部（三層全跑）

打數字、關鍵字都行。
```

等 四九 回應再進 Step 3。

## Step 3：依類型跑對應 skill

### A. 欄位設計
走 `/nsc` 邏輯（fetch 9 DB schema → 7 項檢查）。
詳見 `~/.claude/skills/notion-schema-check/SKILL.md`。

### B. 欄位值
走 `/nvc` 邏輯（query 9 DB pages → 8 項檢查）。
詳見 `~/.claude/skills/notion-value-check/SKILL.md`。

### C. page 內文
走 `/npcc` 邏輯（fetch DB01/05/07/08 抽樣 30 → 8 項檢查）。
詳見 `~/.claude/skills/notion-page-content-check/SKILL.md`。

### D. 三層全跑
依序跑 A → B → C，每段給摘要、最後給綜合報告。
**先警告**：「三層全跑約需 5~10 分鐘、Notion API quota 會吃比較多，要繼續嗎？」

## Step 4：路徑/範圍微調

- 預設：全 9 DB 都掃
- 四九 可指定單 DB：`/checknotion 欄位 DB05` → 只掃 DB05
- 也可指定特定檢查：`/checknotion 值 空值` → 只看必填空值

## Step 5：輸出報告

依底層 skill 輸出格式（nsc / nvc / npcc 各自的）。

結尾統一加：
```
要修哪些？（可說「修無說明」「修 DB05 那批」「先不用」「export csv」）
```

## Step 6：四九 說要修

依底層 skill 的修法：
- nsc：update_data_source RENAME / DROP / ALTER COMMENT
- nvc：update_page properties
- npcc：update_page content（不可逆，需 四九 明說 yes）

**任何寫入動作前都再確認一次。**

## 命名範例

- `/checknotion` — 跳 menu
- `/checknotion 欄位` — 走 nsc
- `/checknotion 值 DB05` — 走 nvc 只看 DB05
- `/checknotion 內文 空頁` — 走 npcc 只查空頁
- `/checknotion 全部` — 三層全跑

## 四九 給的參數

`$ARGUMENTS`
