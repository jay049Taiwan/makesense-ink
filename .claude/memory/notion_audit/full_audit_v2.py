#!/usr/bin/env python3
"""完整重複檢查 v2 — 9 個 DB，含 option 跨欄位重複 + 欄位名語意撞名 + 欄位內潛在問題"""
import json
import re
from collections import defaultdict

# Inline DBs (small enough to embed)
INLINE = {
    'DB01': {
        '參與屬性': ('select', ['學校委託', '後續擴充', '民間委託', '小額採購', '公開招標', '獎補助', '委託專業服務', '委託服務採購', '勞務採購']),
        '提案類型': ('select', ['承攬申請', '委託參與', '自提自辦']),
    },
    'DB02': {
        '管考類型': ('select', ['對應民間', '對應公部門', '對應自提']),
    },
    'DB03': {
        '項目類型': ('select', ['自辦', '委外']),
    },
    'DB07': {
        '主要材質': ('multi_select', ['木質材料', '紙', '陶', '布', '銀', '玻璃']),
        '商品選項': ('select', ['選書', '選物', '數位']),
        '庫存類型': ('select', ['商品', '耗材', '設備']),
        '數位細項': ('select', ['內容', '貼圖', '票券']),
        '耗材選項': ('select', ['工作辦公', '包裝零件', '獎禮贈品']),
        '設備選項': ('select', ['辦公設備', '活動設備', '餐飲設備', '陳列收藏']),
        '製造產地': ('select', ['宜蘭', '國產', '泰國']),
        '進貨屬性': ('select', ['自營產品', '批售產品', '聯名產品', '其他']),
        '選書細項': ('select', ['書籍刊物', '地圖海報', '筆記本', '明信片']),
        '選物細項': ('select', ['生活用品', '身體用品', '居家雜貨', '文具玩具', '植物', '數位影音', '藝術品', '服裝飾品', '隨身收納']),
        '辦公細類': ('select', ['紙筆文具', '膠帶貼紙', '衛生紙', '垃圾袋', '紙袋', '清潔劑', '抹布', '掃刷抹擦', '郵票', '公關禮品']),
        '辦公設備細項': ('select', ['單人用品', '公共用品']),
        '餐飲設備細項': ('select', ['3C家電', '佈置收藏', '餐具']),
        '成品尺寸': ('select', ['長18cm寬80cm高9cm（範例）', 'A2大小']),
        '首發年份': ('select', ['2014', '2023', '2016', '2015', '2018', '2021', '2022', '2019', '2024']),
    },
    'DB09': {
        '紀錄類型': ('select', ['Day', 'Week', 'Month', 'Season', 'Year', '歷史事件']),
    },
}

FILES = {
    'DB04': '/Users/jay049/.claude/projects/-Users-jay049-Documents-------/b362e196-526e-4221-b288-6046cd6f7d09/tool-results/mcp-73449d04-01f2-4d79-b0b5-908d1d64b42d-fetch-1778154642993.txt',
    'DB05': '/Users/jay049/.claude/projects/-Users-jay049-Documents-------/b362e196-526e-4221-b288-6046cd6f7d09/tool-results/mcp-73449d04-01f2-4d79-b0b5-908d1d64b42d-fetch-1778154646662.txt',
    'DB06': '/Users/jay049/.claude/projects/-Users-jay049-Documents-------/b362e196-526e-4221-b288-6046cd6f7d09/tool-results/mcp-73449d04-01f2-4d79-b0b5-908d1d64b42d-fetch-1778154651134.txt',
    'DB08': '/Users/jay049/.claude/projects/-Users-jay049-Documents-------/b362e196-526e-4221-b288-6046cd6f7d09/tool-results/mcp-73449d04-01f2-4d79-b0b5-908d1d64b42d-fetch-1778154658013.txt',
}

# all_db: db -> {field: (type, options or None)}
all_db = {}

for db, fields in INLINE.items():
    all_db[db] = {}
    for fname, (ftype, opts) in fields.items():
        all_db[db][fname] = (ftype, opts)

for db, fpath in FILES.items():
    d = json.load(open(fpath))
    t = d[0]['text']
    i = t.find('<data-source-state>') + len('<data-source-state>')
    j = t.find('</data-source-state>')
    raw = t[i:j].strip()
    fixed = raw.encode().decode('unicode_escape').encode('latin-1','ignore').decode('utf-8','ignore')
    state = json.loads(fixed)
    schema = state.get('schema', {})
    all_db[db] = {}
    for name, info in schema.items():
        ty = info.get('type','')
        if ty in ('select', 'multi_select'):
            opts = [o['name'] for o in info.get('options', [])]
            all_db[db][name] = (ty, opts)
        else:
            all_db[db][name] = (ty, None)

# === A. Option 跨欄位重複 ===
opt_to_loc = defaultdict(list)
for db, fields in all_db.items():
    for fname, (ftype, opts) in fields.items():
        if opts is None:
            continue
        for o in opts:
            opt_to_loc[o].append((db, fname, ftype))

# === B. 同 DB 內，2 個 select 欄位 option 重疊 ===
same_db_overlaps = []
for db, fields in all_db.items():
    sel_fields = [(n, opts) for n, (ty, opts) in fields.items() if opts is not None]
    for i in range(len(sel_fields)):
        for j in range(i+1, len(sel_fields)):
            a_n, a_o = sel_fields[i]
            b_n, b_o = sel_fields[j]
            common = set(a_o) & set(b_o)
            if common:
                same_db_overlaps.append((db, a_n, b_n, sorted(common)))

# === C. 殭屍 select (options=[]) ===
zombies = []
for db, fields in all_db.items():
    for fname, (ftype, opts) in fields.items():
        if opts is not None and len(opts) == 0:
            zombies.append((db, fname, ftype))

# === D. 跨 DB 同名欄位（field name dup） ===
fname_to_dbs = defaultdict(list)
for db, fields in all_db.items():
    for fname, (ftype, opts) in fields.items():
        fname_to_dbs[fname].append((db, ftype, opts))

# 過濾「合理跨 DB 共用名」（系統欄位、relation、rollup 等通常 OK）
SYSTEM_FIELD_OK = {
    'ai_meta', 'ai企劃', 'ai分析', 'ai搜查', 'ai文案', 'ai聯想', 'ai進度',
    'ai企劃備註', 'ai分析備註', 'ai搜查備註', 'ai文案備註', 'ai聯想備註', 'ai進度備註',
    'ai_對應對象', 'ai_對應標籤', 'ai_對應作者', 'ai_對應發行',
    '建立時間', '更新時間', '創建者', '最後編輯',
    '簡介摘要', '對應連結', '執行備註', '責任執行', '提煉分析',
    '檢核狀態', '封存狀態', '發佈狀態', '執行狀態',
    '對應提案', '對應管考', '對應項目', '對應協作', '對應明細', '對應庫存', '對應對象', '對應標籤', '對應表單',
    '對應建立日期', '對應截止日期', '對應起算日期', '對應執行日期',
    '備查封存', '對應封存', '內容引用', '對應交接',
    '提案引用', '管考引用', '項目引用', '協作引用', '內容引用',
    '明細引用', '庫存引用', '對象引用', '日期引用',
    # 2026/05/08 新增 9 個 X被引（DB05 三層 relation 第三層；AI 廣撒寫入 + 人工裁切）
    '提案被引', '管考被引', '項目被引', '協作被引', '內容被引',
    '明細被引', '庫存被引', '對象被引', '日期被引',
    '截止時間', '執行時間', '起算日期',
    '資料檢核',
}

# 找出跨 DB 同名 select 欄位（option 不一致 = 風險）
inconsistent_fname = []
for fname, locs in fname_to_dbs.items():
    if fname in SYSTEM_FIELD_OK:
        continue
    if len(locs) < 2:
        continue
    # 是否有 select/multi 型態的
    sel_locs = [(d, ty, opts) for d, ty, opts in locs if opts is not None]
    if len(sel_locs) >= 2:
        # 檢查 options 是否一致
        opt_sets = [tuple(sorted(opts)) for d, ty, opts in sel_locs]
        types = [ty for d, ty, opts in sel_locs]
        if len(set(opt_sets)) == 1 and len(set(types)) == 1:
            kind = "完全鏡像"  # 內容一樣 — 高度可能該保留一個
        else:
            kind = "不同步"  # 同名但內容/型態不一致 — 危險
        inconsistent_fname.append((fname, sel_locs, kind))

print("="*80)
print("REPORT v2 — 重複檢查（option 級 + 欄位名級）")
print("="*80)

print("\n## A. 同 DB 內 select 欄位之間 option 重疊（最該決策）")
seen_pairs = set()
for db, a, b, common in sorted(same_db_overlaps):
    key = (db, tuple(sorted([a, b])))
    if key in seen_pairs:
        continue
    seen_pairs.add(key)
    print(f"  [{db}] {a} ⇌ {b} :: 共用 {common}")

print(f"\n  小計: {len(same_db_overlaps)} 對")

print("\n## B. 殭屍 select（options 為空）")
for db, fname, ftype in sorted(zombies):
    print(f"  [{db}] {fname} ({ftype})")
print(f"\n  小計: {len(zombies)} 個")

print("\n## C. 跨 DB 同名 select（鏡像或不同步）")
for fname, locs, kind in sorted(inconsistent_fname):
    print(f"\n  「{fname}」 {kind}")
    for d, ty, opts in locs:
        print(f"    - {d} [{ty}] {len(opts)}項: {opts[:5]}{'...' if len(opts)>5 else ''}")
print(f"\n  小計: {len(inconsistent_fname)} 個欄位名")

print("\n## D. Option 跨欄位/跨 DB 重複 (前 30 名)")
sorted_opts = sorted(opt_to_loc.items(), key=lambda x: -len(set((d,f) for d,f,t in x[1])))
shown = 0
for opt, locs in sorted_opts:
    uniq = set((d,f) for d,f,t in locs)
    if len(uniq) < 2:
        continue
    if shown >= 30:
        break
    shown += 1
    print(f"\n  「{opt}」出現於 {len(uniq)} 處：")
    for d, f, t in locs:
        print(f"    - {d}.{f} [{t}]")
