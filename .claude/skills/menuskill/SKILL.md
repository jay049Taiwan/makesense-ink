---
name: menuskill
description: |
  列出目前所有 skill 的清單與一句話說明，並標示哪些不能用 slash 觸發。
  觸發詞：`/menuskill`、「列出所有 skill」「skill 清單」「有哪些 skill」。
disable-model-invocation: true
---

# /menuskill — skill 總覽

列出這個 repo 的所有 skill / command，附簡要說明與可觸發狀態。

## 步驟

### 1. 抓清單
跑（`<repo>` = `git rev-parse --show-toplevel`）：
- `ls <repo>/.claude/skills/` — 每個子資料夾是一個 skill。
- `ls <repo>/.claude/commands/` — 舊式 command（也會變成 slash command）。

### 2. 逐個讀 frontmatter
對每個 `.claude/skills/*/SKILL.md`，讀出：
- `name`（沒寫就用資料夾名）
- `description` 第一句
- 是否有 `user-invocable: false` → **不出現在 `/` 選單**（只有 Claude 自動用）
- 是否有 `disable-model-invocation: true` → 只有使用者能打，Claude 不會自動觸發

### 3. 輸出格式
用條列，每條一行：

```
- /<名稱> — <一句話說明>　[標記]
```

標記規則：
- 一般（你和 Claude 都能用）→ 不標
- `disable-model-invocation: true` → 標 `🔒手動`
- `user-invocable: false` → 標 `⚠️無slash（僅Claude自動用）`
- 只在 `.claude/commands/` 沒有對應 `.claude/skills/` → 標 `（舊式command）`

最後補一行說明：Anthropic 內建 skill（如 /init、/review、/security-review、/loop 等）不在 repo 內、本清單不列，可打 `/` 看完整選單。

不要修改任何檔案，只讀與列出。
