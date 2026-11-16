"""Add 傭兵防禦/傭兵攻擊 (Encorg.Def./Encorg.Att. columns of Online/Item/Dress.txt) to clothes in data.json.
Usage: python3 tools/merc_bonus.py <game Online/Item dir> [more dirs...]"""
import json, re, sys
P = 'data.json'
B = {}
for d in sys.argv[1:]:
    s = open(d + '/Dress.txt', 'rb').read().decode('cp949')
    L = s.splitlines(); H = next(l.lstrip('#').split('\t') for l in L if l.startswith('#') and 'Encorg' in l)
    ia, idf = H.index('Encorg.Att.'), H.index('Encorg.Def.')
    for l in L:
        c = l.split('\t')
        if l.startswith((';', '#')) or len(c) <= ia or not c[0].isdigit(): continue
        num = lambda x: int(x) if x.lstrip('-').isdigit() else 0
        a, df = num(c[ia]), num(c[idf])
        if a or df: B.setdefault('gi' + c[0], (df, a))
D = json.load(open(P, encoding='utf-8')); n = 0
for k, (df, a) in B.items():
    e = D['items'].get(k)
    if not e: continue
    lines = e['desc'].split('\n')
    for i, l in enumerate(lines):
        if '｜' in l and '傭兵' not in l:
            add = ''.join(f'｜{t} {v}' for t, v in (('傭兵防禦', df), ('傭兵攻擊', a)) if v)
            lines[i] = re.sub(r'(｜價格 )', add + r'\1', l, 1) if '｜價格 ' in l else l + add
            break
    e['desc'] = '\n'.join(lines)
    eq = e.setdefault('eq', {})
    if df: eq['md'] = df
    if a: eq['ma'] = a
    n += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('merc bonus', len(B), 'applied', n)
