"""Add recipes written only in item text ("製作：找NPC…製作 (A 3個、B 30個)") to data.json items that have none.
Money (X兩) is picked up at runtime by craftFee(); friendship/contribution needs stay as text.
Run from repo root: python3 tools/desc_recipes.py"""
import json, re
P = 'data.json'
D = json.load(open(P, encoding='utf-8')); I = D['items']
z2k = {}
for k, e in I.items(): z2k.setdefault(e['zh'], k)
NORM = lambda n: re.sub(r'[\(（](不可交易|綁定|帳號綁定)[\)）]$', '', n).replace('凶', '兇').replace('的', '')
n2k = {}
for k, e in I.items(): n2k.setdefault(NORM(e['zh']), k)
ALIAS = {'時間粉末': 'gi5507', '畫工卷軸': 'gi1122'}
GROUP = {'幻獸武器': ['gi3998', 'gi3999', 'gi4000', 'gi4001']}  # filled below by name
GROUP['幻獸武器'] = [z2k[n] for n in ('瘟神的手鐲', '猿公的手鐲', '虎鶴的項鍊', '雷獸的項鍊') if n in z2k]
SKIP = re.compile(r'兩$|友好度|貢獻度|^需要\s*\d+\s*日$')
PRO = {p['it'] for v in D.get('pro', {}).values() if isinstance(v, list) for p in v if isinstance(p, dict) and 'it' in p}
added = skipped = 0
for k, e in I.items():
    if e.get('recipe') or k in PRO: continue  # profession recipes (with batch size) come from D['pro']
    m = re.search(r'^製作：(.*?)[（(](.+)[)）]\s*$', e.get('desc', ''), re.M)
    if not m: continue
    rec, ok = [], True
    parts = []
    for p in re.split(r'[、，]', m.group(2)):
        p = p.strip()
        if re.match(r'^\d+\s*個', p): parts.append(p)
        else: parts += re.findall(r'.+?\d+\s*個|.+$', p)
    for p in parts:
        p = p.strip()
        if not p or SKIP.search(p): continue
        mm = re.match(r'^(.+?)\s*(\d+)\s*個$', p) or re.match(r'^(\d+)\s*個\s*(.+)$', p)
        if not mm: ok = False; break
        nm, q = (mm.group(1), mm.group(2)) if not mm.group(1).isdigit() else (mm.group(2), mm.group(1))
        nm = nm.strip(); pm = re.match(r'^\+(\d+)\s*(.+)$', nm)
        if pm: nm = f'{pm.group(2)}(+{pm.group(1)})' if f'{pm.group(2)}(+{pm.group(1)})' in z2k else pm.group(2)
        if nm in GROUP and GROUP[nm]: rec.append({'i': GROUP[nm][0], 'q': q, 'alt': GROUP[nm], 'g': nm})
        elif nm in ALIAS: rec.append({'i': ALIAS[nm], 'q': q})
        elif nm in z2k: rec.append({'i': z2k[nm], 'q': q})
        elif NORM(nm) in n2k: rec.append({'i': n2k[NORM(nm)], 'q': q})
        else: ok = False; break
    if ok and rec:
        e['recipe'] = rec
        how = m.group(1).strip()
        if not e.get('note'): e['note'] = how
        if not e.get('by'):
            nk = [nk for nk, n in D['npcs'].items() if n.get('zh') and len(n['zh']) > 1 and n['zh'] in how]
            if nk: e['by'] = max(nk, key=lambda x: len(D['npcs'][x]['zh']))
        added += 1
    else: skipped += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('added', added, 'skipped', skipped)
