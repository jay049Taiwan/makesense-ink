"""
2016 地方通訊 分析棒：寫 ai_meta + ai分析=完成 + ai分析備註。
ai_meta 格式：內容素材｜地方通訊月刊／季刊／年刊｜YYYY-MM-DD｜DB04：地方通訊
"""
import os
import sys
import time
import requests

NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
if not NOTION_API_KEY:
    print("ERROR: 請先 export NOTION_API_KEY=xxx")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

# (page_id, 刊型, 執行日期, 月份 / 季份 / 年份標籤)
PAGES = [
    ("35f9ff25-fdab-8126-9721-fe12ecbc977c", "月刊", "2016-01-31", "01月"),
    ("35f9ff25-fdab-81b0-97e0-dc9e06c77cb7", "月刊", "2016-02-29", "02月"),
    ("35f9ff25-fdab-819c-a95d-f1c334086e38", "月刊", "2016-03-31", "03月"),
    ("35f9ff25-fdab-8142-9148-ea3a73160ae4", "季刊", "2016-03-31", "Q1"),
    ("35f9ff25-fdab-813f-935c-d68a51d06023", "月刊", "2016-04-30", "04月"),
    ("35f9ff25-fdab-814d-b676-e68d8243f928", "月刊", "2016-05-31", "05月"),
    ("35f9ff25-fdab-818f-a2d2-ef02427078aa", "月刊", "2016-06-30", "06月"),
    ("35f9ff25-fdab-817d-84bb-e99587738c84", "季刊", "2016-06-30", "Q2"),
    ("35f9ff25-fdab-81b2-8485-fcf503121f74", "月刊", "2016-07-31", "07月"),
    ("35f9ff25-fdab-8109-9e9f-c387068cc089", "月刊", "2016-08-31", "08月"),
    ("35f9ff25-fdab-8151-8ed3-fe5b095ac988", "月刊", "2016-09-30", "09月"),
    ("35f9ff25-fdab-8152-bb38-e3c59e8180a6", "季刊", "2016-09-30", "Q3"),
    ("35f9ff25-fdab-812a-b984-f0027c1bedb2", "月刊", "2016-10-31", "10月"),
    ("35f9ff25-fdab-812e-a36c-eb56e9bb19ad", "月刊", "2016-11-30", "11月"),
    ("35f9ff25-fdab-81bc-b92d-ed142ba3b274", "月刊", "2016-12-31", "12月"),
    ("35f9ff25-fdab-81c9-af66-f45044a0e581", "季刊", "2016-12-31", "Q4"),
    ("35f9ff25-fdab-8135-9ee2-f1042e71e46c", "年刊", "2016-12-31", "Year"),
]

# 月份 FB POST 數（前一棒輸出）
MONTH_COUNTS = {1: 6, 2: 8, 3: 6, 4: 16, 5: 18, 6: 12, 7: 14, 8: 27, 9: 8, 10: 16, 11: 9, 12: 7}


def analyze_memo(kind, label, date_str):
    if kind == "月刊":
        m = int(label[:2])
        n = MONTH_COUNTS.get(m, 0)
        return (
            f"2016-{m:02d} 月刊內容素材分析：本月 {n} 篇 FB POST 為主要外部素材，"
            f"由 ai搜查棒連入內容引用、ai聯想棒已聚合對應標籤至 DB08。"
            "素材主軸由 ai管考備註【執行構想】指引，下游企劃棒據此設章節架構。"
            "Noah 親撰文案已存於 page content，文案棒重跑時須保留語氣特徵。"
        )
    if kind == "季刊":
        return (
            f"2016-{label} 季刊內容素材分析：聚合該季 3 個月實況，"
            "視野提一階，提煉季度共同精神（不是月刊列舉）。"
            "對應標籤來自下屬月刊的 DB08 聯集；FB POST relation 不重複連，"
            "資料由所屬月刊聚合查讀。下游企劃棒據此設季度敘事弧。"
        )
    # 年刊
    return (
        "2016 年刊內容素材分析：回望全年敘事弧——Q1 醞釀（選書/移民史）"
        "→ Q2 起跑（小屋園遊/舊城本事系列首發）→ Q3 密集執行（七八月深度見學）"
        "→ Q4 收成（市集/展覽/年末文學）。147 篇 FB POST 為背景，"
        "由 12 個月刊聚合查讀。下游企劃棒據此寫 2016 整年位置感。"
    )


def main():
    for pid, kind, date_str, label in PAGES:
        ai_meta = f"內容素材｜地方通訊{kind}｜{date_str}｜DB04：地方通訊"
        memo = analyze_memo(kind, label, date_str)
        body = {
            "properties": {
                "ai_meta": {"rich_text": [{"type": "text", "text": {"content": ai_meta}}]},
                "ai分析": {"status": {"name": "完成"}},
                "ai分析備註": {"rich_text": [{"type": "text", "text": {"content": memo}}]},
            }
        }
        r = requests.patch(f"https://api.notion.com/v1/pages/{pid}", headers=HEADERS, json=body)
        status = "✅" if r.status_code == 200 else f"❌ {r.status_code}"
        print(f"  {status} {kind} {label} ({date_str})")
        if r.status_code != 200:
            print(f"    {r.text[:200]}")
        time.sleep(0.34)
    print("\n✨ 全部完成")


if __name__ == "__main__":
    main()
