#!/usr/bin/env python3
"""
DB08 合併引擎 — 技術核心
遵守三鐵則 + 雙向relation不覆寫存活頁原有關係
"""
import os, json, time, urllib.parse, re
import urllib.request

NOTION_TOKEN = os.environ.get("NOTION_API_KEY", "")
NOTION_VERSION = "2022-06-28"
DB08_ID = "873970187f394f6b8304406745bd1579"

# ── 基礎 HTTP ──────────────────────────────────────────────

def _req(method, path, body=None, retries=4):
    url = f"https://api.notion.com/v1{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {NOTION_TOKEN}")
    req.add_header("Notion-Version", NOTION_VERSION)
    req.add_header("Content-Type", "application/json")
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            body_txt = e.read().decode()
            if e.code == 429:
                wait = 2 ** attempt
                print(f"  [rate-limit] 等 {wait}s...")
                time.sleep(wait)
                continue
            raise RuntimeError(f"HTTP {e.code}: {body_txt}")
        except Exception as ex:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
    raise RuntimeError("重試耗盡")

def get_page(pid):
    return _req("GET", f"/pages/{pid}")

def patch_page(pid, props):
    return _req("PATCH", f"/pages/{pid}", {"properties": props})

def get_db_schema(db_id):
    return _req("GET", f"/databases/{db_id}")

def get_block_children(bid):
    results, cursor = [], None
    while True:
        path = f"/blocks/{bid}/children?page_size=100"
        if cursor:
            path += f"&start_cursor={cursor}"
        data = _req("GET", path)
        results.extend(data["results"])
        if not data.get("has_more"):
            break
        cursor = data["next_cursor"]
    return results

def patch_block(bid, body):
    return _req("PATCH", f"/blocks/{bid}", body)

# ── Relation 分頁讀取（核心！每次最多 25 筆）────────────────

def get_all_relation_ids(pid, prop_name, prop_id):
    """
    用 property 分頁端點拿完整 relation 清單。
    prop_id 直接用 page 物件裡的 id（已是 URL 編碼），不可再 quote。
    """
    ids, cursor = [], None
    while True:
        path = f"/pages/{pid}/properties/{prop_id}?page_size=100"
        if cursor:
            path += f"&start_cursor={cursor}"
        try:
            data = _req("GET", path)
        except RuntimeError as e:
            print(f"  [WARN] get_all_relation_ids({prop_name}) 失敗: {e}")
            break
        items = data.get("results", []) or data.get("relation", [])
        for it in items:
            if "id" in it:
                ids.append(it["id"])
            elif isinstance(it, dict) and it.get("type") == "relation":
                ids.append(it["relation"]["id"])
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
    return list(dict.fromkeys(ids))  # 去重保序

# ── Schema 分析 ─────────────────────────────────────────────

def get_relation_schema(db_id):
    """
    回傳 {prop_name: {"id": ..., "is_dual": bool, "synced_prop_name": ...}}
    """
    schema = get_db_schema(db_id)
    result = {}
    for name, prop in schema["properties"].items():
        if prop["type"] != "relation":
            continue
        is_dual = prop["relation"].get("type") == "dual_property"
        result[name] = {
            "id": prop["id"],
            "is_dual": is_dual,
        }
    return result

# ── 頁面資料讀取 ─────────────────────────────────────────────

def page_title(page):
    for p in page["properties"].values():
        if p["type"] == "title":
            return "".join(t["plain_text"] for t in p["title"])
    return "(無標題)"

def page_prop_text(page, prop_name):
    p = page["properties"].get(prop_name)
    if not p:
        return ""
    pt = p["type"]
    if pt == "rich_text":
        return "".join(t["plain_text"] for t in p["rich_text"])
    if pt == "title":
        return "".join(t["plain_text"] for t in p["title"])
    if pt == "select" and p["select"]:
        return p["select"]["name"]
    if pt == "multi_select":
        return ", ".join(o["name"] for o in p["multi_select"])
    if pt == "status" and p["status"]:
        return p["status"]["name"]
    if pt == "number" and p["number"] is not None:
        return str(p["number"])
    if pt == "date" and p["date"]:
        return p["date"]["start"]
    return ""

def count_all_relations(page, rel_schema):
    """計算該頁所有 relation 的總引用數（用於決定存活頁）"""
    total = 0
    for name, info in rel_schema.items():
        pid = page["id"].replace("-", "")
        prop_id = info["id"]
        ids = get_all_relation_ids(pid, name, prop_id)
        total += len(ids)
    return total

# ── 核心合併邏輯 ─────────────────────────────────────────────

SINGLE_VALUE_PROPS = {"select", "status", "number", "date", "checkbox", "email", "phone_number", "url"}
SKIP_XREFS = True  # X引用/X被引 不參與同步

def is_x_ref_prop(name):
    xrefs = ["引用","被引"]
    return any(k in name for k in xrefs)

def merge_pages(survivor_id, victim_id, rel_schema, dry_run=False, conflict_log=None):
    """
    survivor: 存活頁
    victim:   消失頁（合併後標【待刪·已併入X】）
    """
    if conflict_log is None:
        conflict_log = []

    print(f"\n{'[DRY-RUN] ' if dry_run else ''}== 合併開始 ==")
    survivor = get_page(survivor_id)
    victim   = get_page(victim_id)
    s_title  = page_title(survivor)
    v_title  = page_title(victim)
    print(f"  存活：{s_title}（{survivor_id[:8]}...）")
    print(f"  消失：{v_title}（{victim_id[:8]}...）")

    props_to_patch = {}

    # ── 1. 同義備註：把 victim 標題加進存活頁 ──
    existing_note = page_prop_text(survivor, "同義備註")
    new_note_entries = [v_title]
    # 也把 victim 原有備註帶過來
    victim_note = page_prop_text(victim, "同義備註")
    if victim_note:
        for line in victim_note.split("\n"):
            line = line.strip()
            if line and line not in new_note_entries and line != s_title:
                new_note_entries.append(line)
    combined_note = existing_note
    for entry in new_note_entries:
        if entry not in combined_note:
            combined_note = (combined_note + "\n" + entry).strip()
    if combined_note != existing_note:
        props_to_patch["同義備註"] = {
            "rich_text": [{"type": "text", "text": {"content": combined_note}}]
        }
        print(f"  同義備註：{repr(combined_note)}")

    # ── 2. rich_text 欄位：合併（不覆蓋存活頁有值的）──
    for name, prop in victim["properties"].items():
        if name in ("同義備註",):
            continue
        if is_x_ref_prop(name):
            continue
        if prop["type"] == "rich_text":
            v_val = "".join(t["plain_text"] for t in prop["rich_text"])
            if not v_val:
                continue
            s_val = page_prop_text(survivor, name)
            if not s_val:
                props_to_patch[name] = {"rich_text": prop["rich_text"]}
                print(f"  填入 {name}：{v_val[:50]}")
            elif s_val != v_val:
                print(f"  [INFO] {name} 兩邊不同，保留存活頁值")

    # ── 3. 單值欄位（select/status/number/date）衝突記錄 ──
    for name, prop in victim["properties"].items():
        if is_x_ref_prop(name):
            continue
        if prop["type"] not in SINGLE_VALUE_PROPS:
            continue
        v_val = page_prop_text(victim, name)
        if not v_val:
            continue
        s_val = page_prop_text(survivor, name)
        if not s_val:
            # 存活頁空 → 帶過來
            if prop["type"] == "select" and prop["select"]:
                props_to_patch[name] = {"select": {"name": prop["select"]["name"]}}
                print(f"  填入 {name}（select）：{v_val}")
            elif prop["type"] == "status" and prop["status"]:
                props_to_patch[name] = {"status": {"name": prop["status"]["name"]}}
                print(f"  填入 {name}（status）：{v_val}")
            elif prop["type"] == "number" and prop["number"] is not None:
                props_to_patch[name] = {"number": prop["number"]}
                print(f"  填入 {name}（number）：{v_val}")
        elif s_val != v_val:
            conflict_log.append({
                "prop": name, "survivor_val": s_val, "victim_val": v_val,
                "survivor": s_title, "victim": v_title
            })
            print(f"  [衝突] {name}：存活={s_val}，消失={v_val} → 保留存活，待確認")

    # ── 4. multi_select：union ──
    for name, prop in victim["properties"].items():
        if is_x_ref_prop(name):
            continue
        if prop["type"] != "multi_select":
            continue
        v_opts = {o["name"] for o in prop["multi_select"]}
        if not v_opts:
            continue
        s_opts = {o["name"] for o in (survivor["properties"].get(name, {}).get("multi_select") or [])}
        union = s_opts | v_opts
        if union != s_opts:
            props_to_patch[name] = {"multi_select": [{"name": n} for n in sorted(union)]}
            print(f"  multi_select {name}：{sorted(union)}")

    # ── 5. Relation 處理 ──
    print(f"  == Relation 處理（{len(rel_schema)} 個）==")
    for name, info in rel_schema.items():
        if is_x_ref_prop(name):
            print(f"    跳過 X引用/被引：{name}")
            continue
        prop_id = info["id"]
        is_dual = info["is_dual"]

        # 讀 victim 的 relation ids
        v_ids = get_all_relation_ids(victim_id, name, prop_id)
        if not v_ids:
            continue

        if is_dual:
            # 雙向 relation：逐個 referrer 把指向改為存活頁
            print(f"    [dual] {name}：victim 有 {len(v_ids)} 個引用者 → 逐一改指")
            if not dry_run:
                _fix_dual_relation_referrers(v_ids, victim_id, survivor_id, name, prop_id)
        else:
            # 單向 relation：讀存活頁全量 + union + 寫回
            s_ids = get_all_relation_ids(survivor_id, name, prop_id)
            union_ids = list(dict.fromkeys(s_ids + v_ids))
            if len(union_ids) != len(s_ids):
                print(f"    [single] {name}：{len(s_ids)} + {len(v_ids)} → {len(union_ids)} 個")
                if not dry_run:
                    if len(union_ids) > 100:
                        print(f"      [WARN] 超過 100 筆（{len(union_ids)}），只取前 100")
                        union_ids = union_ids[:100]
                    patch_page(survivor_id, {
                        name: {"relation": [{"id": i} for i in union_ids]}
                    })
            else:
                print(f"    [single] {name}：已包含，跳過")

    # ── 6. 寫回存活頁（title 以外的 props）──
    if props_to_patch and not dry_run:
        print(f"  PATCH 存活頁 {len(props_to_patch)} 個欄位...")
        patch_page(survivor_id, props_to_patch)

    # ── 7. Victim 標記待刪 ──
    new_victim_title = f"【待刪·已併入{s_title}】{v_title}"
    check_note = f"已由合併腳本併入「{s_title}」({survivor_id})，請確認後刪除此頁。"
    if not dry_run:
        patch_page(victim_id, {
            "對象名稱": {"title": [{"type": "text", "text": {"content": new_victim_title}}]},
            "同義備註": {"rich_text": [{"type": "text", "text": {"content": check_note}}]},
        })
        print(f"  ✅ victim 已標記：{new_victim_title[:60]}")
    else:
        print(f"  [DRY] 會標記 victim：{new_victim_title[:60]}")

    print(f"  == 合併完成 ==\n")
    return conflict_log


def _fix_dual_relation_referrers(referrer_ids, victim_id, survivor_id, prop_name, prop_id):
    """
    對每個 referrer，把它那一側指向 victim 的 relation 改指為 survivor。
    不直接覆寫 survivor 那一側（讓 Notion dual_property 自動同步）。
    """
    for ref_id in referrer_ids:
        try:
            ref_page = get_page(ref_id)
            ref_props = ref_page.get("properties", {})

            # 找到 referrer 這邊對應的 relation prop（可能名稱不同，用 id 比對）
            target_prop_name = None
            target_prop_id = None
            for pname, pprop in ref_props.items():
                if pprop["type"] != "relation":
                    continue
                # 對應的 prop id 找出來（referrer DB 的 schema 可能不同）
                # 先試名稱完全相同，不行再靠 relation.database_id 比對
                if pname == prop_name:
                    target_prop_name = pname
                    target_prop_id = pprop.get("id", pname)
                    break

            if target_prop_name is None:
                # 找不到同名，嘗試遍歷找指向 DB08 的 relation
                for pname, pprop in ref_props.items():
                    if pprop["type"] == "relation":
                        target_prop_name = pname
                        target_prop_id = pprop.get("id", pname)
                        break

            if target_prop_name is None:
                print(f"      [WARN] referrer {ref_id[:8]} 找不到對應 relation prop，跳過")
                continue

            # 讀 referrer 目前的 relation ids
            current_ids = get_all_relation_ids(ref_id, target_prop_name, target_prop_id)
            if victim_id not in current_ids and victim_id.replace("-","") not in [i.replace("-","") for i in current_ids]:
                print(f"      [WARN] referrer {ref_id[:8]} 已不含 victim，跳過")
                continue

            # 把 victim 換成 survivor
            new_ids = []
            replaced = False
            for i in current_ids:
                if i.replace("-","") == victim_id.replace("-",""):
                    if not replaced:
                        new_ids.append(survivor_id)
                        replaced = True
                else:
                    new_ids.append(i)
            new_ids = list(dict.fromkeys(new_ids))

            if len(new_ids) > 100:
                new_ids = new_ids[:100]

            patch_page(ref_id, {
                target_prop_name: {"relation": [{"id": i} for i in new_ids]}
            })
            print(f"      改指 referrer {ref_id[:8]} OK（{len(new_ids)} 個）")
            time.sleep(0.3)

        except Exception as e:
            print(f"      [ERROR] referrer {ref_id[:8]} 失敗: {e}")
