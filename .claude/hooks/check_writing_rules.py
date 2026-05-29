#!/usr/bin/env python3
"""PreToolUse hook：檢查寫入內容是否違反四九既定規則。

執行原理：
- Claude 呼叫 matcher 命中的 tool 前，Claude Code 把 tool 參數 JSON 送進此 script 的 stdin
- 此 script 解析 tool_input 中所有字串、比對禁用清單與簡體字集合
- 命中 → exit 2 + stderr 寫違規明細 → Claude 收到錯誤、需重寫
- 未命中 → exit 0 → tool 正常執行

清單檔案：
- banned_phrases.txt — 禁用詞，每行一條（# 開頭為註解）；可隨時 append

新增規則流程（給四九）：
1. 抓到 Claude 亂用某個詞 → 對 Claude 說「加進 hook：XXX」
2. Claude 把 XXX append 到 banned_phrases.txt（一個 Edit 動作）
3. 下次該詞出現就被擋
"""
import json
import os
import re
import sys

HOOK_DIR = os.path.dirname(os.path.abspath(__file__))
BANNED_FILE = os.path.join(HOOK_DIR, "banned_phrases.txt")

# 簡體中文常見獨有字（高頻命中、不在繁體出現）
# 用一個 set 比對 — 命中任一字就警告
SIMPLIFIED_CHARS = set(
    "这国发会个内为来们时说见后产认识进电话么没问题应当现实际处设维护网络资讯软业务总据"
    "别质虽虑测试样确属责场长关联系该计实价值钱话听写读买卖钟头几个里边请让觉觉满"
    "听说让买卖钱钟几边请觉满觉这边样种东西决定开始结束变换转换继续办够够够"
)


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


def load_banned():
    """讀禁用清單，每行一條；# 開頭為註解、空行略過。"""
    if not os.path.exists(BANNED_FILE):
        return []
    phrases = []
    with open(BANNED_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n").rstrip("\r")
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            phrases.append(line)
    return phrases


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # 讀不到 input 就放行（不擋正常流程）

    tool_input = data.get("tool_input", {})
    texts = collect_strings(tool_input)
    full_text = "\n".join(texts)

    if not full_text.strip():
        sys.exit(0)

    violations = []

    # 規則 1：簡體中文
    simp_found = sorted({c for c in SIMPLIFIED_CHARS if c in full_text})
    if simp_found:
        violations.append(
            f"❌ 偵測到疑似簡體字：{''.join(simp_found)} — 一律用繁體中文"
        )

    # 規則 2：禁用清單
    banned = load_banned()
    hit = [p for p in banned if p in full_text]
    if hit:
        violations.append(f"❌ 觸發禁用詞清單：{hit}")

    if violations:
        sys.stderr.write("\n".join(violations) + "\n")
        sys.stderr.write(
            "（清單檔：.claude/hooks/banned_phrases.txt — 修改後立即生效）\n"
        )
        sys.exit(2)  # exit 2 = blocking error

    sys.exit(0)


if __name__ == "__main__":
    main()
