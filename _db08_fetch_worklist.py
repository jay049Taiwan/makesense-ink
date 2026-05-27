#!/usr/bin/env python3
"""
拉 worklist 頁的 B/C 類 to-do blocks，列出各組 page ID 和標題。
用法: python _db08_fetch_worklist.py
"""
import os, json, re
import sys

# 設定 token
NOTION_TOKEN = os.environ.get("NOTION_API_KEY", "")
if not NOTION_TOKEN:
    print("❌ 請先 export NOTION_API_KEY=ntn_xxx")
    sys.exit(1)

sys.path.insert(0, os.path.dirname(__file__))
from _db08_merge_engine import _req, get_block_children, get_page, page_title

WORKLIST_PAGE_ID = "36c9ff25fdab807eb479de03d45042c4"

def extract_page_ids_from_rich_text(rich_text):
    """從 rich_text 的 href 或 mention 抽出 page id (32碼無dash)"""
    ids = []
    for t in rich_text:
        # mention 類型
        if t.get("type") == "mention" and t["mention"].get("type") == "page":
            ids.append(t["mention"]["page"]["id"].replace("-",""))
        # href 中的 id
        href = t.get("href") or ""
        if href:
            # notion.so/xxx/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 格式
            m = re.search(r'([0-9a-f]{32})', href.replace("-",""))
            if m:
                ids.append(m.group(1))
        # 純文字中的 UUID
        text = t.get("plain_text", "")
        m = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', text)
        if m:
            ids.append(m.group(1).replace("-",""))
    return list(dict.fromkeys(ids))

def get_all_blocks_recursive(bid, depth=0, max_depth=5):
    """遞迴取所有 blocks（含 toggle 子塊）"""
    blocks = get_block_children(bid)
    result = []
    for b in blocks:
        result.append((depth, b))
        if b.get("has_children") and depth < max_depth:
            children = get_all_blocks_recursive(b["id"], depth+1, max_depth)
            result.extend(children)
    return result

def main():
    print("=== 拉取 worklist B/C 類 ===\n")
    all_blocks = get_all_blocks_recursive(WORKLIST_PAGE_ID)
    print(f"共 {len(all_blocks)} 個 blocks（含巢狀）\n")

    current_section = None
    sections = {"B": [], "C": [], "A": []}

    for depth, block in all_blocks:
        bt = block["type"]

        # 偵測 section heading
        if bt in ("heading_1", "heading_2", "heading_3"):
            text = "".join(t["plain_text"] for t in block[bt]["rich_text"])
            if "B類" in text or "B 類" in text:
                current_section = "B"
            elif "C類" in text or "C 類" in text:
                current_section = "C"
            elif "A類" in text or "A 類" in text:
                current_section = "A"
            else:
                current_section = None
            print(f"{'  '*depth}[Heading] {text} → section={current_section}")
            continue

        if bt == "to_do" and current_section in ("B","C"):
            checked = block["to_do"]["checked"]
            rich_text = block["to_do"]["rich_text"]
            text = "".join(t["plain_text"] for t in rich_text)
            page_ids = extract_page_ids_from_rich_text(rich_text)

            entry = {
                "block_id": block["id"],
                "checked": checked,
                "text": text,
                "page_ids": page_ids,
                "section": current_section,
                "titles": []
            }

            # 驗證並取得各頁標題
            for pid in page_ids:
                try:
                    pg = get_page(pid)
                    t = page_title(pg)
                    entry["titles"].append(t)
                except Exception as e:
                    entry["titles"].append(f"[ERROR: {e}]")

            sections[current_section].append(entry)

            status = "✅" if checked else "⬜"
            print(f"  {status} [{current_section}] {text[:60]}")
            if page_ids:
                for pid, title in zip(page_ids, entry["titles"]):
                    print(f"       → {pid[:8]}... 《{title}》")
            else:
                print(f"       → (無 page id)")

    # 輸出摘要
    print("\n\n=== B 類摘要 ===")
    for i, e in enumerate(sections["B"]):
        status = "✅" if e["checked"] else "⬜"
        print(f"{i+1:2}. {status} {e['text'][:70]}")
        for pid, title in zip(e["page_ids"], e["titles"]):
            print(f"      {pid} 《{title}》")

    print("\n=== C 類摘要 ===")
    for i, e in enumerate(sections["C"]):
        status = "✅" if e["checked"] else "⬜"
        print(f"{i+1:2}. {status} {e['text'][:70]}")
        for pid, title in zip(e["page_ids"], e["titles"]):
            print(f"      {pid} 《{title}》")

    # 存到 JSON 供 runner 使用
    out = {"B": sections["B"], "C": sections["C"]}
    with open("_db08_worklist_cache.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("\n✅ 已存 _db08_worklist_cache.json")

if __name__ == "__main__":
    main()
