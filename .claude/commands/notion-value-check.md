---
description: Notion DB01~09 的「資料填寫品質」健檢。觸發詞：`nvc`、「notion 值檢查」「審值」「資料品質」「nvc DB05」「nvc 空值」「nvc 孤兒 relation」。 與 nsc 區分：nsc 看欄位本身是不是設計好，nvc 看每個 page 的值是不是乾淨。 檢查項目：title 重複、必填欄位空值、relation 孤兒、數值異常、date 圍外、status 缺漏、殭
---

請依使用者輸入的 $ARGUMENTS 觸發並執行 skill `notion-value-check`。優先使用 Skill tool 載入 `notion-value-check` 並按其 SKILL.md 規範執行。
