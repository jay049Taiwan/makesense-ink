---
name: savemem
description: |
  存對話結論到 四九 的 memory 系統。
  自動觸發詞：當 四九 訊息含英文單字 `save`（任何位置、任何語境）。
  四九 平常不會用到英文 save，所以這是專屬辨認字。
  也可被 /savemem slash command 明確呼叫。
  常見情境：「這個記下」「以後都這樣 save」「save 起來」「這條規則 save」。
  載入後：抽出剛才討論的決定/規則，寫成適當的 memory 檔，並更新 MEMORY.md 索引。
---

# savemem — 對話結論存 memory

四九 說 `save` 時觸發。你的工作：把**剛剛幾輪對話**的關鍵決定/規則/事實萃取出來，寫成標準 memory 檔，更新索引。

## 鐵律

1. **不問細節、自己萃取** — 四九 說 save 就是要快、不是要再答一輪
2. **如果不確定該存什麼，先列「我打算存這 3 件」給 四九 1/2/3 選、預設全選**
3. **全程繁中**
4. **絕不刪/改既有 memory 檔**——只新增、或在既有檔末尾追加

## Memory 系統位置

主目錄：`/Users/jay049/.claude/projects/-Users-jay049-Documents-------/memory/`
索引：同目錄下的 `MEMORY.md`

## 檔名規則

依「存什麼」決定：

| 類型 | 檔名 prefix | 例 |
|---|---|---|
| 溝通偏好 / 鐵律 | `feedback_` | `feedback_no_simplified_chinese.md` |
| 使用者資料 | `user_` | `user_phone_number.md` |
| 專案決定 | `<專案>_` | `makesense_ink_x.md`、`brand_monitor_y.md` |
| Notion / DB 結構 | `notion_` 或 `db_` | `notion_db05_xxx.md` |
| 技術決定 | `tech_` 或 `<area>_` | `cloudinary_setup.md` |
| 一次性事實 | `note_` | `note_2026_05_business_plan.md` |

不知道該選哪個 → 預設用 `note_<short_name>.md`、後再 rename。

## Frontmatter 格式（必填）

```yaml
---
name: <短標題>
description: <一句話描述>
type: feedback | user | project | tech | note
originSessionId: <當前 session ID 若知道>
---
```

## 內文結構（推薦）

```
## What
<決定/規則的具體內容>

## Why
<為什麼這樣決定>

## How to apply
<下次遇到時怎麼用>
```

不嚴格，視情況彈性。

## 觸發後流程

### Step 1：判讀「要存什麼」
回看最近 3-5 輪對話，找：
- 四九 拍板的決定（「就這樣」「以後都這樣」）
- 新發現的規則 / 鐵律
- 重要事實（檔案位置、ID、金鑰名、流程步驟）

如果找到多個，**預設全存（每個一檔）**，但**先列給 四九 看一行：「打算存這 N 件，要嗎？」**——四九 不否決就動手。

### Step 2：選檔名 + 路徑
依「檔名規則」表決定 prefix。

### Step 3：寫檔
完整 frontmatter + 內文。

### Step 4：更新 MEMORY.md
在最相關的 section 加一行 link：
```markdown
- [feedback_xxx.md](feedback_xxx.md) — 一句話描述
```

「最相關 section」判讀：
- feedback_* → 「使用者偏好」
- 專案類 → 對應專案 section
- 不確定 → 加在最後新建一個 `## 待整理` section

### Step 5：回報

```
✅ save 完成
新增 N 個檔：
  - feedback_xxx.md：一句話
  - note_yyy.md：一句話
索引已更新：MEMORY.md 「使用者偏好」section
```

## 例外

- **完全不知道要存啥** → 跟 四九 說「我看不出剛剛要存什麼，你描述一下」
- **存的內容已存在 memory 裡（重複）** → 提醒 四九「這個已經在 X 檔，要追加說明還是新建？」
- **寫檔失敗** → 報告錯誤、不靜默吞

## 命名衝突處理

`feedback_no_simplified_chinese.md` 已存在 → 改 `feedback_no_simplified_chinese_2.md` 或追加在原檔末尾（看 四九 偏好）。

## 四九 給的參數（slash 模式）

`$ARGUMENTS` — 如果 四九 在 `/savemem` 後面寫了具體內容，用那段；沒寫就回看對話自動萃取。
