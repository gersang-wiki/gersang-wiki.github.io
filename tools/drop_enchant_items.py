"""Add enchanted (咒術) items that monsters drop but that are missing from data.json items.
Usage: python3 tools/drop_enchant_items.py <gs_tw dir> <gts_tw dir>"""
import json, sys
G, T = sys.argv[1], sys.argv[2]
P = 'data.json'
D = json.load(open(P, encoding='utf-8')); I = D['items']; M = D['monsters']
OT = {}
for l in open(T + '/OnlineText.dat', 'rb').read().decode('utf-16-le', errors='ignore').split('\r\n'):
    p = l.split('\t', 1)
    if len(p) == 2 and p[0].isdigit(): OT[int(p[0])] = p[1].strip()
EN = {c[0]: c for c in (l.split('\t') for l in open(G + '/Online/Item/EnchantItem.txt', 'rb').read().decode('cp949').splitlines()) if c and c[0].isdigit()}
s = open(G + '/Online/CharInfo/Character List.txt', 'rb').read().decode('cp949').splitlines()
H = next(l for l in s if l.startswith('#')).lstrip('#').split('\t'); j0 = H.index('Item Code1')
added = 0
for l in s:
    c = l.split('\t')
    if l.startswith((';', '#')) or len(c) < j0 + 30 or 'gm' + c[0] not in M: continue
    m = M['gm' + c[0]]
    for j in range(j0, j0 + 30, 3):
        code = c[j].strip(); k = 'gi' + code
        if not code or code == '0' or code not in EN: continue
        e = EN[code]; base = I.get('gi' + e[7])
        if k not in I and base:
            pre = OT.get(int(e[15]), e[16]) if e[15].isdigit() else e[16]
            grade = e[19]
            stat = [x for x in base['desc'].split('\n') if '｜' in x]
            I[k] = {'cat': base.get('cat', '道具'), 'code': int(code), 'ko': f"{e[16]} {e[8]}".strip(), 'zh': f"{grade}級 {pre}{base['zh']}",
                    'desc': '\n'.join([OT.get(int(e[25]), '') if e[25].isdigit() else ''] + stat), 'img': base.get('img'), 'sub': base.get('sub', ''),
                    'en': f"Lv{grade} enchanted {base.get('en') or ''}".strip(), 'base': 'gi' + e[7]}
            if base.get('eq'): I[k]['eq'] = base['eq']
            added += 1
        if k in I and not any(d['i'] == k for d in m.get('drops', [])):
            p = int(c[j + 2] or 0) / 1000
            m.setdefault('drops', []).append({'i': k, 'p': f"{p:g}%"})
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('added items', added)
