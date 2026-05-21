---
name: 自動 merge PR + 部署
description: makesense-ink 專案，四九 授權我自動開 PR + merge + 等 Vercel 部署 + 回報結果，不需逐次確認
type: feedback
originSessionId: bf022c86-382d-4ce4-812b-2b7e2d2dc44a
---
當在 makesense-ink 專案上工作時，四九 授權我：

1. 寫完程式碼自己開 PR
2. 自己 `gh pr merge` 進 main（不需先請他點按鈕）
3. 等 Vercel 自動部署完成
4. 回報結果給他

**Why**：四九 已熟悉這套流程多次，每次都要他手動點 Merge 對他是多餘步驟。預設「正式站部署需人為確認」對這個專案會太囉嗦。

**How to apply**：
- makesense-ink 專案的功能修改、bug fix、樣式調整都自動 merge
- 例外：涉及砍資料、刪檔、重大架構重寫、不可逆操作仍需先問
- 用 `gh pr merge <PR#> --merge --delete-branch` 預設刪分支

**不適用範圍**：其他專案（photo_processor、brand_monitor 等）仍照預設「risky action 先問」原則。
