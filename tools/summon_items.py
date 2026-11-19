"""Link 幻獸 to the 命牌 item that summons them (Online/Item/CreatureItem.txt).
Usage: python3 tools/summon_items.py <game dir with Online/>"""
import json, sys
G = sys.argv[1]; P = 'data.json'
D = json.load(open(P, encoding='utf-8')); M = D['mercs']; I = D['items']; n = 0
for l in open(G + '/Online/Item/CreatureItem.txt', 'rb').read().decode('cp949').splitlines():
    c = l.split('\t')
    if l.startswith((';', '#')) or len(c) < 10: continue
    it = 'gi' + c[0].strip(); e = I.get(it)
    if not e or '명패' not in c[1] or '거래불가' in c[1]: continue
    for x in c:
        m = 'gu' + x.strip()
        if x.strip()[:1] == 'M' and m in M and not M[m].get('from'):
            M[m]['summon'] = it; n += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('summon', n)
# 神仙谷 張果老 certificates for element / 咒術師 monsters (fees from the item notes)
D = json.load(open(P, encoding='utf-8')); M = D['mercs']; I = D['items']
X = {'guH44': ('gi6411', 5000000), 'guH45': ('gi6412', 5000000), 'guH46': ('gi6413', 5000000),
     'guH47': ('gi6414', 5000000), 'guF40': ('gi6967', 5000000), 'guF41': ('gi7587', 200000000),
     'guF42': ('gi7588', 200000000)}
for m, (it, fee) in X.items():
    if m in M and it in I and not M[m].get('from'):
        M[m]['summon'] = it; I[it]['cfee'] = fee
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('cert summon', len(X))
