#!/usr/bin/env python3
"""Find duplicate select/multi_select option values across DB01-09."""
import json
from collections import defaultdict

# DB01/02/03/07/09 — small enough, hardcoded from inline fetches
HARDCODED = {
    'DB01': {
        '參與屬性': ['學校委託', '後續擴充', '民間委託', '小額採購', '公開招標', '獎補助', '委託專業服務', '委託服務採購', '勞務採購'],
        '提案類型': ['承攬申請', '委託參與', '自提自辦'],
    },
    'DB02': {
        '管考類型': ['對應民間', '對應公部門', '對應自提'],
    },
    'DB03': {
        '項目類型': ['自辦', '委外'],
    },
    'DB07': {
        '主要材質(multi)': ['木質材料', '紙', '陶', '布', '銀', '玻璃'],
        '商品選項': ['選書', '選物', '數位'],
        '庫存類型': ['商品', '耗材', '設備'],
        '數位細項': ['內容', '貼圖', '票券'],
        '耗材選項': ['工作辦公', '包裝零件', '獎禮贈品'],
        '設備選項': ['辦公設備', '活動設備', '餐飲設備', '陳列收藏'],
        '製造產地': ['宜蘭', '國產', '泰國'],
        '進貨屬性': ['自營產品', '批售產品', '聯名產品', '其他'],
        '選書細項': ['書籍刊物', '地圖海報', '筆記本', '明信片'],
        '選物細項': ['生活用品', '身體用品', '居家雜貨', '文具玩具', '植物', '數位影音', '藝術品', '服裝飾品', '隨身收納'],
        '辦公細類': ['紙筆文具', '膠帶貼紙', '衛生紙', '垃圾袋', '紙袋', '清潔劑', '抹布', '掃刷抹擦', '郵票', '公關禮品'],
        '辦公設備屬性': ['3C家電', '佈置收藏', '餐具'],
        '餐飲設備屬性': ['3C家電', '佈置收藏', '餐具'],
        '成品尺寸': ['長18cm寬80cm高9cm（範例）', 'A2大小'],
        '首發年份': ['2014', '2023', '2016', '2015', '2018', '2021', '2022', '2019', '2024'],
    },
    'DB09': {
        '紀錄類型': ['Day', 'Week', 'Month', 'Season', 'Year', '歷史事件'],
    },
}

# DB04/05/06/08 — parse from saved files
FILES = {
    'DB04': '/Users/jay049/.claude/projects/-Users-jay049-Documents-------/b362e196-526e-4221-b288-6046cd6f7d09/tool-results/mcp-73449d04-01f2-4d79-b0b5-908d1d64b42d-fetch-1778147158908.txt',
    'DB05': '/Users/jay049/.claude/projects/-Users-jay049-Documents-------/b362e196-526e-4221-b288-6046cd6f7d09/tool-results/mcp-73449d04-01f2-4d79-b0b5-908d1d64b42d-fetch-1778147163187.txt',
    'DB06': '/Users/jay049/.claude/projects/-Users-jay049-Documents-------/b362e196-526e-4221-b288-6046cd6f7d09/tool-results/mcp-73449d04-01f2-4d79-b0b5-908d1d64b42d-fetch-1778147168384.txt',
    'DB08': '/Users/jay049/.claude/projects/-Users-jay049-Documents-------/b362e196-526e-4221-b288-6046cd6f7d09/tool-results/mcp-73449d04-01f2-4d79-b0b5-908d1d64b42d-fetch-1778147174971.txt',
}

all_opts = defaultdict(list)  # option_value -> [(DB, field, type), ...]

# ingest hardcoded
for db, fields in HARDCODED.items():
    for fname, opts in fields.items():
        for o in opts:
            all_opts[o].append((db, fname.replace('(multi)',''), 'multi' if '(multi)' in fname else 'select'))

# ingest files
for db, fpath in FILES.items():
    d = json.load(open(fpath))
    t = d[0]['text']
    i = t.find('<data-source-state>') + len('<data-source-state>')
    j = t.find('</data-source-state>')
    raw = t[i:j].strip()
    fixed = raw.encode().decode('unicode_escape').encode('latin-1','ignore').decode('utf-8','ignore')
    state = json.loads(fixed)
    schema = state.get('schema', {})
    for name, info in schema.items():
        ty = info.get('type','')
        if ty in ('select','multi_select'):
            for o in info.get('options', []):
                all_opts[o['name']].append((db, name, 'multi' if ty=='multi_select' else 'select'))

# also include status options (separate concern but might overlap)
for db, fpath in FILES.items():
    d = json.load(open(fpath))
    t = d[0]['text']
    i = t.find('<data-source-state>') + len('<data-source-state>')
    j = t.find('</data-source-state>')
    raw = t[i:j].strip()
    fixed = raw.encode().decode('unicode_escape').encode('latin-1','ignore').decode('utf-8','ignore')
    state = json.loads(fixed)
    schema = state.get('schema', {})
    # Don't add status to all_opts — keep separate analysis
    pass

# print duplicates (option value appears in 2+ different fields, regardless of same/different DB)
print("="*80)
print("OPTION 值重複報告（只顯示出現 2 次以上的）")
print("="*80)

# group by option value
sorted_opts = sorted(all_opts.items(), key=lambda x: (-len(x[1]), x[0]))

# Filter: only show if appears in 2+ different (db,field) combos
for opt, occurrences in sorted_opts:
    uniq = set((db, field) for db, field, _ in occurrences)
    if len(uniq) >= 2:
        print(f"\n『{opt}』 出現於 {len(uniq)} 處：")
        for db, field, ty in occurrences:
            print(f"    - {db}.{field} [{ty}]")

print("\n" + "="*80)
print("總計：", sum(1 for _, occ in sorted_opts if len(set((db,f) for db,f,_ in occ))>=2), "個重複 option")
