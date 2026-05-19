"""子系統二：政府補助預警"""

import logging
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urljoin
import asyncio

import httpx
from bs4 import BeautifulSoup

from config import SUBSIDY_SOURCES, YILAN_KEYWORDS
from notion.db08 import KeywordSet

logger = logging.getLogger(__name__)


@dataclass
class SubsidyResult:
    """補助/徵件結果"""

    title: str
    source_url: str
    source_name: str  # 來源機構名稱
    deadline: str = ""
    description: str = ""
    is_yilan: bool = False
    matched_keyword: str = ""
    matched_keyword_page_id: str = ""

    # AI 評估（稍後填入）
    relevance_score: float = 0.0
    ai_assessment: str = ""
    ai_positioning: str = ""


def _is_yilan(text: str) -> bool:
    return any(kw in text for kw in YILAN_KEYWORDS)


SUBSIDY_KEYWORDS = ["補助", "徵件", "徵選", "徵求", "獎助", "申請", "受理", "計畫", "方案"]


def _is_subsidy_related(text: str) -> bool:
    """檢查文字是否與補助/徵件相關。"""
    return any(kw in text for kw in SUBSIDY_KEYWORDS)


_http: Optional[httpx.AsyncClient] = None


async def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
        )
    return _http


async def _scrape_page(name: str, url: str) -> list[SubsidyResult]:
    """通用頁面爬蟲：抓取頁面中的公告連結。"""
    results = []

    try:
        client = await _get_http()
        resp = await client.get(url)
        resp.raise_for_status()
        html = resp.text

        soup = BeautifulSoup(html, "html.parser")

        # 尋找所有連結，過濾出補助相關的
        for a_tag in soup.find_all("a", href=True):
            link_text = a_tag.get_text(strip=True)
            if not link_text or len(link_text) < 5:
                continue

            if _is_subsidy_related(link_text):
                href = a_tag["href"]
                full_url = urljoin(url, href)

                # 嘗試從父元素或鄰近元素取得日期
                deadline = ""
                parent = a_tag.parent
                if parent:
                    parent_text = parent.get_text()
                    date_match = re.search(
                        r"(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})", parent_text
                    )
                    if date_match:
                        deadline = f"{date_match.group(1)}-{date_match.group(2).zfill(2)}-{date_match.group(3).zfill(2)}"

                results.append(
                    SubsidyResult(
                        title=link_text[:200],
                        source_url=full_url,
                        source_name=name,
                        deadline=deadline,
                        is_yilan=_is_yilan(link_text),
                    )
                )

    except Exception as e:
        logger.warning("爬取 %s (%s) 失敗: %s", name, url, e)

    return results


async def _scrape_with_playwright(name: str, url: str) -> list[SubsidyResult]:
    """Playwright 爬蟲（用於 JS 渲染頁面）。"""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("Playwright 未安裝，跳過 %s", name)
        return []

    results = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle", timeout=30000)

            html = await page.content()
            await browser.close()

        soup = BeautifulSoup(html, "html.parser")
        for a_tag in soup.find_all("a", href=True):
            link_text = a_tag.get_text(strip=True)
            if not link_text or len(link_text) < 5:
                continue
            if _is_subsidy_related(link_text):
                href = a_tag["href"]
                full_url = urljoin(url, href)
                results.append(
                    SubsidyResult(
                        title=link_text[:200],
                        source_url=full_url,
                        source_name=name,
                        is_yilan=_is_yilan(link_text),
                    )
                )

    except Exception as e:
        logger.warning("Playwright 爬取 %s 失敗: %s", name, e)

    return results


async def layer1_site_scrape() -> list[SubsidyResult]:
    """第一層：爬取各機關補助專區。先用 requests，失敗或結果為空時用 Playwright。"""
    all_results = []

    for name, info in SUBSIDY_SOURCES.items():
        url = info["url"]
        logger.info("爬取補助頁面: %s (%s)", name, url)

        results = await _scrape_page(name, url)

        # 如果 requests 結果太少，嘗試 Playwright
        if len(results) < 2:
            logger.info("結果不足，嘗試 Playwright: %s", name)
            pw_results = await _scrape_with_playwright(name, url)
            if len(pw_results) > len(results):
                results = pw_results

        all_results.extend(results)

    logger.info("第一層補助爬取完成: %d 筆", len(all_results))
    return all_results


async def layer2_keyword_search(keywords: KeywordSet) -> list[SubsidyResult]:
    """第二層：用主題關鍵字搜尋補助資訊。

    使用 DuckDuckGo HTML 搜尋（不需 API key）。
    """
    all_results = []
    seen_urls = set()

    for kw in keywords.topics[:10]:  # 限制前 10 個主題避免過多請求
        for suffix in ["徵件", "補助", "計畫"]:
            query = f"{kw.name} {suffix} 2026"
            try:
                async with httpx.AsyncClient(
                    timeout=15,
                    follow_redirects=True,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
                    },
                ) as client:
                    resp = await client.get(
                        "https://html.duckduckgo.com/html/",
                        params={"q": query},
                    )

                    if resp.status_code != 200:
                        continue

                    soup = BeautifulSoup(resp.text, "html.parser")
                    for result_div in soup.find_all("div", class_="result"):
                        a_tag = result_div.find("a", class_="result__a")
                        if not a_tag:
                            continue

                        title = a_tag.get_text(strip=True)
                        href = a_tag.get("href", "")

                        if href in seen_urls:
                            continue
                        seen_urls.add(href)

                        snippet_tag = result_div.find("a", class_="result__snippet")
                        snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""

                        if _is_subsidy_related(title + snippet):
                            all_results.append(
                                SubsidyResult(
                                    title=title[:200],
                                    source_url=href,
                                    source_name=f"搜尋({kw.name}+{suffix})",
                                    description=snippet[:300],
                                    is_yilan=_is_yilan(title + snippet),
                                    matched_keyword=kw.name,
                                    matched_keyword_page_id=kw.page_id,
                                )
                            )

            except Exception as e:
                logger.debug("搜尋失敗 (%s %s): %s", kw.name, suffix, e)

    logger.info("第二層關鍵字搜尋完成: %d 筆", len(all_results))
    return all_results


async def scan(keywords: KeywordSet) -> list[SubsidyResult]:
    """執行完整的補助掃描。

    只爬取 config.py SUBSIDY_SOURCES 指定的政府網站，
    不做 DuckDuckGo 廣泛搜尋（避免撈到舊文章/展覽介紹等雜訊）。
    """
    logger.info("=== 子系統二：補助預警掃描開始 ===")

    results = await layer1_site_scrape()

    # 去重（用 URL）
    seen_urls = set()
    deduped = []
    for item in results:
        if item.source_url not in seen_urls:
            seen_urls.add(item.source_url)
            deduped.append(item)

    logger.info("=== 補助掃描完成: %d 筆（去重後）===", len(deduped))
    return deduped
