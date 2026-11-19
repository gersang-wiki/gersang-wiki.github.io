"""封印珠 needed to hire each monster at the trainer (from 52jushang.com monster table).
Usage: python3 tools/monster_hire_seal.py"""
import json
P = 'data.json'; D = json.load(open(P, encoding='utf-8')); M = D['mercs']
S = {'驢子': 4, '石爺爺': 9, '海馬': 6, '白虎': 5, '四不像': 4, '九尾狐': 3, '鹿': 3, '小山賊': 3, '海龜': 3,
     '弓手山賊': 2, '毒蜈蚣': 11, '雪女': 9, '鬼貓': 5, '犬魔': 5, '毛假面': 4, '螳螂': 3, '倭寇': 2, '鬼火': 9,
     '半月熊': 5, '雪蜥蜴': 5, '冰樹': 4, '海賊': 4, '藤蔓花柱': 3, '槍手馬賊': 3, '黃鼠狼': 3, '馬面人': 11,
     '狂牛': 9, '小仙人掌': 7, '原住民巫師': 7, '原住民': 5, '食人鱷魚': 4, '惡商人': 3, '賊貓': 3}
n = 0
for k, e in M.items():
    if e.get('cat') == '怪物' and not e.get('from') and e['zh'] in S:
        e['seal'] = S[e['zh']]; n += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('hire seal', n, 'of', len(S))
