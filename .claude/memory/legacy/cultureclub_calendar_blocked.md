---
name: 俱樂部首頁行事曆渲染問題（未解）
description: cultureclub.makesense.site 首頁無法顯示行事曆，HTML 在 source 中但視覺上不可見
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---
> ⚠️ **[LEGACY]** cultureclub.makesense.site 為 WP 舊站子網域，已於 2026/04 隨舊站退役，不再處理。

## 問題
俱樂部首頁 (page ID 43) 的 Elementor shortcode widget 輸出的行事曆 HTML 確認存在於頁面 source 中，但瀏覽器完全不顯示。

## 已嘗試（2026-04-09）
1. 在 Elementor data 加入 `[traveler_yilan_calendar]` shortcode widget → HTML 在 source 裡但不可見
2. 用 `wp_footer` hook 注入 → 同樣不可見
3. 加 inline style `display:block!important; visibility:visible!important` → 不可見
4. 加紅色 debug 邊框 `border:4px solid red` → 不可見
5. 移動行事曆到不同位置（文化關鍵字前面）→ 不可見
6. 清除所有 LiteSpeed 快取（Purge All + Empty Entire Cache）→ 不可見
7. 用無痕視窗測試 → 不可見
8. CCSS 檢查：沒有 display:none 或 visibility:hidden 針對行事曆

## 排除的原因
- 不是 HTML 缺失（curl 確認 HTML 存在）
- 不是 CSS display:none（沒有相關規則）
- 不是 LiteSpeed CCSS 隱藏（CCSS 中沒有針對行事曆的規則）
- 不是頁面快取（清除後仍然不可見）

## 可能原因（未驗證）
- Elementor 的 CSS 渲染機制可能對透過 REST API 修改的 widget 不完全生效
- 可能需要從 Elementor 編輯器內部儲存才能正確渲染
- 俱樂部首頁的頁面結構可能有特殊的 CSS 限制（頁面模板或主題設定）

## 當前狀態
- 行事曆 shortcode 已從 page 43 的 Elementor data 中移除
- EY-CAL snippet (ID 748) 仍然 active（shortcode 可用但未放置）
- 如果要再試，建議用 Elementor 編輯器手動加入 shortcode widget

**Why:** 透過 REST API 修改 Elementor data 可能不足以讓 Elementor 正確渲染新 widget
**How to apply:** 下次嘗試時，請用 Elementor 編輯器直接操作，而非 REST API
