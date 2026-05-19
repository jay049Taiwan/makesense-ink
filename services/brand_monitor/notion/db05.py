"""DB05 登記內容 — 標案附件寫入"""

import logging
from typing import Optional

from config import DB05_ID
from notion import client

logger = logging.getLogger(__name__)


async def create_tender_reference(
    title: str,
    content_text: str = "",
    file_urls: list[dict] = None,
    proposal_page_id: str = "",
) -> str:
    """在 DB05 建立標案參考資料。

    Args:
        title: 內容名稱（標案名稱 + 附件類型）
        content_text: 寫入 page content 的文字內容
        file_urls: [{"name": "xxx.pdf", "url": "https://..."}]
        proposal_page_id: 對應的 DB01 提案 page_id

    Returns:
        新建頁面的 page_id
    """
    if file_urls is None:
        file_urls = []

    # 去重：同名稱的已存在就跳過
    existing = await client.query_db(
        DB05_ID,
        filter_json={
            "property": "內容名稱",
            "title": {"equals": title},
        },
        page_size=1,
    )
    if existing:
        logger.info("DB05 已存在: %s", title)
        return existing[0]["id"]

    # 組裝 properties（2026/05/08 更新：DB05 schema 大改，內容類型 options 為 報名登記/共識互動/內容素材；
    # 參考備項已改編號式：01提案參考~09日程參考；DB05「提案參考」select 仍存在）
    properties = {
        "內容名稱": {"title": [{"text": {"content": title}}]},
        "內容類型": {"select": {"name": "內容素材"}},
        "參考備項": {"multi_select": [{"name": "01提案參考"}]},
        "提案參考": {"select": {"name": "申請須知"}},
    }

    # 上傳檔案（external file URL）
    if file_urls:
        properties["上傳檔案"] = {
            "files": [
                {"name": f["name"], "external": {"url": f["url"]}}
                for f in file_urls
            ]
        }

    # 關聯到 DB01 提案
    if proposal_page_id:
        properties["對應提案"] = {
            "relation": [{"id": proposal_page_id}]
        }

    # page content blocks
    content_blocks = []
    if content_text:
        # 分段（Notion 每個 rich_text block 最多 2000 字元）
        chunks = [content_text[i:i+2000] for i in range(0, len(content_text), 2000)]
        for chunk in chunks:
            content_blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": chunk}}]
                },
            })

    # 建立頁面
    page = await client.create_page_with_content(
        DB05_ID, properties, content_blocks
    )

    page_id = page.get("id", "")
    logger.info("DB05 新增參考資料: %s (%s)", title, page_id)
    return page_id
