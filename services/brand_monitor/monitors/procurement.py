"""子系統一：政府採購標案監測"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

import httpx

from config import PCC_API_BASE, PCC_FIXED_ORGS, PCC_RATE_LIMIT, YILAN_KEYWORDS
from notion.db08 import KeywordSet
from notion import db01, db08
from utils.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

_pcc_limiter = RateLimiter(rate=PCC_RATE_LIMIT, burst=2)
_http: Optional[httpx.AsyncClient] = None


async def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(timeout=15, follow_redirects=True)
    return _http


@dataclass
class TenderResult:
    title: str
    tender_id: str  # job_number
    unit_name: str
    source_url: str  # pcc.gov.tw 正確連結
    tender_type: str  # 公開招標公告 / 決標公告 etc
    category: str = ""  # 公開招標 / 小額採購
    price: int = 0  # 招標金額
    deadline: str = ""  # 截止日期
    publish_date: str = ""  # 公告日期
    is_yilan: bool = False
    matched_keyword: str = ""
    matched_keyword_page_id: str = ""
    matched_keyword_type: str = ""  # topic / org
    relevance_score: float = 0.0
    ai_assessment: str = ""
    ai_positioning: str = ""
    suggested_topic: str = ""  # AI 建議的主題標籤
    plan_name: str = ""  # AI 提取的計畫名稱
    is_award: bool = False
    award_winners: list[str] = field(default_factory=list)
    award_losers: list[str] = field(default_factory=list)


def _is_yilan(text: str) -> bool:
    return any(kw in text for kw in YILAN_KEYWORDS)


def _map_category(tender_type: str) -> str:
    """從標案類型映射到 DB01 參與屬性。"""
    if "公開招標" in tender_type:
        return "公開招標"
    if "限制性" in tender_type or "小額" in tender_type:
        return "小額採購"
    return "公開招標"


def _format_price(price) -> int:
    """確保金額是整數。"""
    if price is None:
        return 0
    try:
        return int(price)
    except (ValueError, TypeError):
        return 0


async def _search_keyword(query: str) -> list[dict]:
    """用關鍵字搜尋 pcc.mlwmlw.org API。回傳簡略結果。"""
    await _pcc_limiter.acquire()
    try:
        client = await _get_http()
        resp = await client.get(f"{PCC_API_BASE}/keyword/{query}", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning("PCC 搜尋失敗 (query=%s): %s", query, e)
        return []


async def _get_unit_tenders(unit_id: str) -> list[dict]:
    """取得某單位的完整標案列表。自動往上層 unit_id 搜尋。

    unit_id 有階層結構（如 A.53.100.1），子機關可能沒資料，
    需往上層（A.53.100 → A.53）搜尋才找得到。
    最多只往上搜 2 層，避免過慢。
    """
    parts = unit_id.split(".")
    # 最多搜 2 層（當前 + 上一層）
    max_depth = max(1, len(parts) - 1)
    for depth in range(len(parts), max_depth - 1, -1):
        test_id = ".".join(parts[:depth])
        await _pcc_limiter.acquire()
        try:
            client = await _get_http()
            resp = await client.get(f"{PCC_API_BASE}/unit/{test_id}", timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                return data
        except Exception:
            pass
    return []


async def _enrich_tender(basic: dict) -> Optional[dict]:
    """用 unit API 取得標案的完整資訊（金額、截止日、正確 URL）。"""
    unit_id = basic.get("unit_id", "")
    job_number = str(basic.get("job_number", ""))
    if not unit_id or not job_number:
        return None

    tenders = await _get_unit_tenders(unit_id)

    for t in tenders:
        if str(t.get("job_number", "")) == job_number:
            return t

    # 找不到完整資料，用基本資料
    return None


def _parse_full_record(
    record: dict, keyword: str, keyword_page_id: str, keyword_type: str
) -> TenderResult:
    """將完整的 unit API record 轉為 TenderResult。"""
    title = record.get("name", "未知標案")
    unit_name = record.get("unit", "")
    job_number = str(record.get("job_number", ""))
    tender_type = record.get("type", "")
    price = _format_price(record.get("price"))
    source_url = record.get("url", "")

    # 截止日期（保留完整日期時間）
    end_date = record.get("end_date", "")
    if end_date and "T" in end_date:
        # 2026-02-26T00:00:00.000Z → 只有 00:00 表示 API 沒有精確時間
        time_part = end_date.split("T")[1].split(".")[0] if "T" in end_date else ""
        if time_part == "00:00:00":
            end_date = end_date.split("T")[0]  # 只保留日期
        else:
            end_date = end_date.split(".")[0].replace("T", " ")  # 2026-02-26 17:00:00

    # 公告日期
    publish = record.get("publish", "")
    if publish and "T" in publish:
        publish = publish.split("T")[0]

    combined = f"{title} {unit_name}"
    is_yilan = _is_yilan(combined)

    # 判斷是否為決標
    is_award = "決標" in tender_type
    winners = []
    award_data = record.get("award")
    if isinstance(award_data, dict) and "決標" in award_data.get("type", ""):
        is_award = True

    merchants = record.get("merchants", [])
    if isinstance(merchants, list):
        for m in merchants:
            name = m.get("name", "") if isinstance(m, dict) else str(m)
            if name:
                winners.append(name)

    return TenderResult(
        title=title,
        tender_id=job_number,
        unit_name=unit_name,
        source_url=source_url,
        tender_type=tender_type,
        category=_map_category(tender_type),
        price=price,
        deadline=end_date,
        publish_date=publish,
        is_yilan=is_yilan,
        is_award=is_award,
        matched_keyword=keyword,
        matched_keyword_page_id=keyword_page_id,
        matched_keyword_type=keyword_type,
        award_winners=winners,
    )


def _parse_basic_record(
    record: dict, keyword: str, keyword_page_id: str, keyword_type: str
) -> TenderResult:
    """將 keyword API 的簡略 record 轉為 TenderResult。

    沒有完整資料時，用 mlwmlw viewer 連結（保證有資料頁面）。
    """
    title = record.get("name", "未知標案")
    unit_name = record.get("unit", "")
    job_number = str(record.get("job_number", ""))
    unit_id = record.get("unit_id", "")
    publish = record.get("publish", "")

    # 用 mlwmlw viewer — 這個一定能打開且顯示標案內容
    source_url = f"https://pcc.mlwmlw.org/tender/{unit_id}/{job_number}"

    combined = f"{title} {unit_name}"

    return TenderResult(
        title=title,
        tender_id=job_number,
        unit_name=unit_name,
        source_url=source_url,
        tender_type="招標公告",
        category="公開招標",
        price=0,
        deadline=publish,  # 用公告日期作為參考日期
        publish_date=publish,
        is_yilan=_is_yilan(combined),
        matched_keyword=keyword,
        matched_keyword_page_id=keyword_page_id,
        matched_keyword_type=keyword_type,
    )


def _is_recent(publish_date: str, max_days: int = 60) -> bool:
    """檢查公告日期是否在最近 N 天內。"""
    if not publish_date:
        return True  # 沒有日期的先保留，後續由 AI 過濾
    try:
        from datetime import datetime, timedelta
        pub = datetime.strptime(publish_date[:10], "%Y-%m-%d").date()
        cutoff = date.today() - timedelta(days=max_days)
        return pub >= cutoff
    except (ValueError, TypeError):
        return True


async def layer1_keyword_search(keywords: KeywordSet) -> list[TenderResult]:
    """第一層：用主題類+委託單位+固定機關關鍵字搜尋，並取得完整標案資訊。

    搜尋來源（2026/04/22 校正）：
    1. DB08 標籤類（經營類型=標籤；舊架構為「主題標籤+觀點狀態=主題標籤」，已合併至此）
    2. DB08 委託單位（對應委託專案不為空，~44 筆）
    3. config.py 固定機關（文化部、經濟部、國發會、教育部、新竹生活美學館、宜蘭縣政府）
    """
    results = []
    seen_ids = set()

    # 收集所有 keyword 搜尋結果
    basic_results = []

    # 固定機關
    for org_name in PCC_FIXED_ORGS:
        logger.info("搜尋固定機關: %s", org_name)
        records = await _search_keyword(org_name)
        for record in records[:30]:
            jn = str(record.get("job_number", ""))
            pub = record.get("publish", "")
            if jn and jn not in seen_ids and _is_recent(pub):
                seen_ids.add(jn)
                basic_results.append((record, org_name, "", "fixed_org"))

    # DB08 主題標籤
    for kw in keywords.topics:
        logger.info("搜尋主題: %s", kw.name)
        records = await _search_keyword(kw.name)
        for record in records[:20]:
            jn = str(record.get("job_number", ""))
            pub = record.get("publish", "")
            if jn and jn not in seen_ids and _is_recent(pub):
                seen_ids.add(jn)
                basic_results.append((record, kw.name, kw.page_id, "topic"))

    # DB08 委託單位（對應委託專案不為空）
    for kw in keywords.orgs:
        if len(kw.name) <= 2:
            continue
        logger.info("搜尋委託單位: %s", kw.name)
        records = await _search_keyword(kw.name)
        for record in records[:10]:
            jn = str(record.get("job_number", ""))
            pub = record.get("publish", "")
            if jn and jn not in seen_ids and _is_recent(pub):
                seen_ids.add(jn)
                basic_results.append((record, kw.name, kw.page_id, "org"))

    logger.info("keyword 搜尋共 %d 筆，開始取得完整資訊...", len(basic_results))

    # 對每筆結果取得完整資訊（金額、截止日、正確 URL）
    # 按 unit_id 分組，減少 API 呼叫
    unit_cache: dict[str, list[dict]] = {}

    for record, kw_name, kw_page_id, kw_type in basic_results:
        unit_id = record.get("unit_id", "")
        job_number = str(record.get("job_number", ""))

        # 嘗試從 cache 或 API 取得完整資料
        full_record = None
        if unit_id:
            if unit_id not in unit_cache:
                try:
                    tenders = await asyncio.wait_for(
                        _get_unit_tenders(unit_id), timeout=20
                    )
                    unit_cache[unit_id] = tenders
                except asyncio.TimeoutError:
                    logger.warning("unit API 逾時，跳過: %s", unit_id)
                    unit_cache[unit_id] = []

            name = record.get("name", "")
            for t in unit_cache[unit_id]:
                if str(t.get("job_number", "")) == job_number:
                    full_record = t
                    break
            if not full_record and name:
                for t in unit_cache[unit_id]:
                    if t.get("name") and name[:15] in t["name"]:
                        full_record = t
                        break

        if full_record:
            result = _parse_full_record(full_record, kw_name, kw_page_id, kw_type)
        else:
            # 用 keyword API 的基本資料，自動生成搜尋連結
            result = _parse_basic_record(record, kw_name, kw_page_id, kw_type)

        results.append(result)

    logger.info("第一層完成: %d 筆（含完整資訊）", len(results))
    return results


async def layer2_award_tracking() -> list[TenderResult]:
    """第二層：查詢最近的決標公告。"""
    tracked = await db01.get_tracked_tenders()
    if not tracked:
        return []

    tracked_ids = {t["tender_id"] for t in tracked}
    today = date.today()
    date_str = today.strftime("%Y-%m-%d")

    logger.info("查詢決標: %s（追蹤 %d 筆）", date_str, len(tracked_ids))

    await _pcc_limiter.acquire()
    try:
        client = await _get_http()
        resp = await client.get(f"{PCC_API_BASE}/date/award/{date_str}")
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, list):
            data = []
    except Exception as e:
        logger.warning("決標查詢失敗: %s", e)
        data = []

    results = []
    for record in data:
        jn = str(record.get("job_number", ""))
        if jn in tracked_ids:
            result = _parse_full_record(record, "", "", "tracked") if record.get("url") else _parse_basic_record(record, "", "", "tracked")
            result.is_award = True
            result.tender_type = "決標公告"
            results.append(result)

    logger.info("第二層: %d 筆決標更新", len(results))
    return results


async def layer3_entity_monitoring(keywords: KeywordSet) -> list[dict]:
    """第三層：委託類對象的網站新發布。"""
    updates = []
    for entity in keywords.commissioned[:10]:
        urls = []
        if entity.website:
            urls.append(("website", entity.website))
        if entity.fb:
            urls.append(("fb", entity.fb))
        for url_type, url in urls:
            try:
                client = await _get_http()
                await _pcc_limiter.acquire()
                resp = await client.get(url, timeout=10)
                if resp.status_code == 200:
                    text = resp.text[:5000]
                    year = date.today().strftime("%Y")
                    if any(kw in text for kw in ["招標", "標案", "採購", "徵件", "補助"]) and year in text:
                        updates.append({
                            "entity_name": entity.name,
                            "entity_page_id": entity.page_id,
                            "url_type": url_type,
                            "url": url,
                            "snippet": text[:200],
                        })
            except Exception:
                pass
    logger.info("第三層: %d 筆發現", len(updates))
    return updates


async def scan(keywords: KeywordSet) -> list[TenderResult]:
    """執行完整標案掃描。"""
    logger.info("=== 子系統一：政府標案掃描開始 ===")
    layer1 = await layer1_keyword_search(keywords)
    layer2 = await layer2_award_tracking()
    all_results = layer1 + layer2
    logger.info("=== 標案掃描完成: 招標 %d, 決標 %d ===", len(layer1), len(layer2))
    return all_results
