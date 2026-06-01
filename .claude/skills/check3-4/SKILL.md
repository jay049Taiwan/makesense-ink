---
name: check3-4
description: |
  makesense（現思文化）DB schema 變動後的「3 路稽核 + 5 重驗證」全套流程。
  當使用者提到以下任何情境時，立即載入此 skill：
  - 「幫我檢查官網↔Supabase↔Notion」
  - 「跑一次稽核 / check / 對齊 / 比對」
  - 「我改了 DBxx 的欄位 / 選項 / 名稱」
  - 「我刪掉/新增 select 欄位」
  - 「DB schema 改了/變了」
  - 「git 健檢 / repo 檢查 / 看本機 git 狀態」
  - **「檢查3+5 / 檢查3&5 / 檢查35 / 檢查3-5」**（自然語）
  - **「check3+5 / check3&5 / check 3 加5 / 跑3+5」**
  - 直接打 `/check3-5` 或 `/check35`
  - 向下相容：「check3+4 / check3&4 / check34 / 檢查3+2 / check3-2 / check32」（舊名仍可觸發）

  目標：使用者每次改 DB schema（改名 / 刪欄位 / 改選項 / 加 relation）後，
  自動跑完整稽核找出所有需要對齊的位置，產整合報告，再詢問是否動手修。

  使用者風格：每次只大致說明改了什麼（甚至不講），AI 自己抓 live schema 比對找差異。
---

# /check3-5 — 全套稽核流程

請參閱 check3-5 skill 的完整內容。
