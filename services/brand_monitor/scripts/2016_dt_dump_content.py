"""
撈 2016 17 篇通訊 + 147 FB POST 的真實內容，輸出到 2016_dt_content_dump.md
給後續手動讀 + 寫 Step 5 企劃章節架構用。
"""
import os
import sys
import time
import json
from collections import defaultdict
from datetime import datetime

import requests

NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
if not NOTION_API_KEY:
    print("ERROR: 請先 export NOTION_API_KEY=xxx")
    sys.exit(1)

DB05 = "e5f14f056c7c4b8a804304eab598fd4d"
HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

NEWSLETTER_IDS = {
    "01月": "35f9ff25-fdab-8126-9721-fe12ecbc977c",
    "02月": "35f9ff25-fdab-81b0-97e0-dc9e06c77cb7",
    "03月": "35f9ff25-fdab-819c-a95d-f1c334086e38",
    "Q1": "35f9ff25-fdab-8142-9148-ea3a73160ae4",
    "04月": "35f9ff25-fdab-813f-935c-d68a51d06023",
    "05月": "35f9ff25-fdab-814d-b676-e68d8243f928",
    "06月": "35f9ff25-fdab-818f-a2d2-ef02427078aa",
    "Q2": "35f9ff25-fdab-817d-84bb-e99587738c84",
    "07月": "35f9ff25-fdab-81b2-8485-fcf503121f74",
    "08月": "35f9ff25-fdab-8109-9e9f-c387068cc089",
    "09月": "35f9ff25-fdab-8151-8ed3-fe5b095ac988",
    "Q3": "35f9ff25-fdab-8152-bb38-e3c59e8180a6",
    "10月": "35f9ff25-fdab-812a-b984-f0027c1bedb2",
    "11月": "35f9ff25-fdab-812e-a36c-eb56e9bb19ad",
    "12月": "35f9ff25-fdab-81bc-b92d-ed142ba3b274",
    "Q4": "35f9ff25-fdab-81c9-af66-f45044a0e581",
    "Year": "35f9ff25-fdab-8135-9ee2-f1042e71e46c",
}


def rt_text(rich_text):
    return "".join(t.get("plain_text", "") for t in rich_text or [])


def get_props(page_id):
    r = requests.get(f"https://api.notion.com/v1/pages/{page_id}", headers=HEADERS)
    r.raise_for_status()
    p = r.json()["properties"]

    def prop(name, kind):
        v = p.get(name, {})
        if kind == "title":
            return rt_text(v.get("title", []))
        if kind == "rich_text":
            return rt_text(v.get("rich_text", []))
        if kind == "date":
            return (v.get("date") or {}).get("start", "")
        return ""

    return {
        "title": prop("內容名稱", "title"),
        "主題名稱": prop("主題名稱", "rich_text"),
        "簡介摘要": prop("簡介摘要", "rich_text"),
        "執行時間": prop("執行時間", "date"),
        "執行構想": prop("執行構想", "rich_text"),
        "ai管考備註": prop("ai管考備註", "rich_text"),
    }


def get_content(page_id):
    """撈 page block content，回傳純文字"""
    r = requests.get(f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=100", headers=HEADERS)
    if r.status_code != 200:
        return ""
    blocks = r.json().get("results", [])
    chunks = []
    for b in blocks:
        t = b.get("type")
        if t in ("paragraph", "heading_1", "heading_2", "heading_3", "quote", "bulleted_list_item", "numbered_list_item"):
            chunks.append(rt_text(b.get(t, {}).get("rich_text", [])))
    return "\n".join(c for c in chunks if c)


def query_fb_posts():
    """撈 147 個 2016 FB POST 的關鍵欄位"""
    url = f"https://api.notion.com/v1/databases/{DB05}/query"
    body = {
        "filter": {
            "and": [
                {"property": "內容名稱", "title": {"equals": "FB POST"}},
                {"property": "執行時間", "date": {"on_or_after": "2016-01-01"}},
                {"property": "執行時間", "date": {"on_or_before": "2016-12-31"}},
            ]
        },
        "sorts": [{"property": "執行時間", "direction": "ascending"}],
        "page_size": 100,
    }
    results = []
    cursor = None
    while True:
        if cursor:
            body["start_cursor"] = cursor
        r = requests.post(url, headers=HEADERS, json=body)
        r.raise_for_status()
        d = r.json()
        for p in d["results"]:
            props = p["properties"]
            results.append({
                "id": p["id"],
                "date": (props.get("執行時間", {}).get("date") or {}).get("start"),
                "主題名稱": rt_text(props.get("主題名稱", {}).get("rich_text", [])),
                "簡介摘要": rt_text(props.get("簡介摘要", {}).get("rich_text", [])),
            })
        if not d.get("has_more"):
            break
        cursor = d.get("next_cursor")
        time.sleep(0.34)
    return results


def main():
    out = []
    print("撈 17 篇通訊...")
    newsletter_data = {}
    for label, pid in NEWSLETTER_IDS.items():
        props = get_props(pid)
        content = get_content(pid)
        newsletter_data[label] = {**props, "content": content}
        print(f"  ✅ {label}")
        time.sleep(0.34)

    print("撈 147 篇 FB POST...")
    fb_posts = query_fb_posts()
    print(f"  ✅ {len(fb_posts)} 筆")

    # 分桶
    fb_by_month = defaultdict(list)
    for fb in fb_posts:
        if not fb["date"]:
            continue
        try:
            dt = datetime.strptime(fb["date"][:10], "%Y-%m-%d")
            if dt.year == 2016:
                fb_by_month[dt.month].append(fb)
        except ValueError:
            continue

    # 輸出 markdown
    out.append("# 2016 地方通訊內容 dump\n")
    month_label = {1: "01月", 2: "02月", 3: "03月", 4: "04月", 5: "05月", 6: "06月",
                   7: "07月", 8: "08月", 9: "09月", 10: "10月", 11: "11月", 12: "12月"}

    # 月刊 + 該月 FB POST
    for m in range(1, 13):
        label = month_label[m]
        n = newsletter_data[label]
        out.append(f"\n## ==== 2016-{m:02d} 月刊 ====")
        out.append(f"主題名稱：{n['主題名稱']}")
        out.append(f"簡介摘要：{n['簡介摘要']}")
        out.append(f"執行構想：{n['執行構想']}")
        out.append(f"--- Noah 親撰 page content ---")
        out.append(n['content'][:3000])
        out.append(f"\n--- 該月 {len(fb_by_month[m])} 篇 FB POST ---")
        for fb in fb_by_month[m]:
            out.append(f"[{fb['date']}] {fb['主題名稱']}")
            if fb['簡介摘要']:
                out.append(f"  └ {fb['簡介摘要'][:200]}")

    # 季刊
    quarter_months = {"Q1": [1,2,3], "Q2": [4,5,6], "Q3": [7,8,9], "Q4": [10,11,12]}
    for q in ["Q1", "Q2", "Q3", "Q4"]:
        n = newsletter_data[q]
        out.append(f"\n## ==== 2016-{q} 季刊 ====")
        out.append(f"主題名稱：{n['主題名稱']}")
        out.append(f"簡介摘要：{n['簡介摘要']}")
        out.append(f"執行構想：{n['執行構想']}")
        out.append(f"--- Noah 親撰 page content ---")
        out.append(n['content'][:3000])

    # 年刊
    n = newsletter_data["Year"]
    out.append(f"\n## ==== 2016 年刊 ====")
    out.append(f"主題名稱：{n['主題名稱']}")
    out.append(f"簡介摘要：{n['簡介摘要']}")
    out.append(f"執行構想：{n['執行構想']}")
    out.append(f"--- Noah 親撰 page content ---")
    out.append(n['content'][:5000])

    output_path = "/Users/jay049/Documents/工作參考資料/brand_monitor/scripts/2016_dt_content_dump.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"\n✨ 輸出至 {output_path}")
    print(f"  總大小 {os.path.getsize(output_path)} bytes")


if __name__ == "__main__":
    main()
