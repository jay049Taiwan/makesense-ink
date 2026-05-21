---
name: 不要批量修改 snippet
description: 每個 snippet 逐一討論、逐一確認、逐一修改，不要自動化大量處理
type: feedback
---

不要批量自動化修改 snippet。每一個都要：
1. 先讀完程式碼
2. 向用戶說明問題和修改方案
3. 等用戶確認
4. 才動手改
5. 改完驗證

**Why:** 2026-04-09 批量自動修改導致 PHP 嚴重錯誤（EY-CAL 檔案被截斷）、重複 snippet 暴增、問題越修越多。用戶明確要求不要這樣做。
**How to apply:** 即使有 10 個 snippet 要改，也是一個一個來。不用 for loop 批量處理 snippet 的程式碼變更。
