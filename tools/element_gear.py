"""Element gear (火焰/落水/雷擊/風伯/地靈 手環・綁腿): each piece gives 屬性值 +3; the 2-piece set bonus
"全屬性值 +5" is 打擊抵抗 +5% like other sets (not 屬性值). Usage: python3 tools/element_gear.py"""
import json, re
P = 'data.json'; D = json.load(open(P, encoding='utf-8')); I = D['items']; n = 0
for st in D['sys2'].get('sets', []):
    if not st['n'].endswith('屬性套裝') or any('不可交易' in I.get(i, {}).get('zh', '') for i in st['items']):
        continue
    for t in st['tiers']:
        t[1] = [re.sub(r'^屬性值 \+(\d+)$', r'打擊抵抗 +\1%', f) for f in t[1]]
    for i in st['items']:
        if i in I and I[i].get('eq'):
            I[i]['eq']['ev'] = 3; n += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('element gear', n)
# enhanced versions 火焰手環(+N) etc.: 屬性值 by enhancement level (ShapeAbility: +0/+1 3, +2/+3 4, +4/+5 5)
D = json.load(open(P, encoding='utf-8')); I = D['items']; EV = {1: 3, 2: 4, 3: 4, 4: 5, 5: 5}; m2 = 0
base = {I[i]['zh'] for st in D['sys2'].get('sets', []) if st['n'].endswith('屬性套裝') for i in st['items'] if i in I and '不可交易' not in I[i]['zh']}
for k, e in I.items():
    m = re.match(r'^(.+)\(\+(\d)\)$', e.get('zh', ''))
    if m and m.group(1) in base and e.get('eq') and int(m.group(2)) in EV:
        e['eq']['ev'] = EV[int(m.group(2))]; m2 += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('enhanced element gear', m2)
