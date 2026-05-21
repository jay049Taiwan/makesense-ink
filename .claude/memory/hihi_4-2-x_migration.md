---
name: 嗨嗨家族工作指示遷移到 4-2-X 架構
description: 嗨嗨家族每個成員的家族工作內容收斂到各類指南 4-2-X 子頁，skill .md 與舊 Notion 設定頁剝薄成載入器
type: project
originSessionId: edd1a59c-e950-491b-aab2-9d3ee892c306
---

## What
嗨嗨家族（6 棒 + 總管）每個成員的「家族工作內容」收斂到「各類指南」底下的 4-2-X 編號子頁，成為單一真相來源。

**4-2-X 頁面（parent = 各類指南 2799ff25fdab80fea78ee261b4e792a2）**：
| 頁 | 成員 | skill | Notion 頁 ID |
|----|------|-------|-------------|
| 4-2-1 | 嗨嗨總管 | hihigm.md | `3639ff25fdab806f9710e1e676d4ab0d` |
| 4-2-2 | 嗨嗨企劃 | hihioutline.md | `3639ff25fdab819991cee5fedb8162b2` |
| 4-2-3 | 嗨嗨搜查 | hihisearch.md | `3639ff25fdab81f08e83d81f5556e1a9` |
| 4-2-4 | 嗨嗨分析 | hihianly.md | `3639ff25fdab817c9ca5e4ec73dfbd2c` |
| 4-2-5 | 嗨嗨聯想 | hihiconnect.md | `3639ff25fdab81b0b967ff1ec87c3339` |
| 4-2-6 | 嗨嗨文案 | hihiwriter.md | `3639ff25fdab811eb356cc0b8a40e35f` |
| 4-2-7 | 嗨嗨檢核 | hihicheck.md | `3639ff25fdab818c87d5f1ea2f812424` |

**進度（2026-05-18）**：4-2-1 嗨嗨總管已完成遷移；舊設定頁 `2739ff25fdab808b8a77d41efa446c3b` 改成轉址 stub；hihigm.md 剝成純載入器。4-2-2~4-2-7 六個空頁已建，各 session 依 Mission Brief 比照辦理（尚未做）。

**內容三分原則**：
- 家族工作規則（職責/流程/協作/模式/SOP）→ 4-2-X（單一真相來源）
- 純 Notion custom agent 平台專屬（如 credit 限制）→ 留舊 Notion 頁 stub
- 純 Claude skill 機制（frontmatter / $ARGUMENTS）→ 留 skill .md

## Why
四九已幾乎停用 Notion custom agent。內容散在 skill .md + custom agent 頁會 drift、舊頁難查找。願景：每個嗨嗨成員變成橫跨 Notion 與 Claude 的同一個工作夥伴——在 Notion 問 AI 或在 Claude 開 session 問，背後同一個腦（4-2-X）、同樣流程思維。關鍵是兩個入口都強制先讀 4-2-X 才動手。

## How to apply
- 修改任何嗨嗨成員的家族工作規則 → 改 4-2-X 頁，不改 skill .md、不改舊 Notion 頁
- 遷移其他 6 個成員時：讀 skill .md + 舊 Notion 頁 → 整併寫入 4-2-X（順手對齊現行 6 棒、修過時內容）→ 舊頁改 stub → skill .md 剝成載入器 → fetch 驗證罕字
- 現行 6 棒順序（建議預設，DB06 排序決定）：企劃→搜查→分析→聯想→文案→檢核
