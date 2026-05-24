---
name: delskill
description: |
  刪除指定的 skill。
  觸發詞：`/delskill`、「刪掉這個 skill」「移除 skill」。
  用法：/delskill "<名稱>"
disable-model-invocation: true
argument-hint: "<skill名稱>"
---

# /delskill — 刪除 skill

收到的參數：`$ARGUMENTS`

## 步驟

### 1. 解析參數
取雙引號 `"..."`（或唯一一個字）= 要刪的 **skill 名稱**。沒給 → 反問。

### 2. 定位 + 確認
找 `<repo>/.claude/skills/<名稱>/`（`<repo>` = `git rev-parse --show-toplevel`）。
- 找不到 → 告訴使用者沒這個 skill，列相近名稱。
- 找到 → **先簡短報告要刪什麼**（名稱 + 一句話作用），再刪。
- 保護名單：不要刪 `makeskill / menuskill / editskill / delskill / nameskill / check3-5`，除非使用者明確再次指定要刪這幾個。

### 3. 刪除 + commit
```
git rm -r .claude/skills/<名稱>
git commit -m "chore(skills): 刪除 /<名稱>"
git push -u origin <當前分支>
```
（若是舊式 `.claude/commands/<名稱>.md` 也一併刪。）

### 4. 回報
告知已刪 + commit 編號，並提醒：**這是可復原的**——刪錯了用 `git revert <commit>` 或 `git checkout <前一個commit> -- <路徑>` 救回；Mac 要 `git pull` 才會同步刪除。
