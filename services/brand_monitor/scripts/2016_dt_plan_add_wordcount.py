"""補 Step 5 v2 章節架構的【字數目標】到 ai企劃備註結尾"""
import os, sys, time, requests

NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
if not NOTION_API_KEY:
    sys.exit("ERROR: NOTION_API_KEY 未設")

HEADERS = {"Authorization": f"Bearer {NOTION_API_KEY}", "Notion-Version": "2022-06-28", "Content-Type": "application/json"}

# (page_id, 刊型)
SCOPE = [
    ("35f9ff25-fdab-8126-9721-fe12ecbc977c", "月刊"),
    ("35f9ff25-fdab-81b0-97e0-dc9e06c77cb7", "月刊"),
    ("35f9ff25-fdab-819c-a95d-f1c334086e38", "月刊"),
    ("35f9ff25-fdab-8142-9148-ea3a73160ae4", "季刊"),
    ("35f9ff25-fdab-813f-935c-d68a51d06023", "月刊"),
    ("35f9ff25-fdab-814d-b676-e68d8243f928", "月刊"),
    ("35f9ff25-fdab-818f-a2d2-ef02427078aa", "月刊"),
    ("35f9ff25-fdab-817d-84bb-e99587738c84", "季刊"),
    ("35f9ff25-fdab-81b2-8485-fcf503121f74", "月刊"),
    ("35f9ff25-fdab-8109-9e9f-c387068cc089", "月刊"),
    ("35f9ff25-fdab-8151-8ed3-fe5b095ac988", "月刊"),
    ("35f9ff25-fdab-8152-bb38-e3c59e8180a6", "季刊"),
    ("35f9ff25-fdab-812a-b984-f0027c1bedb2", "月刊"),
    ("35f9ff25-fdab-812e-a36c-eb56e9bb19ad", "月刊"),
    ("35f9ff25-fdab-81bc-b92d-ed142ba3b274", "月刊"),
    ("35f9ff25-fdab-81c9-af66-f45044a0e581", "季刊"),
    ("35f9ff25-fdab-8135-9ee2-f1042e71e46c", "年刊"),
]

TARGETS = {"月刊": "【字數目標】150–250 字", "季刊": "【字數目標】150–250 字", "年刊": "【字數目標】250–400 字"}


def main():
    for pid, kind in SCOPE:
        r = requests.get(f"https://api.notion.com/v1/pages/{pid}", headers=HEADERS)
        r.raise_for_status()
        rt = r.json()["properties"].get("ai企劃備註", {}).get("rich_text", [])
        cur = "".join(t.get("plain_text", "") for t in rt)
        if "【字數目標】" in cur:
            print(f"  ⏭️  {pid[-12:]} 已有字數目標，跳過")
            continue
        new = cur.rstrip() + "\n" + TARGETS[kind]
        body = {"properties": {"ai企劃備註": {"rich_text": [{"type": "text", "text": {"content": new}}]}}}
        r2 = requests.patch(f"https://api.notion.com/v1/pages/{pid}", headers=HEADERS, json=body)
        print(f"  {'✅' if r2.status_code == 200 else '❌'} {pid[-12:]} ({kind}) 補上 {TARGETS[kind]}")
        time.sleep(0.34)


if __name__ == "__main__":
    main()
