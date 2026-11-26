"""Remove curse-refined (鬼道) versions that players can't get: no 咒術秘訣 in the
recipe and no monster drops them. Run after enchant_items.py / drop_enchant_items.py."""
import json
P = 'data.json'
D = json.load(open(P, encoding='utf-8')); I = D['items']
drop = {d['i'] for m in D['monsters'].values() for d in (m.get('drops') or [])}
has_sec = lambda e: any((I.get(r['i']) or {}).get('eb') for r in e.get('recipe', []))
P2 = json.load(open('prices.json', encoding='utf-8'))
priced = set((P2.get('m') or {}).keys()) | {i for v in (P2.get('v') or {}).values() for i in v.get('ids', [])}
sock_base = {e['base'] for e in I.values() if e.get('sock') and e.get('base')}
cand = {k for k, e in I.items() if e.get('affix') and not e.get('sock')}
keep = {k for k in cand if has_sec(I[k]) or k in drop or k in sock_base or k in priced}
while True:  # 大成功 (gs) results of an obtainable version are obtainable too
    more = {I[k]['gs'] for k in keep if I[k].get('gs') in cand} - keep
    if not more: break
    keep |= more
rm = cand - keep
for k in rm: del I[k]
def clean(x):
    if isinstance(x, dict):
        for k in list(x):
            if isinstance(x[k], str) and x[k] in rm and k in ('gs',): del x[k]
            else: clean(x[k])
            if k == 'gsof' and isinstance(x.get(k), list):
                x[k] = [v for v in x[k] if v not in rm]
                if not x[k]: del x[k]
    elif isinstance(x, list):
        for v in x: clean(v)
clean(D)
left = [k for k in rm if ('"%s"' % k) in json.dumps(D)]
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('removed', len(rm), 'dangling refs', len(left), left[:10])
# Versions kept without a 咒術秘訣: fix the description and drop the misleading base-only recipe
D = json.load(open(P, encoding='utf-8')); I = D['items']
gsfrom = {}
for k, e in I.items():
    if e.get('affix') and e.get('gs') in I and has_sec(e): gsfrom.setdefault(e['gs'], []).append(k)
fixed = 0
for k, e in I.items():
    if not e.get('affix') or e.get('sock') or has_sec(e): continue
    if gsfrom.get(k):
        first = '鬼道（咒術磨練）大成功先會出：用下面嘅版本磨練，大成功就會變成呢件。\n' + '、'.join(I[x]['zh'] for x in gsfrom[k][:3])
    else:
        first = '鬼道版本：遊戲冇對應嘅咒術秘訣，唔可以自己磨練；拍賣所有得買，或者用嚟開孔入石。'
    lines = (e.get('desc') or '').split('\n')
    if lines and lines[0].startswith('鬼道'):
        lines = [first] + [l for l in lines[1:] if not (lines[0].startswith('鬼道（咒術磨練）大成功') and l and '｜' not in l and l == lines[1])]
    else: lines.insert(0, first)
    e['desc'] = '\n'.join(lines)
    if [r['i'] for r in e.get('recipe', [])] == [e.get('base')]: e.pop('recipe', None)
    fixed += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('descriptions fixed', fixed)
