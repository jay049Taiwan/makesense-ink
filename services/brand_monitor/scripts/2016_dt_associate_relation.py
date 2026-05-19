"""
2016 地方通訊 聯想棒：撈 147 個 FB POST 的「對應標籤/對應對象/對應地點」(→DB08)
按月聚合寫到 12 月刊；季刊用 3 個月聯集；年刊全年聯集。
寫 ai聯想=完成 + ai聯想備註。
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

QUARTER_PAGE_IDS = {
    1: ("35f9ff25-fdab-8142-9148-ea3a73160ae4", [1, 2, 3]),
    2: ("35f9ff25-fdab-817d-84bb-e99587738c84", [4, 5, 6]),
    3: ("35f9ff25-fdab-8152-bb38-e3c59e8180a6", [7, 8, 9]),
    4: ("35f9ff25-fdab-81c9-af66-f45044a0e581", [10, 11, 12]),
}

YEAR_PAGE_ID = "35f9ff25-fdab-8135-9ee2-f1042e71e46c"

RELATION_FIELDS = ["對應標籤", "對應對象", "對應地點"]


def query_2016_fb_posts():
    """撈 2016 全年 FB POST + 對應標籤/對應對象/對應地點 relation IDs"""
    url = f"https://api.notion.com/v1/databases/{DB05_DATABASE_ID}/query"
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
    next_cursor = None
    while True:
        if next_cursor:
            body["start_cursor"] = next_cursor
        r = requests.post(url, headers=HEADERS, json=body)
        r.raise_for_status()
        data = r.json()
        for page in data["results"]:
            pid = page["id"]
            props = page["properties"]
            date_str = (props.get("執行時間", {}).get("date") or {}).get("start")
            rels = {f: [x["id"] for x in props.get(f, {}).get("relation", [])] for f in RELATION_FIELDS}
            results.append((pid, date_str, rels))
        if not data.get("has_more"):
            break
        next_cursor = data.get("next_cursor")
        time.sleep(0.34)

    return results


def aggregate(rows, month_filter=None):
    """聚合 relation。month_filter=None 表示全部；否則 set of months"""
    agg = {f: set() for f in RELATION_FIELDS}
    count = 0
    for pid, date_str, rels in rows:
        if not date_str:
            continue
        try:
            dt = datetime.strptime(date_str[:10], "%Y-%m-%d")
        except ValueError:
            continue
        if dt.year != 2016:
            continue
        if month_filter is not None and dt.month not in month_filter:
            continue
        count += 1
        for f in RELATION_FIELDS:
            agg[f].update(rels.get(f, []))
    return agg, count


def update_page(page_id, agg, source_count, scope_label, scope_range):
    counts = {f: len(agg[f]) for f in RELATION_FIELDS}
    memo = (
        f"{scope_label}：從 {source_count} 篇 FB POST（{scope_range}）聚合得 "
        f"對應標籤 {counts['對應標籤']} 個、對應對象 {counts['對應對象']} 個、對應地點 {counts['對應地點']} 個。"
    )

    body_props = {
        "ai聯想": {"status": {"name": "完成"}},
        "ai聯想備註": {"rich_text": [{"type": "text", "text": {"content": memo}}]},
    }
    for f in RELATION_FIELDS:
        body_props[f] = {"relation": [{"id": x} for x in agg[f]]}

    url = f"https://api.notion.com/v1/pages/{page_id}"
    r = requests.patch(url, headers=HEADERS, json={"properties": body_props})
    if r.status_code != 200:
        print(f"  ❌ {scope_label} 失敗 ({r.status_code}): {r.text[:200]}")
        return False, counts
    return True, counts


def main():
    print("Step 1: 撈 2016 FB POST + relation IDs...")
    rows = query_2016_fb_posts()
    print(f"  共 {len(rows)} 筆")

    print("\nStep 2: 寫 12 月刊...")
    for m in range(1, 13):
        agg, cnt = aggregate(rows, month_filter={m})
        page_id = MONTH_PAGE_IDS[m]
        ok, counts = update_page(page_id, agg, cnt, f"2016-{m:02d} 月刊", f"2016-{m:02d}")
        if ok:
            print(f"  ✅ 2016-{m:02d}: 標籤 {counts['對應標籤']}/對象 {counts['對應對象']}/地點 {counts['對應地點']}")
        time.sleep(0.34)

    print("\nStep 3: 寫 4 季刊...")
    for q, (pid, months) in QUARTER_PAGE_IDS.items():
        agg, cnt = aggregate(rows, month_filter=set(months))
        ok, counts = update_page(pid, agg, cnt, f"2016-Q{q} 季刊", f"2016-{months[0]:02d}~{months[-1]:02d}")
        if ok:
            print(f"  ✅ Q{q}: 標籤 {counts['對應標籤']}/對象 {counts['對應對象']}/地點 {counts['對應地點']}")
        time.sleep(0.34)

    print("\nStep 4: 寫年刊...")
    agg, cnt = aggregate(rows, month_filter=None)
    ok, counts = update_page(YEAR_PAGE_ID, agg, cnt, "2016 年刊", "2016 全年")
    if ok:
        print(f"  ✅ 年刊: 標籤 {counts['對應標籤']}/對象 {counts['對應對象']}/地點 {counts['對應地點']}")

    print("\n✨ 全部完成")


if __name__ == "__main__":
    main()
