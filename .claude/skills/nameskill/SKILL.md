---
name: nameskill
description: |
  把 skill 改名（作用不變）。
  觸發詞：`/nameskill`、「skill 改名」「重新命名 skill」。
  用法：/nameskill "<舊名>" "<新名>"
  例：/nameskill "abcde" "super"
disable-model-invocation: true
argument-hint: "<舊名>" "<新名>"
---

# /nameskill — skill 改名

收到的參數：`$ARGUMENTS`

## 步驟

### 1. 解析參數
- 第一個雙引號字串 = **舊名**，第二個 = **新名**。
- 少一個 → 反問補齊。

### 2. 正規化新名
新名只能用「小寫英文 / 數字 / 連字號」：轉小寫、空白換 `-`、去非法字元。把正規化結果告訴使用者（例：`Super` → `super`）。

### 3. 定位 + 檢查
`<repo>` = `git rev-parse --show-toplevel`。
- 舊名資料夾 `<repo>/.claude/skills/<舊名>/` 不存在 → 告知並列相近名稱。
- 新名資料夾已存在 → 停下來問，不可覆蓋。

### 4. 改名
```
git mv .claude/skills/<舊名> .claude/skills/<新名>
```
再 Read `.claude/skills/<新名>/SKILL.md`，把 frontmatter 的 `name:` 從舊名改成新名（描述裡若寫了 `/舊名` 觸發詞也一起換）。
（舊式 `.claude/commands/<舊名>.md` 也用 `git mv` 改成 `<新名>.md`。）

### 5. commit + push
```
git add -A .claude/skills
git commit -m "chore(skills): /<舊名> 改名為 /<新名>"
git push -u origin <當前分支>
```

### 6. 回報
告知 `/<舊名>` → `/<新名>`，附 commit 編號，提醒：本 session 可能要刷新、Mac 要 `git pull`。
