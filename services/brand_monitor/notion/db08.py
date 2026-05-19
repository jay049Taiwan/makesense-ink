"""DB08 關係對象 — 關鍵字讀取與管理

2026/04/22 結構重整：
- 經營類型 select 新選項：觀點 / 標籤 / 紀錄（舊「連結對象/主題標籤」已廢）
  - 觀點：官網觀點漫遊的主打資料
  - 標籤：一般 hashtag（AI 建議議題、主題類關鍵字）
  - 紀錄：不顯示於官網（招標單位、採購單位、供應商等）
- 對象選項 → 改名為 關係選項（個人/合作夥伴/工作團隊；僅會員使用）
- 已刪除：觀點狀態、觀點層級、標籤狀態、個人細項
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from config import DB08_ID
from notion import client

logger = logging.getLogger(__name__)


@dataclass
class KeywordEntry:
    page_id: str
    name: str
    website: Optional[str] = None
    fb: Optional[str] = None
    ig: Optional[str] = None


@dataclass
class KeywordSet:
    """三類關鍵字集合"""

    # 主題類：經營類型=標籤（2026/04/22 前為 主題標籤+觀點狀態=主題標籤）
    topics: list[KeywordEntry] = field(default_factory=list)
    # 單位類：經營類型=紀錄（2026/04/22 前為 連結對象+對象選項=合作單位）
    orgs: list[KeywordEntry] = field(default_factory=list)
    # 委託類：對應委託專案 不為空（有 relation）
    commissioned: list[KeywordEntry] = field(default_factory=list)

    @property
    def topic_names(self) -> list[str]:
        return [k.name for k in self.topics]

    @property
    def org_names(self) -> list[str]:
        return [k.name for k in self.orgs]

    def find_topic_by_name(self, name: str) -> Optional[KeywordEntry]:
        for k in self.topics:
            if k.name == name:
                return k
        return None

    def find_org_by_name(self, name: str) -> Optional[KeywordEntry]:
        for k in self.orgs:
            if k.name == name:
                return k
        return None


def _page_to_entry(page: dict) -> Optional[KeywordEntry]:
    """將 Notion page 轉為 KeywordEntry。"""
    name = client.extract_title(page, "對象名稱")
    if not name:
        return None
    return KeywordEntry(
        page_id=page["id"],
        name=name,
        website=client.extract_rich_text(page, "官網ID"),
        fb=client.extract_url(page, "FB粉專"),
        ig=client.extract_url(page, "IG粉專"),
    )


async def load_keywords() -> KeywordSet:
    """從 DB08 分三次查詢載入三類關鍵字（避免大量資料超時）。"""
    logger.info("從 DB08 載入關鍵字...")
    result = KeywordSet()

    # 1. 主題類：經營類型=標籤（2026/04/22 新架構，取代舊「主題標籤」+「觀點狀態」雙 filter）
    logger.info("查詢主題類關鍵字...")
    topic_pages = await client.query_db(
        DB08_ID,
        filter_json={
            "property": "經營類型",
            "select": {"equals": "標籤"},
        },
    )
    for page in topic_pages:
        entry = _page_to_entry(page)
        if entry:
            result.topics.append(entry)
    logger.info("主題類: %d 筆", len(result.topics))

    # 2. 委託單位：對應委託專案不為空（曾出現在 DB01 對應委託對象的單位）
    logger.info("查詢委託單位...")
    org_pages = await client.query_db(
        DB08_ID,
        filter_json={
            "property": "對應委託專案",
            "relation": {"is_not_empty": True},
        },
    )
    for page in org_pages:
        entry = _page_to_entry(page)
        if entry:
            result.orgs.append(entry)
    logger.info("委託單位: %d 筆", len(result.orgs))

    logger.info(
        "關鍵字載入完成: 主題 %d, 委託單位 %d",
        len(result.topics),
        len(result.orgs),
    )
    return result


async def load_bookstore_targets() -> list[KeywordEntry]:
    """查詢 DB08 中營運屬性含「實體書店」的項目。"""
    pages = await client.query_db(
        DB08_ID,
        filter_json={
            "property": "營運屬性",
            "multi_select": {"contains": "實體書店"},
        },
    )

    targets = []
    for page in pages:
        name = client.extract_title(page, "對象名稱")
        if not name:
            continue
        entry = KeywordEntry(
            page_id=page["id"],
            name=name,
            website=client.extract_rich_text(page, "官網ID"),
            fb=client.extract_url(page, "FB粉專"),
            ig=client.extract_url(page, "IG粉專"),
        )
        if entry.website or entry.fb or entry.ig:
            targets.append(entry)

    logger.info("書店監測目標: %d 筆", len(targets))
    return targets


async def find_by_name(name: str) -> Optional[str]:
    """在 DB08 搜尋精確名稱，回傳 page_id 或 None。"""
    pages = await client.query_db(
        DB08_ID,
        filter_json={
            "property": "對象名稱",
            "title": {"equals": name},
        },
        page_size=1,
    )
    if pages:
        return pages[0]["id"]
    return None


async def create_org(
    name: str,
    website: str = None,
    fb: str = None,
    ig: str = None,
    address: str = None,
    phone: str = None,
    email: str = None,
    tag_page_ids: list[str] = None,
) -> str:
    """在 DB08 新增一個合作單位（招標單位/採購單位/得標廠商等）。回傳 page_id。

    2026/04/22 校正：經營類型用「紀錄」（不顯示於官網的後台資料）；
    不設「關係選項」（僅會員類使用：個人/合作夥伴/工作團隊）。
    tag_page_ids：自對標籤 relation（如「政府標案」標籤頁）。
    """
    properties = {
        "對象名稱": {"title": [{"text": {"content": name}}]},
        "經營類型": {"select": {"name": "紀錄"}},
    }
    if tag_page_ids:
        properties["自對標籤"] = {"relation": [{"id": pid} for pid in tag_page_ids]}
    if website:
        properties["官網ID"] = {"rich_text": [{"text": {"content": website}}]}
    if fb:
        properties["FB粉專"] = {"url": fb}
    if ig:
        properties["IG粉專"] = {"url": ig}
    if address:
        properties["地址"] = {"rich_text": [{"text": {"content": address}}]}
    if phone:
        properties["電話"] = {"rich_text": [{"text": {"content": phone}}]}
    if email:
        properties["Email"] = {"rich_text": [{"text": {"content": email}}]}

    page = await client.create_page(DB08_ID, properties)
    logger.info("DB08 新增單位: %s (%s)", name, page["id"])
    return page["id"]


async def create_topic(name: str) -> str:
    """在 DB08 新增一個主題標籤（AI 建議議題、一般 hashtag）。回傳 page_id。

    2026/04/22 校正：經營類型用「標籤」（舊「主題標籤」已廢）。
    """
    properties = {
        "對象名稱": {"title": [{"text": {"content": name}}]},
        "經營類型": {"select": {"name": "標籤"}},
    }

    page = await client.create_page(DB08_ID, properties)
    logger.info("DB08 新增主題: %s (%s)", name, page["id"])
    return page["id"]


async def update_contact(
    page_id: str,
    website: str = None,
    fb: str = None,
    ig: str = None,
    address: str = None,
    phone: str = None,
    email: str = None,
):
    """更新 DB08 項目的聯絡資訊（只更新非 None 的值）。"""
    properties = {}
    if website is not None:
        properties["官網ID"] = {"rich_text": [{"text": {"content": website}}]}
    if fb is not None:
        properties["FB粉專"] = {"url": fb}
    if ig is not None:
        properties["IG粉專"] = {"url": ig}
    if address is not None:
        properties["地址"] = {"rich_text": [{"text": {"content": address}}]}
    if phone is not None:
        properties["電話"] = {"rich_text": [{"text": {"content": phone}}]}
    if email is not None:
        properties["Email"] = {"rich_text": [{"text": {"content": email}}]}

    if properties:
        await client.update_page(page_id, properties)
        logger.info("DB08 更新聯絡資訊: %s (%d 欄)", page_id, len(properties))


async def link_tags(page_id: str, tag_page_ids: list[str]):
    """把 tag_page_ids 併入既有 DB08 頁面的「自對標籤」relation（不覆蓋）。"""
    if not tag_page_ids:
        return
    page = await client.get_page(page_id)
    existing = client.extract_relation_ids(page, "自對標籤")
    merged = list({*existing, *tag_page_ids})
    if set(merged) == set(existing):
        return
    await client.update_page(page_id, {
        "自對標籤": {"relation": [{"id": pid} for pid in merged]},
    })
    logger.info("DB08 補標籤: %s (+%d)", page_id, len(merged) - len(existing))


async def ensure_org(
    name: str,
    website: str = None,
    fb: str = None,
    ig: str = None,
    address: str = None,
    phone: str = None,
    email: str = None,
    tag_page_ids: list[str] = None,
) -> str:
    """確保 DB08 有此單位，沒有就新增。回傳 page_id。

    已存在：補齊空白的聯絡欄位、併入標籤（不重建）。
    """
    page_id = await find_by_name(name)
    if page_id:
        # 補齊空白的欄位
        has_update = any([website, fb, ig, address, phone, email])
        if has_update:
            page = await client.get_page(page_id)
            existing_web = client.extract_rich_text(page, "官網ID")
            existing_fb = client.extract_url(page, "FB粉專")
            existing_ig = client.extract_url(page, "IG粉專")
            existing_addr = client.extract_rich_text(page, "地址")
            existing_phone = client.extract_rich_text(page, "電話")
            existing_email = client.extract_rich_text(page, "Email")
            await update_contact(
                page_id,
                website=website if not existing_web else None,
                fb=fb if not existing_fb else None,
                ig=ig if not existing_ig else None,
                address=address if not existing_addr else None,
                phone=phone if not existing_phone else None,
                email=email if not existing_email else None,
            )
        await link_tags(page_id, tag_page_ids or [])
        return page_id
    return await create_org(
        name, website, fb, ig, address, phone, email, tag_page_ids=tag_page_ids
    )


async def ensure_topic(name: str) -> str:
    """確保 DB08 有此主題標籤，沒有就新增。回傳 page_id。"""
    page_id = await find_by_name(name)
    if page_id:
        return page_id
    return await create_topic(name)


_gov_tender_tag_id: Optional[str] = None


async def ensure_gov_tender_tag() -> str:
    """確保「政府標案」標籤頁存在，回傳 page_id（process 內快取一次）。"""
    global _gov_tender_tag_id
    if _gov_tender_tag_id is None:
        _gov_tender_tag_id = await ensure_topic("政府標案")
    return _gov_tender_tag_id
