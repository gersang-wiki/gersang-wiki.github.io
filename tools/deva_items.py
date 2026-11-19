"""Add synthesis/awakening material lists from Online/CharInfo/FourDevaList.txt to mercs' 'from' entries.
Usage: python3 tools/deva_items.py <game dir with Online/>"""
import json, sys
G = sys.argv[1]
P = 'data.json'
D = json.load(open(P, encoding='utf-8')); M = D['mercs']; I = D['items']
s = open(G + '/Online/CharInfo/FourDevaList.txt', 'rb').read().decode('cp949').splitlines()
H = next(l for l in s if l.startswith('#')).lstrip('#').split('\t')
H = [h.strip() for h in H]
added = changed = 0
for l in s:
    c = l.split('\t')
    if l.startswith((';', '#')) or len(c) < 10 or not c[0].strip(): continue
    mid = 'gu' + c[0].strip()
    if mid not in M: continue
    items = []
    for j in range(10, len(c) - 2, 3):
        code = c[j].strip()
        if code.isdigit() and code != '0' and 'gi' + code in I:
            items.append(['gi' + code, int(c[j + 2] or 0)])
    if not items: continue
    need = [('gu' + c[k].strip()) for k in (5, 8) if c[k].strip() not in ('', '0')]
    fr = M[mid].get('from') or []
    tgt = next((f for f in fr if f.get('id') in need and f.get('items')), None) or next((f for f in fr if f.get('id') in need), None)
    if not tgt:
        continue
    for f in fr:
        if f is not tgt and f.get('items') and f.get('id') in need: f.pop('items')
    if tgt.get('items') != items:
        changed += 1 if tgt.get('items') else 0; added += 0 if tgt.get('items') else 1
        tgt['items'] = items
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('added', added, 'changed', changed)
# RenovateMecenary.txt (改造/靈魂覺醒) and RemodelingMercenary.txt (改造將帥)
D = json.load(open(P, encoding='utf-8')); M = D['mercs']; I = D['items']
n2 = 0
def put(mid, need, items):
    global n2
    if mid not in M or not items: return
    fr = M[mid].get('from') or []
    t = next((f for f in fr if f.get('id') == need), None)
    if t is None:
        return
    if not t.get('items'): t['items'] = items; n2 += 1
for fn in ('RenovateMecenary.txt', 'RemodelingMercenary.txt'):
    s = open(G + '/Online/CharInfo/' + fn, 'rb').read().decode('cp949').splitlines()
    H = [h.strip() for h in next(l for l in s if l.startswith('#')).lstrip('#').split('\t')]
    ci = H.index('Character ID'); ni = H.index('Need ID')
    pairs = [(i, i + 1) for i, h in enumerate(H) if h.startswith('ItemCode')]
    for l in s:
        c = l.split('\t')
        if l.startswith((';', '#')) or len(c) <= ni or not c[ci].strip(): continue
        items = []
        for a, b in pairs:
            if b < len(c) and c[a].strip().isdigit() and c[a].strip() != '0' and 'gi' + c[a].strip() in I:
                items.append(['gi' + c[a].strip(), int(c[b] or 0)])
        put('gu' + c[ci].strip(), 'gu' + c[ni].strip(), items)
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('renovate/remodel', n2)
