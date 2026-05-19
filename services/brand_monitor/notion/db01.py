"""DB01 品牌經營提案 — 建立提案、去重、更新決標"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from config import DB01_ID
from notion import client

logger = logging.getLogger(__name__)


@dataclass
class ProposalData:
    """標案/補助提案資料"""

    title: str
    tender_id: str = ""  # 標案案號（去重用）
    source_url: str = ""  # 對應連結（DB01 唯一 url 欄位）
    category: str = ""  # 參與屬性: 公開招標/小額採購/獎補助
    deadline: str = ""  # 截止時間 ISO 日期
    execution_start: str = ""  # 執行時間 ISO 日期
    ai_assessment: str = ""  # 條件評估
    ai_positioning: str = ""  # 需求定位
    org_page_ids: list[str] = field(default_factory=list)  # 對應委託對象 (DB08 page_ids)
    tag_page_ids: list[str] = field(default_factory=list)  # 對應提案標籤 (DB08 page_ids)
    is_yilan: bool = False
    relevance_score: float = 0.0
    price: int = 0  # 招標金額 → DB01 目標營收


async def check_duplicate_by_tender_id(tender_id: str) -> Optional[str]:
    """用標案案號查重，回傳 page_id 或 None。"""
    if not tender_id:
        return None

    pages = await client.query_db(
        DB01_ID,
        filter_json={
            "property": "標案案號",
            "rich_text": {"equals": tender_id},
        },
        page_size=1,
    )
    if pages:
        return pages[0]["id"]
    return None


async def check_duplicate_by_url(url: str) -> Optional[str]:
    """用對應連結查重（補助類用），回傳 page_id 或 None。"""
    if not url:
        return None

    pages = await client.query_db(
        DB01_ID,
        filter_json={
            "property": "對應連結",
            "url": {"equals": url},
        },
        page_size=1,
    )
    if pages:
        return pages[0]["id"]
    return None


async def create_proposal(data: ProposalData) -> str:
    """在 DB01 建立提案頁面，回傳 page_id。"""
    # 去重
    existing = await check_duplicate_by_tender_id(data.tender_id)
    if not existing and data.source_url:
        existing = await check_duplicate_by_url(data.source_url)
    if existing:
        logger.info("DB01 已存在: %s (tender_id=%s)", data.title, data.tender_id)
        return existing

    properties = {
        "專案名稱": {"title": [{"text": {"content": data.title}}]},
        "執行狀態": {"status": {"name": "預計提案"}},
    }

    if data.tender_id:
        properties["標案案號"] = {
            "rich_text": [{"text": {"content": data.tender_id}}]
        }

    if data.source_url:
        properties["對應連結"] = {"url": data.source_url}

    if data.category:
        properties["參與屬性"] = {"select": {"name": data.category}}

    if data.deadline:
        properties["截止時間"] = {
            "date": {"start": data.deadline}
        }

    if data.execution_start:
        properties["執行時間"] = {
            "date": {"start": data.execution_start}
        }

    if data.ai_assessment:
        properties["條件評估"] = {
            "rich_text": [{"text": {"content": data.ai_assessment[:2000]}}]
        }

    if data.price:
        properties["目標營收"] = {"number": data.price}

    if data.ai_positioning:
        properties["需求定位"] = {
            "rich_text": [{"text": {"content": data.ai_positioning[:2000]}}]
        }

    if data.org_page_ids:
        properties["對應委託對象"] = {
            "relation": [{"id": pid} for pid in data.org_page_ids]
        }

    if data.tag_page_ids:
        properties["對應提案標籤"] = {
            "relation": [{"id": pid} for pid in data.tag_page_ids]
        }

    page = await client.create_page(DB01_ID, properties)
    prefix = "⭐" if data.is_yilan else ""
    logger.info("DB01 新增提案: %s%s (%s)", prefix, data.title, page["id"])
    return page["id"]


async def update_award_winner(page_id: str, winner_page_ids: list[str]):
    """決標得標 — 更新 DB01 的「對應委託對象」。"""
    if not winner_page_ids:
        return

    # 先讀取現有 relation，合併
    page = await client.get_page(page_id)
    existing = client.extract_relation_ids(page, "對應委託對象")
    merged = list({*existing, *winner_page_ids})

    await client.update_page(page_id, {
        "對應委託對象": {"relation": [{"id": pid} for pid in merged]},
    })
    logger.info("DB01 更新得標: %s, 單位 %d 個", page_id, len(winner_page_ids))


async def update_award_loser(page_id: str, loser_page_ids: list[str]):
    """決標未得標 — 更新 DB01 的「對應提案未通過」。"""
    if not loser_page_ids:
        return

    page = await client.get_page(page_id)
    existing = client.extract_relation_ids(page, "對應提案未通過")
    merged = list({*existing, *loser_page_ids})

    await client.update_page(page_id, {
        "對應提案未通過": {"relation": [{"id": pid} for pid in merged]},
    })
    logger.info("DB01 更新未通過: %s, 單位 %d 個", page_id, len(loser_page_ids))


async def get_tracked_tenders() -> list[dict]:
    """取得 DB01 中執行狀態=預計提案 的標案（用於追蹤決標）。"""
    pages = await client.query_db(
        DB01_ID,
        filter_json={
            "property": "執行狀態",
            "status": {"equals": "預計提案"},
        },
    )

    results = []
    for page in pages:
        tender_id = client.extract_rich_text(page, "標案案號")
        if tender_id:
            results.append({
                "page_id": page["id"],
                "tender_id": tender_id,
                "title": client.extract_title(page, "專案名稱"),
            })

    return results
