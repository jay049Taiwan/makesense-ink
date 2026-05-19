FROM python:3.11-slim

# 系統依賴（Playwright 需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg2 \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 安裝 Python 套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 安裝 Playwright Chromium
RUN playwright install chromium

# 複製程式碼
COPY . .

# 狀態目錄（Zeabur volume 掛載點）
RUN mkdir -p /app/state
ENV STATE_DIR=/app/state
ENV TZ=Asia/Taipei

CMD ["python", "main.py"]
