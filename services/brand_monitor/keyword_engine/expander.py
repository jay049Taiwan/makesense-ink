"""關鍵字自動擴充引擎"""

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import date

from config import STATE_DIR
from monitors.procurement import TenderResult
from notion import db08
from notion.db08 import KeywordSet

logger = logging.getLogger(__name__)

EXPANSION_LOG_FILE = os.path.join(STATE_DIR, "expansion_log.json")


@dataclass
class ExpansionAction:
    """記錄一次擴充行為"""

    action_type: str  # new_org / new_topic
    name: str
    page_id: str
    source: str  # 從哪個關鍵字/標案發現的
    date: str = ""


def _load_log() -> list[dict]:
    if os.path.exists(EXPANSION_LOG_FILE):
        with open(EXPANSION_LOG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_log(log: list[dict]):
    os.makedirs(os.path.dirname(EXPANSION_LOG_FILE), exist_ok=True)
    with open(EXPANSION_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)


def _append_log(action: ExpansionAction):
    log = _load_log()
    log.append({
        "action_type": action.action_type,
        "name": action.name,
        "page_id": action.page_id,
        "source": action.source,
        "date": action.date or date.today().isoformat(),
    })
    _save_log(log)


async def expand_from_procurement(
    results: list[TenderResult],
    keywords: KeywordSet,
) -> list[ExpansionAction]:
    """從標案結果中自動擴充關鍵字。

    規則：
    1. 主題類命中的招標單位 → 若不在單位類中，自動新增為合作單位
    2. 單位類命中的標案名稱含新主題 → 自動新增為主題標籤
    """
    actions = []
    existing_org_names = set(keywords.org_names)
    existing_topic_names = set(keywords.topic_names)

    for result in results:
        # 規則 1：主題類命中 → 招標單位可能是新的合作單位
        if result.matched_keyword_type == "topic" and result.unit_name:
            unit_name = result.unit_name.strip()
            # 過濾太短或太通用的名稱
            if len(unit_name) >= 3 and unit_name not in existing_org_names:
                page_id = await db08.ensure_org(unit_name)
                existing_org_names.add(unit_name)
                action = ExpansionAction(
                    action_type="new_org",
                    name=unit_name,
                    page_id=page_id,
                    source=f"主題「{result.matched_keyword}」標案: {result.title[:30]}",
                )
                _append_log(action)
                actions.append(action)
                logger.info("自動擴充單位: %s (來自主題 %s)", unit_name, result.matched_keyword)

        # 規則 2：委託類對象的新標案 → 標題中的主題可能值得追蹤
        # 這個比較難自動判斷，先記錄但不自動新增
        # 未來可以用 Claude 分析標題提取主題

    return actions


async def expand_from_subsidy(
    subsidy_titles: list[str],
    keywords: KeywordSet,
) -> list[ExpansionAction]:
    """從補助結果中擴充（預留）。目前不自動擴充，只記錄。"""
    return []


def get_weekly_expansions() -> list[dict]:
    """取得本週新增的關鍵字（供週報使用）。"""
    log = _load_log()
    today = date.today()

    # 過濾最近 7 天
    recent = []
    for entry in log:
        entry_date = entry.get("date", "")
        try:
            d = date.fromisoformat(entry_date)
            if (today - d).days <= 7:
                recent.append(entry)
        except (ValueError, TypeError):
            continue

    return recent


def clear_weekly_log():
    """清除擴充記錄（週報發送後呼叫）。"""
    _save_log([])
