"""Fix item names that the Taiwan client text gets wrong.

Run after re-extracting data: python3 tools/name_fixes.py
"""
import json, os
P = os.path.join(os.path.dirname(__file__), '..', 'data.json')
FIX = {
    # TW OnlineText 17043 says 地之結晶體, but its own recipe texts (33704/33705/33933),
    # the English (Shard of Thunder) and Korean (뇌전의결정체) all say thunder.
    'gi6459': ('閃電之結晶體', '台服道具名寫錯咗做「地之結晶體」；遊戲入面配方文字、英文同韓文都係閃電（雷）屬性。'),
}
d = json.load(open(P, encoding='utf-8'))
for k, (zh, note) in FIX.items():
    e = d['items'][k]
    if e.get('zh') != zh:
        e['zh'] = zh
        if note not in (e.get('note') or ''):
            e['note'] = ((e.get('note') or '') + '\n' + note).strip()
        print('fixed', k, zh)
json.dump(d, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
