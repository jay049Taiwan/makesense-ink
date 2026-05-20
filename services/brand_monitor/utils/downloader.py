"""標案附件下載 + Cloudflare R2 上傳"""

import asyncio
import logging
import os
import re
import tempfile
from dataclasses import dataclass, field
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

PCC_BASE = "https://web.pcc.gov.tw"

# Cloudflare R2 — 與 n8n 共用同一套環境變數命名
R2_ACCESS_KEY = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET_KEY = os.environ.get("R2_SECRET_KEY", "")
R2_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
R2_BUCKET = os.environ.get("R2_BUCKET", "")
# 公開 URL 前綴（pub-xxxx.r2.dev 或自訂網域）；未設定則上傳完只回傳 None
R2_PUBLIC_BASE_URL = os.environ.get("R2_PUBLIC_BASE_URL", "").rstrip("/")


@dataclass
class TenderAttachment:
    """標案附件資訊"""
    filename: str = ""
    local_path: str = ""
    download_url: str = ""
    cloud_url: str = ""
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


_r2_client = None


def _get_r2_client():
    """惰性建立 boto3 S3 client，指向 Cloudflare R2 endpoint。"""
    global _r2_client
    if _r2_client is not None:
        return _r2_client
    if not (R2_ACCESS_KEY and R2_SECRET_KEY and R2_ACCOUNT_ID and R2_BUCKET):
        return None
    try:
        import boto3
        from botocore.client import Config as BotoConfig
    except ImportError:
        logger.warning("boto3 未安裝，無法上傳 R2")
        return None
    _r2_client = boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )
    return _r2_client


async def upload_to_r2(attachment: TenderAttachment) -> Optional[str]:
    """上傳檔案到 Cloudflare R2，回傳公開 URL（若有設 R2_PUBLIC_BASE_URL）。"""
    client = _get_r2_client()
    if client is None:
        logger.info("R2 未設定，略過附件上傳")
        return None

    if not attachment.local_path or not os.path.exists(attachment.local_path):
        return None

    # key 結構：brand_monitor/attachments/<filename>
    safe_name = re.sub(r"[^\w一-鿿.\-]", "_", attachment.filename)
    key = f"brand_monitor/attachments/{safe_name}"

    # 推測 Content-Type
    ext = os.path.splitext(safe_name)[1].lower()
    content_type = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".odt": "application/vnd.oasis.opendocument.text",
        ".zip": "application/zip",
    }.get(ext, "application/octet-stream")

    def _put():
        with open(attachment.local_path, "rb") as f:
            client.put_object(
                Bucket=R2_BUCKET,
                Key=key,
                Body=f.read(),
                ContentType=content_type,
            )

    try:
        await asyncio.to_thread(_put)
        if R2_PUBLIC_BASE_URL:
            url = f"{R2_PUBLIC_BASE_URL}/{key}"
            logger.info("R2 上傳完成: %s", url)
            return url
        logger.info("R2 上傳完成（無 public base URL，不回傳公開連結）: %s", key)
        return None
    except Exception as e:
        logger.warning("R2 上傳失敗: %s", e)
        return None
    finally:
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
    """完整流程：從標案 URL 解析頁面（截止日期 + 附件）並上傳 R2。"""
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
            cloud_url = await upload_to_r2(attachment)
            if cloud_url:
                attachment.cloud_url = cloud_url
            result.attachments.append(attachment)

    logger.info("標案 %s: 共處理 %d 個附件", tender_id, len(result.attachments))
    return result
