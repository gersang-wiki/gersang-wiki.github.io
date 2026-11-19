"""Four Heavenly Kings (四天王) recipes/fees from player guides. Run from repo root."""
import json
P = 'data.json'
D = json.load(open(P, encoding='utf-8')); I = D['items']
def setr(k, rows, note, by=None, fee=None, force=False):
    e = I[k]
    if e.get('recipe') and not force: return
    e['recipe'] = [{'i': i, 'q': str(q)} for i, q in rows]
    if note: e['note'] = note
    if by: e['by'] = by
    if fee is not None: e['cfee'] = fee
# 覺醒天王武器：高級天王武器（要先咒術）＋ 龍石像 ＋ 死神印章 ＋ 高貴的力量飾品 ＋ 遺物
AW = [('gi10661', 'gi5754', '[迅速的]', 'gi10749', 'gi8904', 'gi10529', 'gi11016'),
      ('gi10660', 'gi5783', '[神秘的]', 'gi10750', 'gi8902', 'gi10527', 'gi11015'),
      ('gi10659', 'gi5781', '<堅韌的>', 'gi10748', 'gi8903', 'gi10528', 'gi11014'),
      ('gi10658', 'gi5756', '<強韌的>', 'gi10747', 'gi8901', 'gi10526', 'gi10744')]
for k, hi, pre, statue, seal, orn, relic in AW:
    setr(k, [(hi, 1), (statue, 1), ('gi7051' if 'gi7051' in I and I['gi7051']['zh'] == '覺醒石' else next(x for x, e in I.items() if e['zh'] == '覺醒石'), 5),
             ('gi5798', 5), (seal, 5), (orn, 10), ('gi10880', 10), (relic, 1)],
         f'材料（{I[hi]["zh"]}要先做咒術{pre}）')
# 天王手套：印章交換（一億銀票 ×5）
GL = [('gi6110', 'gi6842', 'gi6849', 'gi5748'), ('gi6099', 'gi6843', 'gi6850', 'gi5750'),
      ('gi6245', 'gi6843', 'gi6851', 'gi5749'), ('gi6240', 'gi6842', 'gi6848', 'gi5751')]
for k, a, b, c in GL:
    setr(k, [(a, 200), (b, 300), (c, 300), ('gi2602', 5)], '印章交換', fee=0)
# 武神的X天王：張果老 費用 3 億；噩夢之珠：費用 500 萬
for k in ('gi6886', 'gi6887', 'gi7357', 'gi7358'): I[k]['cfee'] = 300000000
for k, e in I.items():
    if e['zh'].startswith('噩夢之珠('): e['cfee'] = 5000000
# 生產設施地點
LOC = {'增長': '中國、台灣', '廣目': '中國、台灣', '多聞': '朝鮮、日本', '持國': '朝鮮、日本'}
for k, e in I.items():
    n = e.get('note', '')
    if n.startswith('生產設施製作') and '廠' not in n:
        for kk, loc in LOC.items():
            if e['zh'].startswith(kk + '天王') and not e['zh'].endswith('製造書'):
                kind = '工藝品廠' if ('指環' in e['zh'] or '戒' in e['zh']) else '防具廠'
                e['note'] = n + f'（{kind}：{loc}）'
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('ok')
