---
name: Snippet 修改紀律
description: 修改 Code Snippets 時必須遵守的規則，避免重複今天的災難
type: feedback
---

永遠不要用「新增覆蓋」的方式處理問題。每次修改 snippet 必須：

1. **改動前**：搜尋所有 active snippet 是否有衝突（function name、shortcode name、CSS class、global variable）
2. **改動時**：直接修改目標 snippet，不建新的。如果 API DELETE 失敗，告知用戶手動處理
3. **改動後**：驗證頁面正常（curl 檢查 HTML），確認沒有 PHP 錯誤
4. **測試用 snippet**：絕對不建。用 curl、本地檔案、或瀏覽器 console 驗證
5. **命名**：遵循 `編號. 頁面：功能` 格式，description 和 tags 要完整
6. **清理**：改完後立即清理停用的副本，不留殘骸

**Why:** 2026-04-09 因為不斷新增覆蓋，從 ~60 個 snippet 膨脹到 150 個，造成衝突、破版、花一整天救火。
**How to apply:** 每次要動 snippet 時先讀這條規則。
