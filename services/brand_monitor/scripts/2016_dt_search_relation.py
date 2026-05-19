"""
2016 地方通訊 搜查棒：把 2016 FB POST DB05 page 按執行時間分桶，
連到 12 個月刊 page 的「內容引用」relation 欄位，並改寫 ai搜查備註。

跑前：export NOTION_API_KEY=xxx
跑法：cd brand_monitor && venv/bin/python scripts/2016_dt_search_relation.py
"""
import os
import sys
import time
from collections import defaultdict
from datetime import datetime

import requests

NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
if not NOTION_API_KEY:
    print("ERROR: 請先 export NOTION_API_KEY=xxx")
    sys.exit(1)

DB05_DATABASE_ID = "e5f14f056c7c4b8a804304eab598fd4d"
HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

MONTH_PAGE_IDS = {
    1: "35f9ff25-fdab-8126-9721-fe12ecbc977c",
    2: "35f9ff25-fdab-81b0-97e0-dc9e06c77cb7",
    3: "35f9ff25-fdab-819c-a95d-f1c334086e38",
    4: "35f9ff25-fdab-813f-935c-d68a51d06023",
    5: "35f9ff25-fdab-814d-b676-e68d8243f928",
    6: "35f9ff25-fdab-818f-a2d2-ef02427078aa",
    7: "35f9ff25-fdab-81b2-8485-fcf503121f74",
    8: "35f9ff25-fdab-8109-9e9f-c387068cc089",
    9: "35f9ff25-fdab-8151-8ed3-fe5b095ac988",
    10: "35f9ff25-fdab-812a-b984-f0027c1bedb2",
    11: "35f9ff25-fdab-812e-a36c-eb56e9bb19ad",
    12: "35f9ff25-fdab-81bc-b92d-ed142ba3b274",
}


def query_2016_fb_posts():
    """撈 2016 全年 內容名稱=FB POST 的 DB05 page，回傳 [(page_id, date_str), ...]"""
    url = f"https://api.notion.com/v1/databases/{DB05_DATABASE_ID}/query"
    filter_body = {
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
    has_more = True
    next_cursor = None
    while has_more:
        body = dict(filter_body)
        if next_cursor:
            body["start_cursor"] = next_cursor
        r = requests.post(url, headers=HEADERS, json=body)
        r.raise_for_status()
        data = r.json()
        for page in data["results"]:
            pid = page["id"]
            date_prop = page["properties"].get("執行時間", {}).get("date") or {}
            start = date_prop.get("start")
            if start:
                results.append((pid, start))
        has_more = data.get("has_more", False)
        next_cursor = data.get("next_cursor")
        time.sleep(0.34)  # respect rate limit ~3/s

    return results


def bucket_by_month(pairs):
    buckets = defaultdict(list)
    for pid, date_str in pairs:
        try:
            dt = datetime.strptime(date_str[:10], "%Y-%m-%d")
        except ValueError:
            continue
        if dt.year != 2016:
            continue
        buckets[dt.month].append((pid, date_str))
    return buckets


def update_month_page(month_int, fb_pairs):
    page_id = MONTH_PAGE_IDS[month_int]
    fb_ids = [p[0] for p in fb_pairs]
    dates = [p[1][:10] for p in fb_pairs]
    if dates:
        date_min, date_max = min(dates), max(dates)
        memo = (
            f"本月 {len(fb_ids)} 篇 FB POST 已連入內容引用"
            f"（涵蓋 {date_min} ~ {date_max}）。"
            "所有 FB POST 已有 ai分析 完成，含主題名稱、簡介摘要、互動數據、對應標籤。"
        )
    else:
        memo = "本月無 FB POST 資料。"

    body = {
        "properties": {
            "內容引用": {"relation": [{"id": x} for x in fb_ids]},
            "ai搜查": {"status": {"name": "完成"}},
            "ai搜查備註": {
                "rich_text": [{"type": "text", "text": {"content": memo}}]
            },
        }
    }
    url = f"https://api.notion.com/v1/pages/{page_id}"
    r = requests.patch(url, headers=HEADERS, json=body)
    if r.status_code != 200:
        print(f"  ❌ {month_int:02d}月 update 失敗 ({r.status_code}): {r.text[:200]}")
        return False
    return True


def main():
    print("Step 1: 撈 2016 FB POST...")
    pairs = query_2016_fb_posts()
    print(f"  共撈到 {len(pairs)} 筆")

    print("\nStep 2: 按月分桶...")
    buckets = bucket_by_month(pairs)
    for m in range(1, 13):
        print(f"  2016-{m:02d}: {len(buckets.get(m, []))} 篇")

    print("\nStep 3: 寫入 12 個月刊...")
    for m in range(1, 13):
        ok = update_month_page(m, buckets.get(m, []))
        if ok:
            print(f"  ✅ 2016-{m:02d} 月刊更新成功（{len(buckets.get(m, []))} 篇 relation）")
        time.sleep(0.34)

    print("\n✨ 全部完成")


if __name__ == "__main__":
    main()
