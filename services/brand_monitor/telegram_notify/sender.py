"""Telegram 通知發送器 — 透過 Bot Token 發訊到 Noah 私訊

2026/05/09：取代 discord_notify/sender.py（Discord Bot 已退役）。

API 對齊：
- send_single(content) -> str：發送單則訊息，回傳 Telegram message_id（字串）
- send_report(content)：發送報告（同 send_single，但不回傳 ID）
- send_error(error_msg)：發送錯誤通知（內含 ⚠️ 標頭）
"""

import asyncio
import logging

import httpx

from config import TELEGRAM_BOT_TOKEN, NOAH_TG_USER_ID

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org"
# Telegram 單則訊息上限 4096 字元（含 markdown 字元）
MAX_LEN = 4000


def _api_url(method: str) -> str:
    return f"{TELEGRAM_API}/bot{TELEGRAM_BOT_TOKEN}/{method}"


async def _send_message(content: str, chat_id: int = None) -> str:
    """透過 Telegram Bot API 發訊到指定 chat，回傳第一則 message_id（字串）。

    內建分段（>4000 字元拆成多則）+ 429 限速重試。
    """
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("未設定 TELEGRAM_BOT_TOKEN，跳過 Telegram 通知")
        return ""

    if chat_id is None:
        chat_id = NOAH_TG_USER_ID

    first_msg_id = ""
    async with httpx.AsyncClient(timeout=15) as client:
        chunks = [content[i : i + MAX_LEN] for i in range(0, len(content), MAX_LEN)]
        for i, chunk in enumerate(chunks):
            if i > 0:
                await asyncio.sleep(1.2)  # 避免限速
            try:
                resp = await client.post(
                    _api_url("sendMessage"),
                    json={
                        "chat_id": chat_id,
                        "text": chunk,
                        "disable_web_page_preview": True,
                    },
                )
            except httpx.RequestError as e:
                logger.warning("Telegram 連線失敗: %s", e)
                continue

            # 處理 429 限速
            if resp.status_code == 429:
                retry_after = resp.json().get("parameters", {}).get("retry_after", 5)
                logger.warning("Telegram 429 限速，等待 %.1f 秒", retry_after)
                await asyncio.sleep(retry_after)
                resp = await client.post(
                    _api_url("sendMessage"),
                    json={
                        "chat_id": chat_id,
                        "text": chunk,
                        "disable_web_page_preview": True,
                    },
                )

            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok") and i == 0:
                    first_msg_id = str(data["result"]["message_id"])
            else:
                logger.warning(
                    "Telegram 發送失敗 (chat=%s): %d %s",
                    chat_id,
                    resp.status_code,
                    resp.text[:200],
                )

    return first_msg_id


# === 對外 API（與 discord_notify/sender.py 相容） ===

async def send_single(content: str) -> str:
    """發送單則訊息到 Noah 私訊，回傳 message_id。"""
    msg_id = await _send_message(content)
    await asyncio.sleep(1.0)  # 避免連續發訊限速
    return msg_id or ""


async def send_report(report: str):
    """發送報告到 Noah 私訊。"""
    await _send_message(report)


async def send_error(error_msg: str):
    """發送錯誤通知到 Noah 私訊。"""
    msg = f"⚠️ 品牌情報系統錯誤\n\n{error_msg}"
    await _send_message(msg)
