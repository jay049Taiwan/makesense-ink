"""
Step 4 ai_meta 修正為 3-token 規範：[類型]｜[執行時間]｜[關聯 DB]
- 類型 = 地方通訊（DB05 路線C 最底位階 select）
- 執行時間 = 月刊 YYYY/MM、季刊 YYYY/QX、年刊 YYYY/Year
- 關聯 DB = DB04（母協作）
"""
import os
import sys
import time
import requests

NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
if not NOTION_API_KEY:
    sys.exit("ERROR: NOTION_API_KEY 未設")

HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

PAGES = [
    ("35f9ff25-fdab-8126-9721-fe12ecbc977c", "2016/01"),
    ("35f9ff25-fdab-81b0-97e0-dc9e06c77cb7", "2016/02"),
    ("35f9ff25-fdab-819c-a95d-f1c334086e38", "2016/03"),
    ("35f9ff25-fdab-8142-9148-ea3a73160ae4", "2016/Q1"),
    ("35f9ff25-fdab-813f-935c-d68a51d06023", "2016/04"),
    ("35f9ff25-fdab-814d-b676-e68d8243f928", "2016/05"),
    ("35f9ff25-fdab-818f-a2d2-ef02427078aa", "2016/06"),
    ("35f9ff25-fdab-817d-84bb-e99587738c84", "2016/Q2"),
    ("35f9ff25-fdab-81b2-8485-fcf503121f74", "2016/07"),
    ("35f9ff25-fdab-8109-9e9f-c387068cc089", "2016/08"),
    ("35f9ff25-fdab-8151-8ed3-fe5b095ac988", "2016/09"),
    ("35f9ff25-fdab-8152-bb38-e3c59e8180a6", "2016/Q3"),
    ("35f9ff25-fdab-812a-b984-f0027c1bedb2", "2016/10"),
    ("35f9ff25-fdab-812e-a36c-eb56e9bb19ad", "2016/11"),
    ("35f9ff25-fdab-81bc-b92d-ed142ba3b274", "2016/12"),
    ("35f9ff25-fdab-81c9-af66-f45044a0e581", "2016/Q4"),
    ("35f9ff25-fdab-8135-9ee2-f1042e71e46c", "2016/Year"),
]


def main():
    for pid, when in PAGES:
        ai_meta = f"地方通訊｜{when}｜DB04"
        body = {"properties": {"ai_meta": {"rich_text": [{"type": "text", "text": {"content": ai_meta}}]}}}
        r = requests.patch(f"https://api.notion.com/v1/pages/{pid}", headers=HEADERS, json=body)
        print(f"  {'✅' if r.status_code == 200 else '❌'} {pid[-12:]} → {ai_meta}")
        time.sleep(0.34)
    print("\n✨ ai_meta 校正完成")


if __name__ == "__main__":
    main()
