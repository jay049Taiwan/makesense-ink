#!/usr/bin/env python3
"""
DB08 B/C 類互動式合併執行器

用法:
  # 第一步：先拉 worklist（會產生 _db08_worklist_cache.json）
  python _db08_fetch_worklist.py

  # 第二步：執行 B 類互動合併
  python _db08_bc_runner.py B

  # 第二步（或）：把 C 類全部打勾（不合併）
  python _db08_bc_runner.py C-check

  # 合併單組（直接指定 survivor + victim page id）
  python _db08_bc_runner.py merge SURVIVOR_ID VICTIM_ID

  # 乾跑（只顯示不實際修改）
  python _db08_bc_runner.py B --dry-run
  python _db08_bc_runner.py merge SURVIVOR_ID VICTIM_ID --dry-run
"""
import os, sys, json, time

NOTION_TOKEN = os.environ.get("NOTION_API_KEY", "")
if not NOTION_TOKEN:
    print("❌ 請先 export NOTION_API_KEY=ntn_xxx")
    sys.exit(1)

sys.path.insert(0, os.path.dirname(__file__))
from _db08_merge_engine import (
    _req, get_page, patch_page, patch_block,
    page_title, get_relation_schema, merge_pages, count_all_relations,
    DB08_ID
)

WORKLIST_CACHE = "_db08_worklist_cache.json"
CONFLICT_LOG   = "_db08_conflicts.json"

# ── 輔助 ────────────────────────────────────────────────────

def load_cache():
    if not os.path.exists(WORKLIST_CACHE):
        print(f"❌ 找不到 {WORKLIST_CACHE}，請先執行 python _db08_fetch_worklist.py")
        sys.exit(1)
    with open(WORKLIST_CACHE, encoding="utf-8") as f:
        return json.load(f)

def save_conflicts(conflicts):
    existing = []
    if os.path.exists(CONFLICT_LOG):
        with open(CONFLICT_LOG, encoding="utf-8") as f:
            existing = json.load(f)
    existing.extend(conflicts)
    with open(CONFLICT_LOG, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

def check_todo(block_id):
    """把 worklist 上的 to-do block 打勾"""
    try:
        patch_block(block_id, {"to_do": {"checked": True}})
        print(f"  ✅ worklist 打勾 OK（{block_id[:8]}）")
    except Exception as e:
        print(f"  [WARN] worklist 打勾失敗: {e}")

def pick_survivor(pid1, pid2, rel_schema):
    """關係數多的當存活頁；相同則問使用者"""
    print("  計算各頁關係數（可能需要 30s）...")
    p1 = get_page(pid1)
    p2 = get_page(pid2)
    t1 = page_title(p1)
    t2 = page_title(p2)

    # 先用頁面 properties 裡 relation 的長度快速估計
    c1 = sum(len(v.get("relation", [])) for v in p1["properties"].values() if v["type"] == "relation")
    c2 = sum(len(v.get("relation", [])) for v in p2["properties"].values() if v["type"] == "relation")

    print(f"  《{t1}》({pid1[:8]}...) 關係≥{c1}")
    print(f"  《{t2}》({pid2[:8]}...) 關係≥{c2}")

    if c1 > c2:
        return pid1, pid2, t1, t2
    elif c2 > c1:
        return pid2, pid1, t2, t1
    else:
        print("  兩頁關係數相同，請選擇存活頁：")
        print(f"  1) 《{t1}》 ({pid1})")
        print(f"  2) 《{t2}》 ({pid2})")
        while True:
            ans = input("  輸入 1 或 2：").strip()
            if ans == "1":
                return pid1, pid2, t1, t2
            elif ans == "2":
                return pid2, pid1, t2, t1

def verify_page_ids(ids):
    """驗證頁面確實存在且在 DB08"""
    verified = []
    for pid in ids:
        pid = pid.replace("-","")
        try:
            pg = get_page(pid)
            t = page_title(pg)
            if pg.get("archived"):
                print(f"  [WARN] {pid[:8]}... 《{t}》已 archived，跳過")
                continue
            print(f"  ✓ {pid[:8]}... 《{t}》")
            verified.append(pid)
        except Exception as e:
            print(f"  [ERROR] {pid[:8]}... 無法存取: {e}")
    return verified

# ── 模式：B 類互動合併 ───────────────────────────────────────

def run_B(dry_run=False):
    cache = load_cache()
    entries = [e for e in cache["B"] if not e["checked"]]
    print(f"B 類未完成：{len(entries)} 組\n")

    rel_schema = get_relation_schema(DB08_ID)
    print(f"DB08 schema：{len(rel_schema)} 個 relation 欄位\n")

    all_conflicts = []

    for idx, entry in enumerate(entries):
        print(f"\n{'='*60}")
        print(f"B[{idx+1}/{len(entries)}] {entry['text'][:80]}")
        print(f"  page_ids: {entry['page_ids']}")
        print(f"  titles:   {entry['titles']}")
        print(f"  block_id: {entry['block_id']}")

        pids = entry["page_ids"]
        if len(pids) < 2:
            print("  ⚠️  少於 2 個 page id，請手動處理")
            ans = input("  標記此組為完成？(y/N) ").strip().lower()
            if ans == "y" and not dry_run:
                check_todo(entry["block_id"])
            continue

        # 多個 page → 驗證
        print(f"  驗證 {len(pids)} 個頁面...")
        valid_pids = verify_page_ids(pids)
        if len(valid_pids) < 2:
            print("  ⚠️  有效頁面不足 2 個，跳過")
            continue

        # 三頁以上：讓使用者指定存活頁
        if len(valid_pids) > 2:
            print(f"  此組有 {len(valid_pids)} 個頁面，請選擇存活頁：")
            for i, pid in enumerate(valid_pids):
                pg = get_page(pid)
                print(f"  {i+1}) {pid} 《{page_title(pg)}》")
            while True:
                ans = input(f"  輸入存活頁序號 (1-{len(valid_pids)})：").strip()
                try:
                    si = int(ans) - 1
                    if 0 <= si < len(valid_pids):
                        break
                except:
                    pass
            survivor_id = valid_pids[si]
            victim_ids = [p for p in valid_pids if p != survivor_id]
            s_pg = get_page(survivor_id)
            s_title = page_title(s_pg)
        else:
            survivor_id, victim_id_tmp, s_title, _ = pick_survivor(valid_pids[0], valid_pids[1], rel_schema)
            victim_ids = [victim_id_tmp]

        print(f"\n  存活頁：《{s_title}》 ({survivor_id})")
        for v in victim_ids:
            vt = page_title(get_page(v))
            print(f"  消失頁：《{vt}》 ({v})")

        # 確認是否繼續
        action = input("\n  [M]合併 / [S]跳過 / [Q]退出？").strip().upper()
        if action == "Q":
            print("  已退出")
            break
        if action != "M":
            print("  跳過")
            continue

        # 逐一合併（一個存活頁，可能多個消失頁）
        for victim_id in victim_ids:
            conflicts = merge_pages(survivor_id, victim_id, rel_schema, dry_run=dry_run)
            all_conflicts.extend(conflicts)
            if not dry_run:
                time.sleep(0.5)

        # 打勾 worklist
        if not dry_run:
            check_todo(entry["block_id"])
            time.sleep(0.3)

    if all_conflicts:
        save_conflicts(all_conflicts)
        print(f"\n⚠️  共 {len(all_conflicts)} 個單值衝突，已存 {CONFLICT_LOG}")
        print("衝突明細：")
        for c in all_conflicts:
            print(f"  {c['prop']}: 存活={c['survivor_val']} vs 消失={c['victim_val']}")

    print("\n✅ B 類處理完畢")

# ── 模式：C 類只打勾 ────────────────────────────────────────

def run_C_check(dry_run=False):
    cache = load_cache()
    entries = [e for e in cache["C"] if not e["checked"]]
    print(f"C 類未完成：{len(entries)} 組（只打勾，不合併）\n")

    for idx, entry in enumerate(entries):
        print(f"C[{idx+1}/{len(entries)}] {entry['text'][:80]}")
        ans = input("  確認此組不需合併，打勾？(y/N/q) ").strip().lower()
        if ans == "q":
            break
        if ans == "y" and not dry_run:
            check_todo(entry["block_id"])
            time.sleep(0.3)

    print("\n✅ C 類處理完畢")

# ── 模式：合併單組 ───────────────────────────────────────────

def run_merge_one(survivor_id, victim_id, dry_run=False):
    rel_schema = get_relation_schema(DB08_ID)
    print(f"DB08 schema：{len(rel_schema)} 個 relation 欄位")

    # 驗證
    print("驗證頁面...")
    survivor_id = survivor_id.replace("-","")
    victim_id   = victim_id.replace("-","")
    sg = get_page(survivor_id)
    vg = get_page(victim_id)
    print(f"  存活：《{page_title(sg)}》")
    print(f"  消失：《{page_title(vg)}》")

    ans = input("確認合併？(y/N) ").strip().lower()
    if ans != "y":
        print("已取消")
        return

    conflicts = merge_pages(survivor_id, victim_id, rel_schema, dry_run=dry_run)
    if conflicts:
        save_conflicts(conflicts)
        print(f"⚠️  {len(conflicts)} 個單值衝突，已存 {CONFLICT_LOG}")

# ── 主程式 ───────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    args = [a for a in args if a != "--dry-run"]

    if not args:
        print(__doc__)
        sys.exit(0)

    mode = args[0].upper()

    if mode == "B":
        run_B(dry_run=dry_run)
    elif mode == "C-CHECK":
        run_C_check(dry_run=dry_run)
    elif mode == "MERGE" and len(args) == 3:
        run_merge_one(args[1], args[2], dry_run=dry_run)
    else:
        print("❌ 不認識的參數，請看說明：")
        print(__doc__)

if __name__ == "__main__":
    main()
