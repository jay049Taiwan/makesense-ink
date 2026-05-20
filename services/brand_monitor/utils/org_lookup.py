"""組織聯絡資訊查詢 — 用 Claude + Web Search 補齊地址、電話、Email、官網、FB、IG"""

import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

import anthropic

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


@dataclass
class OrgInfo:
    """組織聯絡資訊"""
    address: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""
    fb: str = ""
    ig: str = ""


SYSTEM_PROMPT = """你是一個資料查詢助手。使用者會給你一個台灣的政府機關或組織名稱，請用網路搜尋找出該組織的聯絡資訊。

請回覆 JSON 格式，找不到的欄位留空字串：
{
  "address": "地址（完整地址，含縣市區）",
  "phone": "電話（含區碼，格式如 02-12345678）",
  "email": "聯繫 Email",
  "website": "官方網站 URL",
  "fb": "Facebook 粉絲專頁 URL",
  "ig": "Instagram 帳號 URL"
}

注意：
- 只填確定正確的資訊，不確定就留空
- 網址必須是完整的 URL（https://...）
- 電話格式統一用半形數字和半形橫線
- 只回覆 JSON，不要加其他文字"""


async def lookup(org_name: str) -> OrgInfo:
    """用 Claude + Web Search 查詢組織聯絡資訊。找不到就回傳空值。"""
    if not org_name or not ANTHROPIC_API_KEY:
        return OrgInfo()

    try:
        client = _get_client()

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=500,
            system=SYSTEM_PROMPT,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
            messages=[{"role": "user", "content": f"請查詢「{org_name}」的聯絡資訊"}],
        )

        # 取最後一個 text block（web search 後的最終回答）
        text = ""
        for block in response.content:
            if hasattr(block, "text") and block.text.strip():
                text = block.text.strip()

        if not text:
            logger.debug("org_lookup 無文字回應: %s", org_name)
            return OrgInfo()

        # 清理 <cite> 標籤（web search 會加上引用標記）
        text = re.sub(r"</?cite[^>]*>", "", text)

        # 清理 markdown code block
        if "```" in text:
            parts = text.split("```")
            for part in parts[1:]:
                candidate = part
                if candidate.startswith("json"):
                    candidate = candidate[4:]
                candidate = candidate.strip()
                if candidate.startswith("{"):
                    text = candidate
                    break

        # 如果整段文字不是 JSON，嘗試從中提取 JSON
        if not text.startswith("{"):
            match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
            if match:
                text = match.group()

        data = json.loads(text)

        info = OrgInfo(
            address=data.get("address", ""),
            phone=data.get("phone", ""),
            email=data.get("email", ""),
            website=data.get("website", ""),
            fb=data.get("fb", ""),
            ig=data.get("ig", ""),
        )

        found = [f for f in [info.address, info.phone, info.email, info.website, info.fb, info.ig] if f]
        logger.info("org_lookup [%s]: 找到 %d 項資訊", org_name, len(found))
        return info

    except Exception as e:
        logger.warning("org_lookup 失敗 (%s): %s", org_name, e)
        return OrgInfo()
