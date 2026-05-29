#!/usr/bin/env python3
"""PreToolUse hook：檢查寫入內容是否違反四九既定規則。

執行原理：
- Claude 呼叫 matcher 命中的 tool 前，Claude Code 把 tool 參數 JSON 送進此 script 的 stdin
- 此 script 解析 tool_input 中所有字串、比對禁用清單與簡體字集合
- 命中 → exit 2 + stderr 寫違規明細 → Claude 收到錯誤、需重寫
- 未命中 → exit 0 → tool 正常執行

清單檔案：
- banned_phrases.txt — 禁用詞，每行一條（# 開頭為註解）；可隨時 append
- banned_chars.txt — 簡體字字集，整檔每個字算一條；可隨時編輯

新增規則流程（給四九）：
1. 抓到 Claude 亂用某個詞 → 對 Claude 說「加進 hook：XXX」
2. Claude 把 XXX append 到 banned_phrases.txt（一個 Edit 動作）
3. 下次該詞出現就被擋
"""
import json
import os
import sys

HOOK_DIR = os.path.dirname(os.path.abspath(__file__))
BANNED_PHRASES_FILE = os.path.join(HOOK_DIR, "banned_phrases.txt")
BANNED_CHARS_FILE = os.path.join(HOOK_DIR, "banned_chars.txt")
SELF_PATH = os.path.abspath(__file__)


def collect_strings(obj):
    """遞迴收集 obj 內所有字串。"""
    out = []
    if isinstance(obj, str):
        out.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            out.extend(collect_strings(v))
    elif isinstance(obj, list):
        for item in obj:
            out.extend(collect_strings(item))
    return out


def load_banned_phrases():
    """讀禁用清單，每行一條；# 開頭為註解、空行略過。"""
    if not os.path.exists(BANNED_PHRASES_FILE):
        return []
    phrases = []
    with open(BANNED_PHRASES_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n").rstrip("\r")
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            phrases.append(line)
    return phrases


def load_banned_chars():
    """讀簡體字字集 — 整檔所有非空白字元都算。"""
    if not os.path.exists(BANNED_CHARS_FILE):
        return set()
    with open(BANNED_CHARS_FILE, encoding="utf-8") as f:
        text = f.read()
    return set(c for c in text if not c.isspace())


def is_self_edit(tool_input):
    """判斷 tool_input 是不是在編輯 hook 自身檔案（避免自我封鎖）。"""
    paths = []
    for key in ("file_path", "path", "filename"):
        v = tool_input.get(key)
        if isinstance(v, str):
            paths.append(os.path.abspath(v))
    return any(p == SELF_PATH or p.startswith(HOOK_DIR + os.sep) for p in paths)


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # 讀不到 input 就放行

    tool_input = data.get("tool_input", {})

    # 編輯 hook 自身 → 放行，避免自我封鎖
    if is_self_edit(tool_input):
        sys.exit(0)

    texts = collect_strings(tool_input)
    full_text = "\n".join(texts)

    if not full_text.strip():
        sys.exit(0)

    violations = []

    # 規則 1：簡體中文
    simp_chars = load_banned_chars()
    simp_found = sorted({c for c in simp_chars if c in full_text})
    if simp_found:
        violations.append(
            f"❌ 偵測到疑似簡體字：{''.join(simp_found)} — 一律用繁體中文"
        )

    # 規則 2：禁用詞清單
    banned = load_banned_phrases()
    hit = [p for p in banned if p in full_text]
    if hit:
        violations.append(f"❌ 觸發禁用詞清單：{hit}")

    if violations:
        sys.stderr.write("\n".join(violations) + "\n")
        sys.stderr.write(
            "（清單檔：.claude/hooks/banned_phrases.txt / banned_chars.txt — 修改後立即生效）\n"
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
