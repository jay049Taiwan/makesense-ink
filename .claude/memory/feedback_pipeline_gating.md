---
name: 嗨嗨家族 pipeline gating 模型（2026-05-18 更新）
description: 每項完成後不自動連鎖，由四九逐項檢查再建下一項；舊版 per-baton ai備註 全退役
type: feedback
originSessionId: b9858bdd-a806-4556-8eea-3f17770ce30f
---

## 現行 gating 模型（2026-05-18 改版）

舊版「pipeline 自動連鎖 + per-baton ai備註」已退役。現行：

1. **觸發條件**：DB06 page 設 `ai模式=X` + `ai狀態=執行中`（待執行→執行中 由四九或 n8n 在關卡 A 放行時改）
2. **不自動連鎖**：完成的棒設 `ai狀態=完成`，**不**設下一項為待執行
3. **四九檢查放行**：四九 review target 結果，決定要不要建下一項的 DB06 page

## 每棒的本職應寫欄位

| 棒 | 本職寫入 |
|---|---|
| 企劃 | target「執行構想」執行層、DB06「執行備註」 |
| 搜查 | DB06「執行備註」、新建 DB06 資料參考 page（明細類型=資料參考）+ 對應 X引用 回連 |
| 分析 | target「分析備註」（分析專屬）；可新建 DB08 page |
| 聯想 | target「X引用」relation（9 個） |
| 文案 | target page content、「簡介摘要」、DB06「執行備註」 |
| 檢核 | 4 處備註（target 執行備註+檢核備註、DB06 執行備註+檢核備註） |

## 已退役欄位（別找了）

- `ai管考備註` / `ai搜查備註` / `ai聯想備註` / `ai分析備註` / `ai企劃備註` / `ai文案備註` — 全退役（2026/05/14）
- 9 DB 的 `ai備註` 已於 2026/05/17 改名為 `分析備註`（嗨嗨分析專屬）
- `檢核備註` 是嗨嗨檢核專屬欄位（2026/05/17）

## 單一真相來源

- 家族架構＋各棒職責：[工作導覽地圖](https://www.notion.so/049/3459ff25fdab81aeab9ff3c8281805e5)
- 各棒工作指示：4-2-1 ~ 4-2-7（各類指南底下）
- 檢核品管 formula 信號：[hihicheck_quality_design.md](hihicheck_quality_design.md)
