---
name: editskill
description: |
  換掉既有 skill 的作用內容（保留名稱）。
  觸發詞：`/editskill`、「改 skill」「換掉這個 skill 的作用」。
  用法：/editskill "<名稱>" <新的作用描述>
  例：/editskill "walk" 以後都把接到的內容重點再加 50 字說明
disable-model-invocation: true
argument-hint: "<skill名稱>" <新的作用>
---

# /editskill — 改寫既有 skill 的作用

收到的參數：`$ARGUMENTS`

## 步驟

### 1. 解析參數
- 第一個雙引號 `"..."` 字串 = 要改的 **skill 名稱**。
- 後面剩下 = **新的作用描述**。
- 名稱與作用任一缺 → 反問補齊。

### 2. 定位
找 `<repo>/.claude/skills/<名稱>/SKILL.md`（`<repo>` = `git rev-parse --show-toplevel`）。
- 找不到 → 告訴使用者沒這個 skill，並列出相近名稱，問是不是要用 `/makeskill` 新建。
- 若它在 `.claude/commands/<名稱>.md`（舊式）→ 也能改，比照處理。

### 3. 改寫
- 先 Read 現有檔，保留 frontmatter 的 `name`。
- 依新作用描述重寫 `description` 與 body（body 用 $ARGUMENTS 代表使用者之後接的內容）。
- 重新判斷 `disable-model-invocation`：有副作用就加、純處理就拿掉。
- 不要動到其他無關欄位。

### 4. commit + push
```
git add .claude/skills/<名稱>/SKILL.md
git commit -m "refactor(skills): 改寫 /<名稱> 的作用"
git push -u origin <當前分支>
```

### 5. 回報
摘要「舊作用 → 新作用」，附 commit 編號，提醒 Mac 要 `git pull`。
