"""Monster job changes at the trainer need 封印珠 (gi853); counts from the game's trainer text.
Usage: python3 tools/monster_seal.py"""
import json
P = 'data.json'; D = json.load(open(P, encoding='utf-8')); M = D['mercs']
T = {('小山賊', '大刀盜賊'): 8, ('賊貓', '貓鼬'): 7, ('槍手馬賊', '雙刀盜賊'): 8, ('螳螂', '鍬形蟲'): 7,
     ('海龜', '陸地巨龜'): 10, ('黃鼠狼', '斑紋狐狸'): 7, ('黃蛇', '雙頭蛇'): 9, ('紫紋蛇神', '雙頭蛇'): 9,
     ('驢子', '黃牛挑夫'): 10, ('白虎', '叢林山貓'): 8}
n = 0
for k, e in M.items():
    for f in e.get('from') or []:
        src = M.get(f['id'], {}).get('zh')
        q = T.get((src, e['zh']))
        if q and not f.get('items'):
            f['items'] = [['gi853', q]]; n += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('seal', n)
