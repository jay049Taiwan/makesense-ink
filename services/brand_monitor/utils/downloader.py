"""標案附件下載 + Cloudinary 上傳"""

import logging
import os
import re
import tempfile
from dataclasses import dataclass, field
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

PCC_BASE = "https://web.pcc.gov.tw"

# Cloudinary — 全部走環境變數，不寫死密鑰（2026/05/19 上雲前移除明文）
# 未設定時 upload_to_cloudinary 會直接略過（附件上傳屬選用功能）
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
CLOUDINARY_UPLOAD_URL = (
    f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/raw/upload"
    if CLOUDINARY_CLOUD_NAME else ""
)


@dataclass
class TenderAttachment:
    """標案附件資訊"""
    filename: str = ""
    local_path: str = ""
    download_url: str = ""
    cloudinary_url: str = ""
    doc_type: str = ""  # 投標須知 / 招標文件 etc


async def resolve_tender_page(redirect_url: str) -> Optional[str]:
    """從 PCC redirect URL 取得實際標案頁面 URL。"""
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(redirect_url)
            return str(resp.url)
    except Exception as e:
        logger.warning("解析標案頁面失敗: %s", e)
        return None


@dataclass
class TenderPageInfo:
    """標案頁面解析結果"""
    attachments: list[dict] = field(default_factory=list)
    deadline: str = ""  # 截止投標日（ISO 格式）


async def scrape_tender_page(page_url: str) -> TenderPageInfo:
    """從標案頁面 HTML 解析附件連結和截止投標日。"""
    info = TenderPageInfo()

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(page_url)
            text = resp.text
    except Exception as e:
        logger.warning("讀取標案頁面失敗: %s", e)
        return info

    # === 截止投標日 ===
    # 從 JS 變數 checkSysSpdt 抓（最可靠）
    m = re.search(r'var checkSysSpdt = "([^"]+)"', text)
    if m:
        raw = m.group(1).strip()
        # "2026-01-09 09:30:00.0" → "2026-01-09"
        if raw and len(raw) >= 10:
            info.deadline = raw[:10]
            logger.info("截止投標日: %s", info.deadline)

    # === 附件連結 ===
    # 1. downloadNoticeDocument（投標須知等）
    pattern = r'href=["\']([^"\']*downloadNoticeDocument[^"\']*)["\'][^>]*>([^<]*)'
    for href, label in re.findall(pattern, text):
        label = label.strip()
        full_url = href if href.startswith("http") else PCC_BASE + href
        info.attachments.append({
            "url": full_url,
            "label": label,
            "type": "notice",
        })

    # 2. downloadFile（其他附件）
    pattern2 = r'href=["\']([^"\']*downloadFile[^"\']*)["\'][^>]*>([^<]*)'
    for href, label in re.findall(pattern2, text):
        label = label.strip()
        full_url = href if href.startswith("http") else PCC_BASE + href
        info.attachments.append({
            "url": full_url,
            "label": label,
            "type": "file",
        })

    logger.info("找到 %d 個附件連結", len(info.attachments))
    return info


async def download_file(url: str, tender_id: str = "") -> Optional[TenderAttachment]:
    """下載檔案到暫存目錄。"""
    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()

            # 從 Content-Disposition 取得檔名
            cd = resp.headers.get("content-disposition", "")
            filename = ""
            if "filename=" in cd:
                # MIME encoded-word: =?UTF-8?B?base64?=
                mime_match = re.search(r'=\?([^?]+)\?([BQ])\?([^?]+)\?=', cd, re.IGNORECASE)
                if mime_match:
                    import base64
                    charset, encoding, payload = mime_match.groups()
                    if encoding.upper() == "B":
                        filename = base64.b64decode(payload).decode(charset)
                    else:  # Q encoding
                        import quopri
                        filename = quopri.decodestring(payload.encode()).decode(charset)
                else:
                    # filename*=UTF-8''xxx 或 filename="xxx"
                    match = re.search(r"filename\*?=['\"]?(?:UTF-8'')?([^;'\"]+)", cd, re.IGNORECASE)
                    if match:
                        filename = match.group(1).strip()
                        from urllib.parse import unquote
                        filename = unquote(filename)

            if not filename:
                # 從 URL 猜檔名
                filename = url.split("/")[-1].split("?")[0]
                if not filename or "." not in filename:
                    # 從 content-type 推測副檔名
                    ct = resp.headers.get("content-type", "")
                    ext = ".pdf"  # 預設
                    if "zip" in ct:
                        ext = ".zip"
                    elif "msword" in ct or "wordprocessing" in ct:
                        ext = ".doc"
                    elif "opendocument" in ct:
                        ext = ".odt"
                    filename = f"{tender_id}_notice{ext}" if tender_id else f"notice{ext}"

            # 寫到暫存
            tmp_dir = tempfile.mkdtemp(prefix="brand_monitor_")
            local_path = os.path.join(tmp_dir, filename)
            with open(local_path, "wb") as f:
                f.write(resp.content)

            logger.info("下載完成: %s (%.1f KB)", filename, len(resp.content) / 1024)

            return TenderAttachment(
                filename=filename,
                local_path=local_path,
                download_url=url,
            )

    except Exception as e:
        logger.warning("下載失敗 (%s): %s", url, e)
        return None


async def upload_to_cloudinary(attachment: TenderAttachment) -> Optional[str]:
    """上傳檔案到 Cloudinary，回傳公開 URL。"""
    import hashlib
    import time

    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        logger.info("Cloudinary 未設定，略過附件上傳")
        return None

    if not attachment.local_path or not os.path.exists(attachment.local_path):
        return None

    timestamp = str(int(time.time()))
    # 用 raw 上傳（非圖片）
    folder = "brand_monitor/attachments"
    public_id = os.path.splitext(attachment.filename)[0]

    # 產生簽名
    params_to_sign = f"folder={folder}&public_id={public_id}&timestamp={timestamp}{CLOUDINARY_API_SECRET}"
    signature = hashlib.sha1(params_to_sign.encode()).hexdigest()

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            with open(attachment.local_path, "rb") as f:
                resp = await client.post(
                    CLOUDINARY_UPLOAD_URL,
                    data={
                        "api_key": CLOUDINARY_API_KEY,
                        "timestamp": timestamp,
                        "signature": signature,
                        "folder": folder,
                        "public_id": public_id,
                    },
                    files={"file": (attachment.filename, f)},
                )
            resp.raise_for_status()
            data = resp.json()
            url = data.get("secure_url", "")
            logger.info("Cloudinary 上傳完成: %s", url)
            return url

    except Exception as e:
        logger.warning("Cloudinary 上傳失敗: %s", e)
        return None
    finally:
        # 清理暫存
        try:
            os.remove(attachment.local_path)
            os.rmdir(os.path.dirname(attachment.local_path))
        except OSError:
            pass


@dataclass
class TenderDownloadResult:
    """附件下載結果（含截止日期）"""
    attachments: list[TenderAttachment] = field(default_factory=list)
    deadline: str = ""  # 從頁面抓到的截止投標日


async def download_tender_attachments(
    source_url: str, tender_id: str = ""
) -> TenderDownloadResult:
    """完整流程：從標案 URL 解析頁面（截止日期 + 附件）並上傳 Cloudinary。"""
    result = TenderDownloadResult()

    # 1. 解析頁面
    page_url = await resolve_tender_page(source_url)
    if not page_url:
        return result

    # 2. 從頁面抓截止日期 + 附件連結
    page_info = await scrape_tender_page(page_url)
    result.deadline = page_info.deadline

    if not page_info.attachments:
        logger.info("此標案無附件可下載: %s", tender_id)
        return result

    # 3. 下載並上傳
    for link in page_info.attachments:
        attachment = await download_file(link["url"], tender_id)
        if attachment:
            attachment.doc_type = link.get("label", "附件")
            cloud_url = await upload_to_cloudinary(attachment)
            if cloud_url:
                attachment.cloudinary_url = cloud_url
                result.attachments.append(attachment)

    logger.info("標案 %s: 共處理 %d 個附件", tender_id, len(result.attachments))
    return result
