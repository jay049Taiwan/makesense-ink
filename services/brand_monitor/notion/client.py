"""Notion API 非同步封裝"""

import logging
from typing import Any, Optional

import httpx

from config import NOTION_INTEGRATION_TOKEN, NOTION_API_VERSION, NOTION_RATE_LIMIT
from utils.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

_rate_limiter = RateLimiter(rate=NOTION_RATE_LIMIT, burst=3)

BASE_URL = "https://api.notion.com/v1"

# 共用 client（避免每次建立新連線）
_http_client: Optional[httpx.AsyncClient] = None


async def _get_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=60)
    return _http_client


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {NOTION_INTEGRATION_TOKEN}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
    }


async def _request_with_retry(method: str, url: str, **kwargs) -> httpx.Response:
    """帶重試的 HTTP 請求。"""
    import asyncio

    client = await _get_client()
    last_exc = None

    for attempt in range(3):
        try:
            await _rate_limiter.acquire()
            if method == "POST":
                resp = await client.post(url, **kwargs)
            elif method == "PATCH":
                resp = await client.patch(url, **kwargs)
            else:
                resp = await client.get(url, **kwargs)

            if resp.status_code == 429:
                retry_after = float(resp.headers.get("Retry-After", "5"))
                logger.warning("Notion 429 限速，等待 %.1f 秒", retry_after)
                await asyncio.sleep(retry_after)
                continue

            resp.raise_for_status()
            return resp

        except Exception as e:
            last_exc = e
            if attempt < 2:
                wait = 2 ** (attempt + 1)
                logger.warning("Notion API 失敗 (第 %d 次)，%d 秒後重試: %s", attempt + 1, wait, e)
                await asyncio.sleep(wait)
            continue

    raise last_exc  # type: ignore


async def query_db(
    db_id: str,
    filter_json: Optional[dict] = None,
    sorts: Optional[list] = None,
    page_size: int = 100,
) -> list[dict]:
    """查詢 Notion 資料庫，自動處理分頁。"""
    results = []
    start_cursor = None

    while True:
        body: dict[str, Any] = {"page_size": min(page_size, 100)}
        if filter_json:
            body["filter"] = filter_json
        if sorts:
            body["sorts"] = sorts
        if start_cursor:
            body["start_cursor"] = start_cursor

        resp = await _request_with_retry(
            "POST",
            f"{BASE_URL}/databases/{db_id}/query",
            headers=_headers(),
            json=body,
        )
        data = resp.json()
        results.extend(data.get("results", []))

        if not data.get("has_more"):
            break
        start_cursor = data.get("next_cursor")

        logger.info("DB 分頁查詢中... 已取得 %d 筆", len(results))

    return results


async def create_page(db_id: str, properties: dict) -> dict:
    """在指定資料庫建立新頁面。"""
    resp = await _request_with_retry(
        "POST",
        f"{BASE_URL}/pages",
        headers=_headers(),
        json={
            "parent": {"database_id": db_id},
            "properties": properties,
        },
    )
    return resp.json()


async def update_page(page_id: str, properties: dict) -> dict:
    """更新頁面屬性。"""
    resp = await _request_with_retry(
        "PATCH",
        f"{BASE_URL}/pages/{page_id}",
        headers=_headers(),
        json={"properties": properties},
    )
    return resp.json()


async def get_page(page_id: str) -> dict:
    """取得單一頁面。"""
    resp = await _request_with_retry(
        "GET",
        f"{BASE_URL}/pages/{page_id}",
        headers=_headers(),
    )
    return resp.json()


async def create_page_with_content(
    db_id: str, properties: dict, content_blocks: list[dict]
) -> dict:
    """在指定資料庫建立新頁面，含 children blocks。"""
    body: dict[str, Any] = {
        "parent": {"database_id": db_id},
        "properties": properties,
    }
    if content_blocks:
        body["children"] = content_blocks
    resp = await _request_with_retry(
        "POST",
        f"{BASE_URL}/pages",
        headers=_headers(),
        json=body,
    )
    return resp.json()


async def append_blocks(page_id: str, blocks: list[dict]) -> dict:
    """在頁面底部追加 blocks。"""
    resp = await _request_with_retry(
        "POST",
        f"{BASE_URL}/blocks/{page_id}/children",
        headers=_headers(),
        json={"children": blocks},
    )
    return resp.json()


async def close():
    """關閉 HTTP client。"""
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None


def extract_title(page: dict, prop_name: str = "title") -> str:
    """從頁面 properties 取出 title 欄位的純文字。"""
    prop = page.get("properties", {}).get(prop_name, {})
    title_arr = prop.get("title", [])
    return "".join(t.get("plain_text", "") for t in title_arr)


def extract_rich_text(page: dict, prop_name: str) -> str:
    """從頁面 properties 取出 rich_text 欄位的純文字。"""
    prop = page.get("properties", {}).get(prop_name, {})
    texts = prop.get("rich_text", [])
    return "".join(t.get("plain_text", "") for t in texts)


def extract_select(page: dict, prop_name: str) -> Optional[str]:
    """從頁面 properties 取出 select 欄位的值。"""
    prop = page.get("properties", {}).get(prop_name, {})
    sel = prop.get("select")
    if sel:
        return sel.get("name")
    return None


def extract_multi_select(page: dict, prop_name: str) -> list[str]:
    """從頁面 properties 取出 multi_select 欄位的所有值。"""
    prop = page.get("properties", {}).get(prop_name, {})
    items = prop.get("multi_select", [])
    return [item.get("name", "") for item in items]


def extract_url(page: dict, prop_name: str) -> Optional[str]:
    """從頁面 properties 取出 url 欄位的值。"""
    prop = page.get("properties", {}).get(prop_name, {})
    return prop.get("url")


def extract_relation_ids(page: dict, prop_name: str) -> list[str]:
    """從頁面 properties 取出 relation 欄位的所有 page_id。"""
    prop = page.get("properties", {}).get(prop_name, {})
    relations = prop.get("relation", [])
    return [r.get("id", "") for r in relations if r.get("id")]


def extract_date(page: dict, prop_name: str) -> Optional[str]:
    """從頁面 properties 取出 date 欄位的 start 值。"""
    prop = page.get("properties", {}).get(prop_name, {})
    date_obj = prop.get("date")
    if date_obj:
        return date_obj.get("start")
    return None
