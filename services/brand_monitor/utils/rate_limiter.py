"""Token bucket 速率限制器"""

import asyncio
import time


class RateLimiter:
    """非同步 token bucket 限速器"""

    def __init__(self, rate: float, burst: int = 1):
        self.rate = rate  # 每秒允許的請求數
        self.burst = burst
        self._tokens = float(burst)
        self._last = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last
            self._tokens = min(self.burst, self._tokens + elapsed * self.rate)
            self._last = now

            if self._tokens < 1:
                wait = (1 - self._tokens) / self.rate
                await asyncio.sleep(wait)
                self._tokens = 0
                self._last = time.monotonic()
            else:
                self._tokens -= 1
