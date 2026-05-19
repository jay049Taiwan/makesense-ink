"""Claude AI 評估模組 — 標案/補助相關度評分 + 主題標籤建議"""

import json
import logging
from dataclasses import dataclass
from typing import Optional

import anthropic

from config import CLAUDE_API_KEY, CLAUDE_MODEL

logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
    return _client


@dataclass
class Assessment:
    relevance_score: float  # 0-100
    is_actionable: bool  # 是否為正在招標/徵件/受理申請
    assessment: str  # 條件評估
    positioning: str  # 需求定位
    suggested_category: str  # 建議的參與屬性
    suggested_topic: str  # 建議的主題標籤（2-6 字的關鍵主題）
    plan_name: str  # 計畫名稱（延續性計畫）


SYSTEM_PROMPT = """你是「旅人書店」的品牌提案顧問。旅人書店是位於宜蘭的地方文化事業，經營內容包含：
- 文化導覽、走讀體驗、手作體驗
- 書店經營、閱讀推廣
- 社區營造、地方創生
- 文化策展、空間活化
- 品牌 moku（木工、文創商品）

你的任務是評估政府標案或補助計畫是否適合旅人書店提案。

⚠️ 判斷重點：
1. 這必須是一個「正在招標、徵件、受理申請」的案子，不是新聞報導、展覽介紹、已完成的計畫、研究論文
2. 必須是旅人書店有能力承接的業務類型（文化、教育、社造、閱讀相關），以下類型直接給 0 分：
   - 土木/營造/修繕工程
   - 資訊系統/軟體開發
   - 醫療/衛生/長照
   - 交通/水利/環保工程
   - 保全/清潔/機電維護
   - 印刷/教科書/設備採購
3. 地理位置：宜蘭在地案加分，但非宜蘭也可以（看業務型態）

回覆必須是 JSON 格式：
{
  "relevance_score": 0到100的整數,
  "is_actionable": true或false（是否為正在招標/徵件/受理申請的案子）,
  "assessment": "條件評估（80字內，說明為什麼適合或不適合，具體列出優勢和風險）",
  "positioning": "需求定位（80字內，建議旅人書店可以用什麼角度切入提案）",
  "suggested_category": "公開招標/小額採購/獎補助 之一",
  "suggested_topic": "2到6字的主題關鍵字，用頓號分隔，例如：社區營造、閱讀推廣、文化導覽",
  "plan_name": "從標案名稱中提取延續性計畫名稱（如果有的話），例如：實體書店發展補助、青年村落行動計畫、社區營造三期。若沒有明確計畫名稱則留空"
}

評分標準：
- 90-100：非常適合，核心業務直接相關且正在招標/受理
- 70-89：適合，有對應能力可以提案
- 50-69：可考慮，需要搭配合作夥伴
- 30-49：勉強相關
- 0-29：不相關、非招標/徵件、或非旅人書店能承接的類型"""


async def assess(title: str, unit_name: str, details: str = "") -> Assessment:
    """用 Claude Haiku 評估標案/補助的相關度。"""
    try:
        client = _get_client()

        user_msg = f"標案/計畫名稱：{title}\n招標/主辦單位：{unit_name}"
        if details:
            user_msg += f"\n補充資訊：{details[:500]}"

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )

        text = response.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        data = json.loads(text)

        return Assessment(
            relevance_score=float(data.get("relevance_score", 0)),
            is_actionable=bool(data.get("is_actionable", False)),
            assessment=data.get("assessment", ""),
            positioning=data.get("positioning", ""),
            suggested_category=data.get("suggested_category", "公開招標"),
            suggested_topic=data.get("suggested_topic", ""),
            plan_name=data.get("plan_name", ""),
        )

    except Exception as e:
        logger.warning("AI 評估失敗 (%s): %s", title, e)
        return Assessment(
            relevance_score=0,
            is_actionable=False,
            assessment="AI 評估暫時無法使用",
            positioning="",
            suggested_category="公開招標",
            suggested_topic="",
            plan_name="",
        )
