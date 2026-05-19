"""品牌提案情報監測系統 — 主程式入口

兩份報告：
1. 品牌提案參考報告（標案 + 補助）
2. 關係社群分析報告（輿情監測）
"""

import asyncio
import json
import logging
import signal
import sys
import os
from datetime import date
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

import config
from notion import db08, db01, db05, client as notion_client
from notion.db01 import ProposalData
from monitors import procurement, subsidy, sentiment
from ai import assessor
from keyword_engine import expander
from telegram_notify import sender  # 2026/05/09 從 discord_notify 改 telegram_notify
from reports import weekly
from utils.org_lookup import lookup as org_lookup
from utils.downloader import download_tender_attachments

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("brand_monitor")

# 待確認案件暫存檔（Telegram message_id → 案件資料）
# 2026/05/09：原 discord_bot.py 已退役；Telegram 端 callback 待 hihi 總管 Bot 接管
# 此 JSON 仍會寫入，等 Telegram callback handler 上線後讀取
PENDING_PROPOSALS_FILE = Path(__file__).parent / "state" / "pending_proposals.json"


def _save_pending(msg_id: str, case_data: dict):
    """把案件資料存到 JSON，key = Discord message ID。"""
    pending = {}
    if PENDING_PROPOSALS_FILE.exists():
        try:
            pending = json.loads(PENDING_PROPOSALS_FILE.read_text("utf-8"))
        except Exception:
            pending = {}
    pending[msg_id] = case_data
    PENDING_PROPOSALS_FILE.write_text(json.dumps(pending, ensure_ascii=False, indent=2), "utf-8")


def _fmt_price(price: int) -> str:
    if not price:
        return "未公告"
    return f"${price:,}元"


# ====================================================================
# 報告一：品牌提案參考報告
# ====================================================================
async def run_proposal_report(report_date: date = None):
    if report_date is None:
        report_date = date.today()
    date_str = report_date.strftime("%Y/%m/%d")
    wd = "一二三四五六日"[report_date.weekday()]

    try:
        logger.info("========== 品牌提案參考報告開始 ==========")

        keywords = await db08.load_keywords()
        tender_results = await procurement.scan(keywords)
        subsidy_results = await subsidy.scan(keywords)

        # AI 評估（含建議主題標籤）
        new_tenders = [r for r in tender_results if not r.is_award]
        for t in new_tenders:
            a = await assessor.assess(t.title, t.unit_name)
            t.relevance_score = a.relevance_score
            t.ai_assessment = a.assessment
            t.ai_positioning = a.positioning
            t.category = a.suggested_category or t.category
            t.suggested_topic = a.suggested_topic
            t.plan_name = a.plan_name  # 計畫名稱（延續性計畫）

        for s in subsidy_results:
            a = await assessor.assess(s.title, s.source_name)
            s.relevance_score = a.relevance_score
            s.ai_assessment = a.assessment
            s.ai_positioning = a.positioning

        # 過濾：相關度 ≥ 30
        relevant_tenders = [
            r for r in new_tenders
            if r.relevance_score >= 30
        ]

        relevant_subsidies = [
            r for r in subsidy_results if r.relevance_score >= 30
        ]

        # 關鍵字擴充
        expansion_actions = await expander.expand_from_procurement(
            relevant_tenders, keywords
        )

        def _fmt_deadline(d: str) -> str:
            if not d:
                return "未公告"
            return d.replace("-", "/")

        # === 每案獨立發訊息到 L5 頻道（不寫 DB01）===
        total = 0

        # 開場訊息
        await sender.send_single(
            f"📋 品牌提案參考報告 — {date_str}（{wd}）\n"
            f"標案 {len(relevant_tenders)} 筆 ｜ 獎補助 {len(relevant_subsidies)} 筆"
        )

        # 標案：每案一則
        for i, t in enumerate(relevant_tenders, 1):
            total += 1
            yilan_tag = "⭐宜蘭 " if t.is_yilan else ""
            topic = getattr(t, "suggested_topic", "") or ""
            plan = getattr(t, "plan_name", "") or ""
            tags = "、".join(filter(None, [topic, plan]))

            msg = (
                f"{'─' * 30}\n"
                f"{yilan_tag}📌 標案 {i}/{len(relevant_tenders)}\n"
                f"**{t.title}**\n"
                f"\n"
                f"機關：{t.unit_name or '未公告'}\n"
                f"類別：{t.category or '未分類'}\n"
                f"金額：{_fmt_price(t.price)}\n"
                f"截止：{_fmt_deadline(t.deadline)}\n"
                f"相關度：{t.relevance_score}%\n"
            )
            if tags:
                msg += f"標籤：{tags}\n"
            if t.ai_assessment:
                msg += f"\n💡 評估：{t.ai_assessment}\n"
            if t.ai_positioning:
                msg += f"🎯 定位：{t.ai_positioning}\n"
            if t.source_url:
                msg += f"\n🔗 {t.source_url}"

            msg_id = await sender.send_single(msg)
            if msg_id:
                _save_pending(msg_id, {
                    "type": "tender",
                    "title": t.title,
                    "tender_id": t.tender_id or "",
                    "source_url": t.source_url or "",
                    "category": t.category or "",
                    "deadline": t.deadline or "",
                    "ai_assessment": t.ai_assessment or "",
                    "ai_positioning": t.ai_positioning or "",
                    "unit_name": t.unit_name or "",
                    "is_yilan": t.is_yilan,
                    "relevance_score": t.relevance_score,
                    "price": t.price or 0,
                    "suggested_topic": getattr(t, "suggested_topic", "") or "",
                    "plan_name": getattr(t, "plan_name", "") or "",
                })

        # 獎補助：每案一則
        for i, s in enumerate(relevant_subsidies, 1):
            total += 1
            yilan_tag = "⭐宜蘭 " if s.is_yilan else ""

            msg = (
                f"{'─' * 30}\n"
                f"{yilan_tag}🏷️ 獎補助 {i}/{len(relevant_subsidies)}\n"
                f"**{s.title}**\n"
                f"\n"
                f"來源：{s.source_name or '未知'}\n"
                f"截止：{_fmt_deadline(s.deadline)}\n"
                f"相關度：{s.relevance_score}%\n"
            )
            if s.ai_assessment:
                msg += f"\n💡 評估：{s.ai_assessment}\n"
            if s.ai_positioning:
                msg += f"🎯 定位：{s.ai_positioning}\n"
            if s.source_url:
                msg += f"\n🔗 {s.source_url}"

            msg_id = await sender.send_single(msg)
            if msg_id:
                _save_pending(msg_id, {
                    "type": "subsidy",
                    "title": s.title,
                    "tender_id": "",
                    "source_url": s.source_url or "",
                    "category": "獎補助",
                    "deadline": s.deadline or "",
                    "ai_assessment": s.ai_assessment or "",
                    "ai_positioning": s.ai_positioning or "",
                    "unit_name": s.source_name or "",
                    "is_yilan": getattr(s, "is_yilan", False),
                    "relevance_score": s.relevance_score,
                    "price": 0,
                    "suggested_topic": "",
                    "plan_name": "",
                    "matched_keyword_page_id": getattr(s, "matched_keyword_page_id", "") or "",
                })

        # 關鍵字擴充通知
        if expansion_actions:
            kw_msg = f"🆕 自動新增 {len(expansion_actions)} 個關鍵字\n"
            for a in expansion_actions:
                kw_msg += f"• {a.name}\n"
            await sender.send_single(kw_msg)

        # 結尾摘要
        if total == 0:
            await sender.send_single("✅ 今日無符合條件的新標案或獎補助")
        else:
            await sender.send_single(f"✅ 今日共 {total} 筆（僅匯報，未寫入 DB01）")

        # 週一加上週報
        if report_date.weekday() == 0:
            await sender.send_report(await weekly.generate())

        logger.info("========== 品牌提案參考報告完成 ==========")

    except Exception as e:
        logger.exception("品牌提案參考報告失敗")
        await sender.send_error(f"品牌提案參考報告失敗:\n{e}")


# ====================================================================
# 報告二：關係社群分析報告
# ====================================================================
async def run_sentiment_report(report_date: date = None):
    if report_date is None:
        report_date = date.today()
    date_str = report_date.strftime("%Y/%m/%d")
    wd = "一二三四五六日"[report_date.weekday()]

    try:
        logger.info("========== 關係社群分析報告開始 ==========")
        targets = await db08.load_bookstore_targets()
        changes = await sentiment.scan(targets)

        keywords = await db08.load_keywords()
        entity_updates = await procurement.layer3_entity_monitoring(keywords)

        lines = [
            f"📡 關係社群分析報告 — {date_str}（{wd}）",
            "",
            f"監測對象: {len(targets)} 個",
            "",
        ]

        if changes:
            lines.append(f"🔔 {len(changes)} 個網站有變動:")
            lines.append("")
            for c in changes:
                lb = {"website": "官網", "fb": "FB", "ig": "IG"}.get(c.url_type, "網站")
                lines.append(f"• {c.name}（{lb}）")
                if c.snippet:
                    lines.append(f"  {c.snippet[:100]}")
                lines.append(f"  {c.url}")
                lines.append("")
        else:
            lines.append("✅ 所有監測對象今日無變動")
            lines.append("")

        if entity_updates:
            lines.append(f"📌 委託對象動態 ({len(entity_updates)}筆)")
            for u in entity_updates[:10]:
                lines.append(f"• {u['entity_name']}（{u['url_type']}）")
            lines.append("")

        lines.append(f"✅ 監測完成 | 變動: {len(changes)} | 委託: {len(entity_updates)}")

        await sender.send_report("\n".join(lines))
        logger.info("========== 關係社群分析報告完成 ==========")

    except Exception as e:
        logger.exception("關係社群分析報告失敗")
        await sender.send_error(f"關係社群分析報告失敗:\n{e}")


# ====================================================================
async def run_daily(report_date: date = None):
    logger.info("===== 每日排程開始 =====")
    await run_proposal_report(report_date)
    await run_sentiment_report(report_date)
    logger.info("===== 每日排程完成 =====")


async def run_test():
    test_date = date(2026, 3, 20)
    logger.info("===== 測試：模擬 %s =====", test_date)
    await run_daily(test_date)


def main():
    os.makedirs(config.STATE_DIR, exist_ok=True)
    if "--test" in sys.argv:
        asyncio.run(run_test())
        return

    scheduler = AsyncIOScheduler(timezone=config.TIMEZONE)
    scheduler.add_job(
        run_daily,
        CronTrigger(hour=7, minute=30, timezone=config.TIMEZONE),
        id="daily", name="每日報告",
    )
    scheduler.start()
    logger.info("系統啟動 — 每日 07:30 執行")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    signal.signal(signal.SIGTERM, lambda s, f: (scheduler.shutdown(False), sys.exit(0)))
    signal.signal(signal.SIGINT, lambda s, f: (scheduler.shutdown(False), sys.exit(0)))
    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown(False)


if __name__ == "__main__":
    main()
