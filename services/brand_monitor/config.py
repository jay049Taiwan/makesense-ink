"""品牌提案情報監測系統 — 設定檔"""

import os

# === Notion ===
NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
NOTION_API_VERSION = "2022-06-28"
DB01_ID = "e2d16f2a01814d9f8adce25ed61e633c"  # 資源提案
DB05_ID = "e5f14f056c7c4b8a804304eab598fd4d"  # 登記內容
DB06_ID = "3469ff25fdab83c98ff98107ee6a6a1c"  # 清單明細（決標案資料參考）
DB08_ID = "873970187f394f6b8304406745bd1579"  # 關係對象

# === Telegram（2026/05/09 取代 Discord）===
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
NOAH_TG_USER_ID = int(os.environ.get("NOAH_TG_USER_ID", "8523155253"))

# === Discord（已退役 2026/04，保留只為 legacy code 不 import error）===
DISCORD_BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
DISCORD_OWNER_ID = 883095885662257172

# === Claude API ===
CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "")
CLAUDE_MODEL = "claude-haiku-4-5-20251001"

# === PCC API ===
# 主力：mlwmlw 社群 API（openfun.app 目前不穩定）
PCC_API_BASE = "https://pcc.mlwmlw.org/api"
# 備用
PCC_API_BACKUP = "https://pcc-api.openfun.app/api"

# === 補助來源 ===
SUBSIDY_SOURCES = {
    "文化部": {
        "url": "https://www.moc.gov.tw/content_268.html",
        "name": "文化部獎補助",
    },
    "文化部文資局": {
        "url": "https://www.boch.gov.tw/information_190_702.html",
        "name": "文化部文化資產局",
    },
    "經濟部": {
        "url": "https://www.moea.gov.tw/Mns/populace/news/News.aspx?menu_id=35315",
        "name": "經濟部公告",
    },
    "國發會": {
        "url": "https://www.ndc.gov.tw/nc_27_35689",
        "name": "國發會地方創生",
    },
    "教育部": {
        "url": "https://www.edu.tw/News_Content.aspx?n=9E7AC85F1954DDA8",
        "name": "教育部公告",
    },
    "新竹生活美學館": {
        "url": "https://www.nhclac.gov.tw/News.aspx?n=DB40B41A99C94869",
        "name": "新竹生活美學館",
    },
    "宜蘭縣政府": {
        "url": "https://www.e-land.gov.tw/News.aspx?n=61C7212DE8B7A2F2",
        "name": "宜蘭縣政府公告",
    },
    "宜蘭文化局": {
        "url": "https://culture.e-land.gov.tw/News.aspx?n=DACB3CADE9C36727",
        "name": "宜蘭縣政府文化局",
    },
}

# === 速率限制 ===
NOTION_RATE_LIMIT = 3  # 每秒請求數
PCC_RATE_LIMIT = 2

# === PCC 固定搜尋機關 ===
PCC_FIXED_ORGS = [
    "文化部",
    "經濟部",
    "國發會",
    "教育部",
    "新竹生活美學館",
    "宜蘭縣政府",
]

# === 宜蘭關鍵字（用於標記優先） ===
YILAN_KEYWORDS = [
    "宜蘭", "頭城", "礁溪", "壯圍", "員山", "羅東",
    "冬山", "五結", "蘇澳", "南澳", "大同", "三星",
]

# === 狀態檔案路徑 ===
STATE_DIR = os.environ.get("STATE_DIR", os.path.join(os.path.dirname(__file__), "state"))

# === 時區 ===
TIMEZONE = "Asia/Taipei"
