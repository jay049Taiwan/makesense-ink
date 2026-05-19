"""品牌提案情報監測系統 — 主程式入口

兩份報告：
1. 品牌提案參考報告（標案 + 補助）— 掃描結果直接落地 Notion
2. 關係社群分析報告（輿情監測）

Notion 路由規則（四九 2026/05/19 拍板）：
- 與 makesense 有關、可能投的招標／獎補助 → DB01 資源提案，執行狀態=預計提案
- 與 makesense 無關的決標案 → DB06 清單明細，明細類型=資料參考
- 得標廠商、招標機關 → DB08 關係對象，經營類型=紀錄，加標籤「政府標案」
- 寫入前一律查重，已存在只補關聯、不重建
"""

import asyncio
import logging
import signal
import sys
import os
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

import config
from notion import db08, db01, db05, db06, client as notion_client
from notion.db01 import ProposalData
from notion.db06 import ReferenceData
from monitors import procurement, subsidy, sentiment
from ai import assessor
from keyword_engine import expander
from telegram_notify import sender  # 2026/05/09 從 discord_notify 改 telegram_notify
from reports import weekly

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("brand_monitor")


def _fmt_price(price: int) -> str:
    if not price:
        return "未公告"
    return f"${price:,}元"


def _fmt_deadline(d: str) -> str:
    if not d:
        return "未公告"
    return d.replace("-", "/")


async def _resolve_org_ids(names: list[str], gov_tag_id: str) -> list[str]:
    """把機關／廠商名稱解析成 DB08 page_id（查重 + 補「政府標案」標籤）。"""
    ids = []
    seen = set()
    for name in names:
        nm = (name or "").strip()
        if not nm or len(nm) < 2 or nm in seen:
            continue
        seen.add(nm)
        try:
            pid = await db08.ensure_org(nm, tag_page_ids=[gov_tag_id])
            ids.append(pid)
        except Exception as e:
            logger.warning("DB08 寫入單位失敗 (%s): %s", nm, e)
    return ids


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

        gov_tag_id = await db08.ensure_gov_tender_tag()

        keywords = await db08.load_keywords()
        tender_results = await procurement.scan(keywords)
        subsidy_results = await subsidy.scan(keywords)

        # 分流：未決標的招標 / 新決標案 / 追蹤中的提案決標
        open_tenders = [r for r in tender_results if not r.is_award]
        award_results = [r for r in tender_results if r.is_award]
        tracked_awards = [
            r for r in award_results if r.matched_keyword_type == "tracked"
        ]
        new_awards = [
            r for r in award_results if r.matched_keyword_type != "tracked"
        ]

        # AI 評估：未決標的招標（含建議主題標籤）
        for t in open_tenders:
            a = await assessor.assess(t.title, t.unit_name)
            t.relevance_score = a.relevance_score
            t.ai_assessment = a.assessment
            t.ai_positioning = a.positioning
            t.category = a.suggested_category or t.category
            t.suggested_topic = a.suggested_topic
            t.plan_name = a.plan_name

        # AI 評估：新決標案
        for t in new_awards:
            a = await assessor.assess(t.title, t.unit_name)
            t.relevance_score = a.relevance_score
            t.ai_assessment = a.assessment
            t.ai_positioning = a.positioning

        # AI 評估：獎補助
        for s in subsidy_results:
            a = await assessor.assess(s.title, s.source_name)
            s.relevance_score = a.relevance_score
            s.ai_assessment = a.assessment
            s.ai_positioning = a.positioning

        # 過濾：相關度 ≥ 30
        relevant_tenders = [r for r in open_tenders if r.relevance_score >= 30]
        relevant_awards = [r for r in new_awards if r.relevance_score >= 30]
        relevant_subsidies = [
            r for r in subsidy_results if r.relevance_score >= 30
        ]

        # 關鍵字擴充
        expansion_actions = await expander.expand_from_procurement(
            relevant_tenders, keywords
        )

        # === 開場訊息 ===
        await sender.send_single(
            f"📋 品牌提案參考報告 — {date_str}（{wd}）\n"
            f"招標 {len(relevant_tenders)} 筆 → DB01 ｜ "
            f"決標 {len(relevant_awards)} 筆 → DB06 ｜ "
            f"獎補助 {len(relevant_subsidies)} 筆 → DB01"
        )

        written_db01 = 0
        written_db06 = 0

        # === 招標 → DB01 資源提案（執行狀態=預計提案）===
        for i, t in enumerate(relevant_tenders, 1):
            org_ids = await _resolve_org_ids([t.unit_name], gov_tag_id)
            db01_ok = False
            try:
                await db01.create_proposal(ProposalData(
                    title=t.title,
                    tender_id=t.tender_id,
                    source_url=t.source_url,
                    category=t.category,
                    deadline=t.deadline,
                    ai_assessment=t.ai_assessment,
                    ai_positioning=t.ai_positioning,
                    org_page_ids=org_ids,
                    is_yilan=t.is_yilan,
                    relevance_score=t.relevance_score,
                    price=t.price,
                ))
                written_db01 += 1
                db01_ok = True
            except Exception as e:
                logger.warning("DB01 寫入失敗 (%s): %s", t.title, e)

            yilan_tag = "⭐宜蘭 " if t.is_yilan else ""
            tags = "、".join(filter(None, [
                getattr(t, "suggested_topic", "") or "",
                getattr(t, "plan_name", "") or "",
            ]))
            msg = (
                f"{'─' * 30}\n"
                f"{yilan_tag}📌 招標 {i}/{len(relevant_tenders)}"
                f"{'　✅ 已寫入 DB01' if db01_ok else '　⚠️ DB01 寫入失敗'}\n"
                f"**{t.title}**\n\n"
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
            await sender.send_single(msg)

        # === 決標 → DB06 清單明細（明細類型=資料參考）===
        for i, t in enumerate(relevant_awards, 1):
            org_ids = await _resolve_org_ids(
                [t.unit_name, *t.award_winners], gov_tag_id
            )
            db06_ok = False
            try:
                await db06.create_reference(ReferenceData(
                    title=t.title,
                    source_url=t.source_url,
                    tender_id=t.tender_id,
                    unit_name=t.unit_name,
                    award_amount=t.price,
                    winners=t.award_winners,
                    summary=t.ai_assessment,
                    org_page_ids=org_ids,
                ))
                written_db06 += 1
                db06_ok = True
            except Exception as e:
                logger.warning("DB06 寫入失敗 (%s): %s", t.title, e)

            winners = "、".join(t.award_winners) if t.award_winners else "未公告"
            msg = (
                f"{'─' * 30}\n"
                f"🏆 決標 {i}/{len(relevant_awards)}"
                f"{'　✅ 已寫入 DB06' if db06_ok else '　⚠️ DB06 寫入失敗'}\n"
                f"**{t.title}**\n\n"
                f"機關：{t.unit_name or '未公告'}\n"
                f"得標廠商：{winners}\n"
                f"決標金額：{_fmt_price(t.price)}\n"
            )
            if t.source_url:
                msg += f"\n🔗 {t.source_url}"
            await sender.send_single(msg)

        # === 獎補助 → DB01 資源提案（參與屬性=獎補助）===
        for i, s in enumerate(relevant_subsidies, 1):
            org_ids = await _resolve_org_ids([s.source_name], gov_tag_id)
            db01_ok = False
            try:
                await db01.create_proposal(ProposalData(
                    title=s.title,
                    source_url=s.source_url,
                    category="獎補助",
                    deadline=s.deadline,
                    ai_assessment=s.ai_assessment,
                    ai_positioning=s.ai_positioning,
                    org_page_ids=org_ids,
                    is_yilan=getattr(s, "is_yilan", False),
                    relevance_score=s.relevance_score,
                ))
                written_db01 += 1
                db01_ok = True
            except Exception as e:
                logger.warning("DB01 寫入失敗 (%s): %s", s.title, e)

            yilan_tag = "⭐宜蘭 " if getattr(s, "is_yilan", False) else ""
            msg = (
                f"{'─' * 30}\n"
                f"{yilan_tag}🏷️ 獎補助 {i}/{len(relevant_subsidies)}"
                f"{'　✅ 已寫入 DB01' if db01_ok else '　⚠️ DB01 寫入失敗'}\n"
                f"**{s.title}**\n\n"
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
            await sender.send_single(msg)

        # === 追蹤中的提案決標 → 更新 DB01「對應委託對象」===
        award_updated = 0
        for t in tracked_awards:
            if not t.tender_id:
                continue
            try:
                existing = await db01.check_duplicate_by_tender_id(t.tender_id)
                if not existing:
                    continue
                winner_ids = await _resolve_org_ids(t.award_winners, gov_tag_id)
                if winner_ids:
                    await db01.update_award_winner(existing, winner_ids)
                    award_updated += 1
            except Exception as e:
                logger.warning("DB01 決標更新失敗 (%s): %s", t.title, e)
        if award_updated:
            await sender.send_single(
                f"📊 追蹤中提案決標更新 {award_updated} 筆 → DB01"
            )

        # 關鍵字擴充通知
        if expansion_actions:
            kw_msg = f"🆕 自動新增 {len(expansion_actions)} 個關鍵字\n"
            for a in expansion_actions:
                kw_msg += f"• {a.name}\n"
            await sender.send_single(kw_msg)

        # 結尾摘要
        total = written_db01 + written_db06
        if total == 0:
            await sender.send_single("✅ 今日無符合條件的新標案或獎補助")
        else:
            await sender.send_single(
                f"✅ 今日落地：DB01 {written_db01} 筆、DB06 {written_db06} 筆（皆已查重）"
            )

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
    await notion_client.close()
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
