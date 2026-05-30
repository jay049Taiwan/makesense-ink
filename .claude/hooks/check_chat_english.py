#!/usr/bin/env python3
"""Stop hook：檢查 assistant 最新訊息英文後是否附中文括號（如 Dog（狗））。

執行原理：
- Claude 回覆完成觸發 stop event → Claude Code 把 transcript_path 送進此 script 的 stdin
- 此 script 讀 transcript 最後一條 assistant message
- 偵測英文單字（≥3 字母），檢查後面 30 字內是否有中文括號開啟，或在白名單
- 違規 → exit 2 + stderr 寫違規清單 → Claude 收到後重新輸出

白名單檔案：.claude/hooks/english_whitelist.txt（每行一條、大小寫不敏感）

擴充白名單流程（給四九）：
1. 抓到 Claude 用了 X 沒附中文又不該被擋 → 對 Claude 說「加進白名單：X」
2. Claude append 一行到 english_whitelist.txt
3. 下次該詞出現就放行
"""
import json
import os
import re
import sys

HOOK_DIR = os.path.dirname(os.path.abspath(__file__))
WHITELIST_FILE = os.path.join(HOOK_DIR, "english_whitelist.txt")

# 英文 token regex：≥3 字母，可含數字／連字號／底線／點
ENGLISH_TOKEN = re.compile(r"[A-Za-z][A-Za-z0-9_\-]{2,}")

# 後接窗格內若有「（」就算附了中文括號
CHECK_WINDOW = 30


def load_whitelist():
    if not os.path.exists(WHITELIST_FILE):
        return set()
    out = set()
    with open(WHITELIST_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            out.add(line.lower())
    return out


def strip_uncheckable(text):
    """移除不檢查的區塊：程式碼塊、行內代碼、URL、markdown link 的 URL 部分。"""
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"`[^`]+`", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"https?://\S+", "", text)
    return text


def extract_last_assistant_text(transcript_path):
    if not os.path.exists(transcript_path):
        return ""
    last_text = ""
    with open(transcript_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except Exception:
                continue
            if entry.get("type") != "assistant":
                continue
            msg = entry.get("message", {})
            content = msg.get("content", [])
            texts = []
            if isinstance(content, str):
                texts.append(content)
            elif isinstance(content, list):
                for c in content:
                    if isinstance(c, dict) and c.get("type") == "text":
                        texts.append(c.get("text", ""))
            if texts:
                last_text = "\n".join(texts)
    return last_text


def has_chinese_paren_after(text, pos):
    after = text[pos:pos + CHECK_WINDOW]
    return "（" in after


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    transcript_path = data.get("transcript_path", "")
    if not transcript_path:
        sys.exit(0)

    text = extract_last_assistant_text(transcript_path)
    if not text.strip():
        sys.exit(0)

    clean = strip_uncheckable(text)
    whitelist = load_whitelist()

    violations = []
    for match in ENGLISH_TOKEN.finditer(clean):
        word = match.group()
        if word.lower() in whitelist:
            continue
        # 純數字或 N+N 之類也跳過
        if not any(c.isalpha() for c in word):
            continue
        if has_chinese_paren_after(clean, match.end()):
            continue
        violations.append(word)

    if violations:
        unique = sorted(set(violations))
        sys.stderr.write(
            f"❌ 對話違規：英文字後沒接中文括號（規則：英文 → 中文（如 Dog（狗）））\n"
        )
        sys.stderr.write(f"違規詞：{unique}\n")
        sys.stderr.write(
            "處理：(1) 改寫成「英文（中文）」格式 ／ (2) 若是固定術語請四九說「加進白名單：X」\n"
        )
        sys.stderr.write(
            "白名單檔：.claude/hooks/english_whitelist.txt — 修改後立即生效\n"
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
