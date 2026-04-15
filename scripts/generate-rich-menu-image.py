#!/usr/bin/env python3
"""
產生 LINE Rich Menu 圖片（2500 x 1686）
6 格按鈕：選書選物 / 近期活動 / 觀點漫遊 / 確認結帳 / 會員中心 / 問問我們

用法：python3 scripts/generate-rich-menu-image.py
輸出：public/images/rich-menu.png
"""

from PIL import Image, ImageDraw, ImageFont
import os

W, H = 2500, 1686
COLS, ROWS = 3, 2
CELL_W, CELL_H = W // COLS, H // ROWS

# 品牌色
BG_TOP = "#7a5c40"      # 旅人書店棕
BG_BOT = "#2D5A3F"      # 深綠
DIVIDER = "#5a4530"
TEXT_COLOR = "#ffffff"
SUBTITLE_COLOR = "#d4c5b0"

# 6 格內容
BUTTONS = [
    {"emoji": "📚", "label": "選書選物", "sub": "Books & Goods", "bg": BG_TOP},
    {"emoji": "🎪", "label": "活動體驗", "sub": "Events", "bg": "#4ECDC4"},
    {"emoji": "🗺️", "label": "觀點漫遊", "sub": "Viewpoints", "bg": BG_TOP},
    {"emoji": "🛒", "label": "確認結帳", "sub": "Checkout", "bg": BG_BOT},
    {"emoji": "📮", "label": "地方通訊", "sub": "Newsletter", "bg": "#4A7C59"},
    {"emoji": "👤", "label": "會員中心", "sub": "My Account", "bg": BG_BOT},
]


def find_font(size):
    """嘗試找系統中文字體"""
    candidates = [
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                continue
    return ImageFont.load_default()


def find_emoji_font(size):
    """嘗試找 emoji 字體"""
    candidates = [
        "/System/Library/Fonts/Apple Color Emoji.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                continue
    return None


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def main():
    img = Image.new("RGB", (W, H), hex_to_rgb(BG_TOP))
    draw = ImageDraw.Draw(img)

    label_font = find_font(72)
    sub_font = find_font(42)

    for idx, btn in enumerate(BUTTONS):
        col = idx % COLS
        row = idx // COLS
        x0 = col * CELL_W
        y0 = row * CELL_H
        x1 = x0 + CELL_W
        y1 = y0 + CELL_H

        # 背景
        draw.rectangle([x0, y0, x1, y1], fill=hex_to_rgb(btn["bg"]))

        # 格線
        if col < COLS - 1:
            draw.line([(x1, y0), (x1, y1)], fill=hex_to_rgb("#ffffff"), width=3)
        if row < ROWS - 1:
            draw.line([(x0, y1), (x1, y1)], fill=hex_to_rgb("#ffffff"), width=3)

        cx = x0 + CELL_W // 2
        cy = y0 + CELL_H // 2

        # Emoji（用文字代替，因為 emoji 字體不一定能用）
        emoji_text = btn["emoji"]
        # 嘗試畫 emoji
        emoji_font = find_emoji_font(120)
        if emoji_font:
            try:
                bbox = draw.textbbox((0, 0), emoji_text, font=emoji_font)
                ew = bbox[2] - bbox[0]
                draw.text((cx - ew // 2, cy - 200), emoji_text, font=emoji_font, fill=TEXT_COLOR)
            except:
                # fallback: 畫一個圓形圖示
                draw.ellipse([cx - 60, cy - 210, cx + 60, cy - 90], fill=hex_to_rgb("#ffffff"), outline=None)
        else:
            # fallback: 畫圓形圖示
            draw.ellipse([cx - 60, cy - 210, cx + 60, cy - 90], fill=hex_to_rgb("#ffffff"), outline=None)

        # 中文標題
        bbox = draw.textbbox((0, 0), btn["label"], font=label_font)
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, cy - 20), btn["label"], font=label_font, fill=TEXT_COLOR)

        # 英文副標題
        bbox = draw.textbbox((0, 0), btn["sub"], font=sub_font)
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, cy + 80), btn["sub"], font=sub_font, fill=hex_to_rgb(SUBTITLE_COLOR))

    # 確保輸出目錄存在
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "images")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "rich-menu.png")

    img.save(out_path, "PNG")
    print(f"✅ Rich Menu 圖片已產生: {out_path}")
    print(f"   尺寸: {W} x {H}")
    print(f"   大小: {os.path.getsize(out_path) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
