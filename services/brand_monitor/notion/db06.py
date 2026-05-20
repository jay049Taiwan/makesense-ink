"""DB06 清單明細 — 政府標案決標案的「資料參考」落地

路由規則（四九 2026/05/19 拍板）：
與 makesense 無關的決標案 → DB06，明細類型=資料參考。絕不進 DB01。
寫入前查重（對應連結 / 明細名稱），已存在只補關聯、不重建。

附件 PDF（2026/05/20 加）：
標案 / 決標 / 補助公告頁的每個 PDF 附件 → 一筆 DB06 page，
明細類型=資料參考、參考類別=申請須知、上傳檔案=R2 URL（external file），
對應提案/對應明細 = 母筆 page id（依母筆來源）。
原始下載 URL 作為 對應連結 用來去重。
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from config import DB06_ID
from notion import client

logger = logging.getLogger(__name__)


@dataclass
class ReferenceData:
    """決標案資料參考"""

    title: str
    source_url: str = ""          # 對應連結（去重用）
    tender_id: str = ""           # 標案案號（寫入明細內容供比對）
    unit_name: str = ""           # 招標機關
    award_amount: int = 0         # 決標金額
    winners: list[str] = field(default_factory=list)   # 得標廠商名稱
    summary: str = ""             # AI 評估摘要
    org_page_ids: list[str] = field(default_factory=list)  # DB08 page_ids（得標廠商+機關）


async def check_duplicate(source_url: str, title: str) -> Optional[str]:
    """先比對應連結，再比明細名稱。回傳既有 page_id 或 None。"""
    if source_url:
        pages = await client.query_db(
            DB06_ID,
            filter_json={"property": "對應連結", "url": {"equals": source_url}},
            page_size=1,
        )
        if pages:
            return pages[0]["id"]
    if title:
        pages = await client.query_db(
            DB06_ID,
            filter_json={"property": "明細名稱", "title": {"equals": title}},
            page_size=1,
        )
        if pages:
            return pages[0]["id"]
    return None


def _build_content(data: ReferenceData) -> str:
    lines = []
    if data.tender_id:
        lines.append(f"標案案號：{data.tender_id}")
    if data.unit_name:
        lines.append(f"招標機關：{data.unit_name}")
    if data.award_amount:
        lines.append(f"決標金額：{data.award_amount:,} 元")
    if data.winners:
        lines.append("得標廠商：" + "、".join(data.winners))
    if data.summary:
        lines.append("")
        lines.append(data.summary)
    return "\n".join(lines)


async def create_reference(data: ReferenceData) -> str:
    """在 DB06 建立決標案資料參考頁。回傳 page_id。

    已存在則只補「對應對象」關聯、不重建。
    """
    existing = await check_duplicate(data.source_url, data.title)
    if existing:
        if data.org_page_ids:
            page = await client.get_page(existing)
            current = client.extract_relation_ids(page, "對應對象")
            merged = list({*current, *data.org_page_ids})
            if set(merged) != set(current):
                await client.update_page(existing, {
                    "對應對象": {"relation": [{"id": p} for p in merged]},
                })
        logger.info("DB06 已存在: %s", data.title)
        return existing

    properties = {
        "明細名稱": {"title": [{"text": {"content": data.title}}]},
        "明細類型": {"select": {"name": "資料參考"}},
        "參考類別": {"select": {"name": "通過公告"}},
    }
    if data.source_url:
        properties["對應連結"] = {"url": data.source_url}

    content = _build_content(data)
    if content:
        properties["明細內容"] = {
            "rich_text": [{"text": {"content": content[:2000]}}]
        }
    if data.org_page_ids:
        properties["對應對象"] = {
            "relation": [{"id": pid} for pid in data.org_page_ids]
        }

    page = await client.create_page(DB06_ID, properties)
    logger.info("DB06 新增資料參考: %s (%s)", data.title, page["id"])
    return page["id"]


@dataclass
class AttachmentData:
    """標案 / 補助公告附件落地資料"""

    title: str                            # 明細名稱（PDF 檔名或「附件類型」）
    download_url: str                     # 原始下載 URL，作為 對應連結 用於去重
    cloud_url: str = ""                   # R2 公開 URL，寫入 上傳檔案 欄位
    filename: str = ""                    # R2 上傳檔名（顯示用）
    parent_proposal_id: str = ""          # 對應提案（DB01 page id）
    parent_reference_id: str = ""         # 對應明細（DB06 page id；決標附件用）
    parent_title: str = ""                # 母筆標題（寫入摘要）
    doc_type: str = ""                    # 附件用途（投標須知 / 招標文件 / 申請須知）
    org_page_ids: list[str] = field(default_factory=list)  # 對應對象（DB08）


async def create_attachment_page(data: AttachmentData) -> Optional[str]:
    """為單一附件 PDF 在 DB06 建一筆 page。

    去重：用 對應連結 == download_url 比對；已存在則只補關聯不重建。
    上傳檔案：寫入 external file（R2 URL）；若 cloud_url 為空則略過此欄位。
    """
    if not data.download_url:
        logger.warning("跳過附件（無 download_url）: %s", data.title)
        return None

    # 去重
    existing = await check_duplicate(data.download_url, "")
    if existing:
        logger.info("DB06 附件已存在: %s", data.title)
        return existing

    properties = {
        "明細名稱": {"title": [{"text": {"content": data.title[:100]}}]},
        "明細類型": {"select": {"name": "資料參考"}},
        "參考類別": {"select": {"name": "申請須知"}},
        "對應連結": {"url": data.download_url},
    }

    # 上傳檔案（external file）
    if data.cloud_url:
        display_name = (data.filename or data.title)[:100]
        properties["上傳檔案"] = {
            "files": [{
                "type": "external",
                "name": display_name,
                "external": {"url": data.cloud_url},
            }]
        }

    # 對應母筆（提案 vs 已決標明細擇一）
    if data.parent_proposal_id:
        properties["對應提案"] = {"relation": [{"id": data.parent_proposal_id}]}
    if data.parent_reference_id:
        properties["對應明細"] = {"relation": [{"id": data.parent_reference_id}]}

    # 對應對象（招標機關 / 得標廠商）
    if data.org_page_ids:
        properties["對應對象"] = {
            "relation": [{"id": pid} for pid in data.org_page_ids]
        }

    # 摘要
    summary_lines = []
    if data.parent_title:
        summary_lines.append(f"來源公告：{data.parent_title}")
    if data.doc_type:
        summary_lines.append(f"附件用途：{data.doc_type}")
    summary_lines.append(f"原始下載：{data.download_url}")
    if data.cloud_url:
        summary_lines.append(f"R2 連結：{data.cloud_url}")
    properties["明細內容"] = {
        "rich_text": [{"text": {"content": "\n".join(summary_lines)[:2000]}}]
    }

    page = await client.create_page(DB06_ID, properties)
    logger.info("DB06 新增附件: %s (%s)", data.title, page["id"])
    return page["id"]
