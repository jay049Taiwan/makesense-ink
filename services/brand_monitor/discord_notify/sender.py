"""Discord 通知發送器 — 用 Bot Token 發送到 L5 頻道 + 私訊"""

import asyncio
import logging

import httpx

from config import DISCORD_BOT_TOKEN, DISCORD_OWNER_ID

logger = logging.getLogger(__name__)

# L5 頻道 ID（從 discord_channels.json）
L5_CHANNEL_ID = "1484390905531203776"

DISCORD_API = "https://discord.com/api/v10"


def _headers() -> dict:
    return {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN}",
        "Content-Type": "application/json",
    }


async def _send_to_channel(content: str, channel_id: str = L5_CHANNEL_ID) -> str:
    """透過 Bot Token REST API 發送訊息到指定頻道，回傳第一則 message ID。"""
    if not DISCORD_BOT_TOKEN:
        logger.warning("未設定 DISCORD_BOT_TOKEN，跳過頻道通知")
        return ""

    first_msg_id = ""
    async with httpx.AsyncClient(timeout=15) as client:
        chunks = [content[i : i + 1990] for i in range(0, len(content), 1990)]
        for i, chunk in enumerate(chunks):
            if i > 0:
                await asyncio.sleep(1.2)
            resp = await client.post(
                f"{DISCORD_API}/channels/{channel_id}/messages",
                headers=_headers(),
                json={"content": chunk},
            )
            if resp.status_code == 429:
                retry_after = resp.json().get("retry_after", 5)
                logger.warning("Discord 429 限速，等待 %.1f 秒", retry_after)
                await asyncio.sleep(retry_after)
                resp = await client.post(
                    f"{DISCORD_API}/channels/{channel_id}/messages",
                    headers=_headers(),
                    json={"content": chunk},
                )
            if resp.status_code in (200, 201):
                if i == 0:
                    first_msg_id = resp.json().get("id", "")
            else:
                logger.warning(
                    "頻道訊息發送失敗 (channel=%s): %d %s",
                    channel_id,
                    resp.status_code,
                    resp.text[:200],
                )
    return first_msg_id


async def _send_dm(content: str):
    """透過 Discord REST API 發送私訊給 Noah。"""
    if not DISCORD_BOT_TOKEN:
        logger.warning("未設定 DISCORD_BOT_TOKEN，跳過私訊")
        return

    async with httpx.AsyncClient(timeout=15) as client:
        # 建立或取得 DM channel
        resp = await client.post(
            f"{DISCORD_API}/users/@me/channels",
            headers=_headers(),
            json={"recipient_id": str(DISCORD_OWNER_ID)},
        )
        if resp.status_code != 200:
            logger.warning("建立 DM 頻道失敗: %d %s", resp.status_code, resp.text[:200])
            return

        dm_channel_id = resp.json()["id"]

        chunks = [content[i : i + 1990] for i in range(0, len(content), 1990)]
        for i, chunk in enumerate(chunks):
            if i > 0:
                await asyncio.sleep(1.2)
            resp = await client.post(
                f"{DISCORD_API}/channels/{dm_channel_id}/messages",
                headers=_headers(),
                json={"content": chunk},
            )
            if resp.status_code == 429:
                retry_after = resp.json().get("retry_after", 5)
                logger.warning("Discord DM 429 限速，等待 %.1f 秒", retry_after)
                await asyncio.sleep(retry_after)
                resp = await client.post(
                    f"{DISCORD_API}/channels/{dm_channel_id}/messages",
                    headers=_headers(),
                    json={"content": chunk},
                )
            if resp.status_code not in (200, 201):
                logger.warning("DM 發送失敗: %d", resp.status_code)


async def send_single(content: str) -> str:
    """發送單則訊息到 L5 頻道（每案一則），回傳 message ID。"""
    msg_id = await _send_to_channel(content)
    await asyncio.sleep(1.5)  # 避免 Discord 限速
    return msg_id or ""


async def send_report(report: str):
    """發送報告到 L5 頻道 + 私訊。"""
    await _send_to_channel(report)
    await _send_dm(report)


async def send_error(error_msg: str):
    """發送錯誤通知（只發私訊）。"""
    msg = f"⚠️ 品牌情報系統錯誤\n\n{error_msg}"
    await _send_dm(msg)
