"""子系統三：輿情監測（實體書店）"""

import hashlib
import json
import logging
import os
from dataclasses import dataclass
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from config import STATE_DIR
from notion.db08 import KeywordEntry

logger = logging.getLogger(__name__)

HASHES_FILE = os.path.join(STATE_DIR, "sentiment_hashes.json")


@dataclass
class SentimentChange:
    """網站變動結果"""

    name: str
    page_id: str
    url: str
    url_type: str  # website / fb / ig
    change_type: str  # new / changed
    snippet: str = ""


def _load_hashes() -> dict:
    if os.path.exists(HASHES_FILE):
        with open(HASHES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_hashes(hashes: dict):
    os.makedirs(os.path.dirname(HASHES_FILE), exist_ok=True)
    with open(HASHES_FILE, "w", encoding="utf-8") as f:
        json.dump(hashes, f, ensure_ascii=False, indent=2)


def _content_hash(html: str) -> str:
    """計算網頁主要內容的雜湊值（忽略動態元素）。"""
    soup = BeautifulSoup(html, "html.parser")
    # 移除 script, style, nav, footer 等非內容元素
    for tag in soup.find_all(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)
    # 取前 5000 字避免過大
    text = text[:5000]
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _extract_snippet(html: str, max_length: int = 300) -> str:
    """從 HTML 中提取可讀摘要。"""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all(["script", "style", "nav", "footer"]):
        tag.decompose()

    # 找最新的內容區塊
    for selector in ["article", "main", ".content", ".post", "#content"]:
        section = soup.select_one(selector)
        if section:
            text = section.get_text(separator=" ", strip=True)
            return text[:max_length]

    text = soup.get_text(separator=" ", strip=True)
    return text[:max_length]


async def scan(targets: list[KeywordEntry]) -> list[SentimentChange]:
    """掃描所有監測目標的網站變動。"""
    logger.info("=== 子系統三：輿情監測開始 (%d 個目標) ===", len(targets))

    hashes = _load_hashes()
    changes = []

    for target in targets:
        urls_to_check = []
        if target.website:
            urls_to_check.append(("website", target.website))
        if target.fb:
            urls_to_check.append(("fb", target.fb))
        if target.ig:
            urls_to_check.append(("ig", target.ig))

        for url_type, url in urls_to_check:
            hash_key = f"{target.page_id}_{url_type}"

            try:
                async with httpx.AsyncClient(
                    timeout=15,
                    follow_redirects=True,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36"
                    },
                ) as client:
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        continue

                    html = resp.text
                    new_hash = _content_hash(html)
                    old_hash = hashes.get(hash_key)

                    if old_hash is None:
                        # 第一次掃描，記錄但不報告
                        hashes[hash_key] = new_hash
                    elif new_hash != old_hash:
                        snippet = _extract_snippet(html)
                        changes.append(
                            SentimentChange(
                                name=target.name,
                                page_id=target.page_id,
                                url=url,
                                url_type=url_type,
                                change_type="changed",
                                snippet=snippet,
                            )
                        )
                        hashes[hash_key] = new_hash

            except Exception as e:
                logger.debug("輿情監測 %s (%s) 失敗: %s", target.name, url, e)

    _save_hashes(hashes)

    logger.info("=== 輿情監測完成: %d 筆變動 ===", len(changes))
    return changes
