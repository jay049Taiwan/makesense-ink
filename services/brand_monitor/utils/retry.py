"""指數退避重試裝飾器"""

import asyncio
import functools
import logging

logger = logging.getLogger(__name__)

RETRYABLE_STATUS = (429, 500, 502, 503, 504)


def with_retry(max_retries: int = 3, backoff_base: float = 2.0):
    """非同步函數的指數退避重試裝飾器。

    遇到 httpx.Response 狀態碼在 RETRYABLE_STATUS 中時自動重試。
    429 會讀取 Retry-After header。
    """

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as exc:
                    last_exc = exc
                    status = getattr(exc, "status_code", None)
                    if status is None:
                        # 從 httpx response 取得
                        resp = getattr(exc, "response", None)
                        if resp is not None:
                            status = resp.status_code

                    if status not in RETRYABLE_STATUS and attempt == 0:
                        raise

                    if attempt >= max_retries:
                        raise

                    if status == 429:
                        retry_after = 5
                        resp = getattr(exc, "response", None)
                        if resp is not None:
                            retry_after = float(
                                resp.headers.get("Retry-After", "5")
                            )
                        wait = retry_after
                    else:
                        wait = backoff_base ** attempt

                    logger.warning(
                        "重試 %s 第 %d/%d 次，等待 %.1f 秒 (狀態: %s)",
                        func.__name__,
                        attempt + 1,
                        max_retries,
                        wait,
                        status,
                    )
                    await asyncio.sleep(wait)

            raise last_exc  # type: ignore

        return wrapper

    return decorator
