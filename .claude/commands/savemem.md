---
description: "存對話結論到 memory（明確版）。四九 平常用單字 save 也會自動觸發 savemem skill。此 slash 版適合帶具體內容當參數，例：/savemem 我以後要叫公司 makesense"
argument-hint: "[要記的內容，可省略，省略會自動回看對話]"
---

# /savemem — 存到 memory

呼叫 `savemem` skill 並直接執行。`$ARGUMENTS` 若有內容，當作要記的事實/規則；若無，回看最近 3-5 輪對話自動萃取。

完整邏輯見 `~/.claude/skills/savemem/SKILL.md`。

核心動作：
1. 萃取要存的內容（一個或多個）
2. 寫到 `/Users/jay049/.claude/projects/-Users-jay049-Documents-------/memory/<合適前綴>.md`
3. 含 frontmatter（name/description/type）+ What/Why/How to apply 結構
4. 更新 `MEMORY.md` 索引

完成後簡短回報：「✅ save N 檔」

四九 給的內容：`$ARGUMENTS`
