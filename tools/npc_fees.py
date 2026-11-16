"""Fees and recipes for NPC 正宗 (Masamune) refining, as reported by players. Run from repo root."""
import json
P = 'data.json'
D = json.load(open(P, encoding='utf-8')); I = D['items']
z = {e['zh']: k for k, e in I.items()}
FEE = {  # zh name -> fee per craft (兩)
    '風之結晶': 300000, '火之結晶': 300000, '水之結晶': 300000, '閃電之結晶': 300000, '地之結晶': 300000,
    '被封印的力量碎塊': 500000,
    '生命的精髓': 500000, '深淵的精髓': 1000000,
    '覺醒石': 1000000,
    '火之屬性石': 2000000, '水之屬性石': 2000000, '風之屬性石': 2000000, '雷之屬性石': 2000000, '地之屬性石': 2000000,
    '靈魂結晶': 0,
}
for n, f in FEE.items(): I[z[n]]['cfee'] = f
# 靈魂結晶: 兇獸之魂 10 個 或 幻獸之魂 10 個（同一款）
I[z['靈魂結晶']]['recipe'] = [{'i': z['兇獸之魂'], 'q': '10', 'alt': [z['兇獸之魂'], z['幻獸之魂']], 'g': '兇獸之魂／幻獸之魂'}]
I[z['靈魂結晶']]['by'] = 'gn15'
# 幻獸武器 groups need different ones
for e in I.values():
    for r in e.get('recipe') or []:
        if r.get('g') == '幻獸武器': r['d'] = 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('ok')
