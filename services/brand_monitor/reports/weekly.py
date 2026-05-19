"""週報產生器"""

import logging
from datetime import date, timedelta

from notion import client, db01
from config import DB01_ID
from keyword_engine.expander import get_weekly_expansions, clear_weekly_log

logger = logging.getLogger(__name__)


async def generate() -> str:
    """產生本週情報週報。"""
    today = date.today()
    week_ago = today - timedelta(days=7)
    two_weeks_later = today + timedelta(days=14)

    lines = [
        f"📊 品牌提案情報週報 ({week_ago.strftime('%m/%d')} ~ {today.strftime('%m/%d')})\n"
    ]

    # === 本週新增提案統計 ===
    try:
        new_pages = await client.query_db(
            DB01_ID,
            filter_json={
                "timestamp": "created_time",
                "created_time": {"on_or_after": week_ago.isoformat()},
            },
        )

        categories = {}
        yilan_count = 0
        for page in new_pages:
            cat = client.extract_select(page, "參與屬性") or "未分類"
            categories[cat] = categories.get(cat, 0) + 1
            title = client.extract_title(page, "專案名稱")
            if "宜蘭" in title:
                yilan_count += 1

        total = len(new_pages)
        lines.append(f"📌 本週新增提案: {total} 筆")
        if yilan_count:
            lines.append(f"   ⭐ 其中宜蘭相關: {yilan_count} 筆")
        for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
            lines.append(f"   • {cat}: {count} 筆")
        lines.append("")

    except Exception as e:
        lines.append(f"📌 本週統計讀取失敗: {e}\n")

    # === 即將截止 ===
    try:
        upcoming = await client.query_db(
            DB01_ID,
            filter_json={
                "and": [
                    {
                        "property": "截止時間",
                        "date": {"on_or_after": today.isoformat()},
                    },
                    {
                        "property": "截止時間",
                        "date": {"on_or_before": two_weeks_later.isoformat()},
                    },
                    {
                        "property": "執行狀態",
                        "status": {"equals": "預計提案"},
                    },
                ]
            },
            sorts=[{"property": "截止時間", "direction": "ascending"}],
        )

        if upcoming:
            lines.append(f"⏰ 即將截止（14 天內）: {len(upcoming)} 筆")
            for page in upcoming[:10]:
                title = client.extract_title(page, "專案名稱")
                deadline = client.extract_date(page, "截止時間") or "?"
                lines.append(f"   • {title[:40]} — 截止 {deadline}")
            lines.append("")
        else:
            lines.append("⏰ 14 天內無即將截止的提案\n")

    except Exception as e:
        lines.append(f"⏰ 截止日讀取失敗: {e}\n")

    # === 新增關鍵字 ===
    expansions = get_weekly_expansions()
    if expansions:
        new_orgs = [e for e in expansions if e.get("action_type") == "new_org"]
        new_topics = [e for e in expansions if e.get("action_type") == "new_topic"]

        lines.append(f"🆕 本週新增關鍵字: {len(expansions)} 個")
        if new_orgs:
            lines.append(f"   組織 ({len(new_orgs)}):")
            for org in new_orgs:
                lines.append(f"   • {org['name']} ← {org.get('source', '')}")
        if new_topics:
            lines.append(f"   主題 ({len(new_topics)}):")
            for topic in new_topics:
                lines.append(f"   • {topic['name']} ← {topic.get('source', '')}")
        lines.append("   👆 以上關鍵字已自動加入 DB08，請確認是否保留")
        lines.append("")

        # 清除週記錄
        clear_weekly_log()
    else:
        lines.append("🆕 本週無新增關鍵字\n")

    # === 系統狀態 ===
    tracked = await db01.get_tracked_tenders()
    lines.append(f"📈 系統狀態")
    lines.append(f"   • 追蹤中標案: {len(tracked)} 筆")
    lines.append(f"   • 系統運作正常 ✅")

    return "\n".join(lines)
