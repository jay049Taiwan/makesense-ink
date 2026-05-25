---
name: makeskill
description: |
  把一段描述（或本對話剛剛的流程）做成一個新的 skill，同時就是 slash command。
  觸發詞：`/makeskill`、「做成 skill」「把這個變成 skill」「存成 skill」。
  用法：/makeskill "<名稱>" <這個 skill 以後要做什麼>
  例：/makeskill "abcde" 以後都把接到的內容重點再加 50 字說明
disable-model-invocation: true
argument-hint: "<skill名稱>" <skill要做的事>
---

# /makeskill — 把流程做成新 skill

收到的參數：`$ARGUMENTS`

## 步驟

### 1. 解析參數
- 取第一個用雙引號 `"..."` 包起來的字串 = **skill 名稱**。
- 引號後面剩下的全部 = **這個 skill 要做的事（作用描述）**。
- 若作用描述指向「本對話 / 剛剛的流程 / 上面那段」→ 從目前對話抓出那段流程當作 skill 內容。
- 若使用者沒給名稱或沒給作用 → 反問補齊，不要亂猜。

### 2. 正規化名稱
skill 資料夾名與 frontmatter `name` 只能用「小寫英文 / 數字 / 連字號」。
- 轉小寫、空白換成 `-`、去掉非法字元。
- 把正規化後的名稱告訴使用者（例：`Super` → `super`）。
- 若 `.claude/skills/<名稱>/` 已存在 → 停下來問是否要改用 `/editskill` 或換名，不要直接覆蓋。

### 3. 寫檔
建立 `<repo>/.claude/skills/<名稱>/SKILL.md`（`<repo>` = `git rev-parse --show-toplevel`）：

```
---
name: <名稱>
description: |
  <一句話講清楚這個 skill 做什麼 + 觸發詞 /<名稱>>
argument-hint: <若這個 skill 需要接內容，給個提示；否則省略>
---

# /<名稱>

<把「作用描述」寫成清楚的執行指示。若 skill 需要處理使用者接在後面的內容，
用 $ARGUMENTS 代表那段內容。>
```

判斷要不要加 `disable-model-invocation: true`：
- 作用有副作用（會送訊息 / 刪東西 / 部署 / 改外部系統）→ 加，只讓使用者手動觸發。
- 純內容處理 / 純查詢 → 不加，讓你和 Claude 都能用。

### 4. commit + push
```
git add .claude/skills/<名稱>/SKILL.md
git commit -m "feat(skills): 新增 /<名稱> skill"
git push -u origin <當前分支>
```

### 5. 回報
- 告訴使用者 skill 已建好、commit 編號、用法。
- 提醒：本 session 可能要稍候或刷新才會出現在 `/` 選單；Mac 本地要 `git pull` 才有。
