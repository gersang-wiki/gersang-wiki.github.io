"""鬼道（咒術磨練）完成品：EnchantItem.txt 每一行都係一件獨立道具（基底裝備 + 詞綴），
能力 = 基底裝備 + TableAdvBasicParm.txt 嘅加成。加入網站做道具，英文名用拍賣所格式「<Prefix> Base」。
Usage: python3 tools/enchant_items.py <game dir with Online/> <TW gts dir> <Global gts dir>"""
import json, sys, re
G, TW, GL = sys.argv[1:4]; P = 'data.json'
def texts(p):
    T = {}
    for l in open(p, 'rb').read().decode('utf-16-le', 'replace').splitlines():
        c = l.split('\t')
        if len(c) >= 2 and c[0].isdigit() and c[1].strip(): T[int(c[0])] = c[1].strip()
    return T
ZH, EN = texts(TW + '/OnlineText.dat'), texts(GL + '/OnlineText.dat')
rd = lambda f: open(G + '/Online/Item/' + f, 'rb').read().decode('cp949', 'replace').splitlines()
rows = [l.split('\t') for l in rd('EnchantItem.txt') if l[:1].isdigit()]
TB = {l.split('\t')[0].strip(): l.split('\t')[1:] for l in rd('TableAdvBasicParm.txt') if l and l[0] not in '#;\t'}
COL = [(0, 's', '力量'), (1, 'd', '敏捷'), (2, 'i', '智力'), (3, 'v', '體力'), (6, 'pr', '打擊抵抗'), (7, 'mr', '法術抵抗'),
       (8, 'ac', '防禦'), (9, 'mn', '最小攻擊'), (10, 'mx', '最大攻擊'), (17, 'md', '傭兵防禦'), (18, 'ma', '傭兵攻擊')]
LAB = [('mn', '最小攻擊'), ('mx', '最大攻擊'), ('at', '攻擊'), ('ac', '防禦'), ('pr', '打擊抵抗'), ('mr', '法術抵抗'), ('s', '力量'),
       ('d', '敏捷'), ('v', '體力'), ('i', '智力'), ('md', '傭兵防禦'), ('ma', '傭兵攻擊'), ('lv', '需求等級')]
KIND = {'W': '武器', 'C': '服裝', 'A': '防具', 'H': '防具', 'G': '防具', 'B': '防具', 'S': '防具'}
D = json.load(open(P, encoding='utf-8')); I = D['items']
N = lambda v: int(float(v)) if re.fullmatch(r'-?\d+(\.\d+)?', (v or '').strip()) else 0
add = upd = skip = 0
for r in rows:
    r = r + [''] * 40
    k, b = 'gi' + r[0].strip(), 'gi' + r[7].strip()
    base = I.get(b)
    if not base: skip += 1; continue
    old = I.get(k)
    pz, pe = ZH.get(N(r[15]), '').strip(), EN.get(N(r[15]), '').strip()
    if old and old.get('affix'):                   # 已經人手整理過：只補英文名
        if not old.get('en') and pe and base.get('en'): old['en'] = f"{pe} {base['en']}"
        continue
    if not pz: skip += 1; continue
    g = N(r[19]); t = TB.get(r[36].strip(), [])
    st = [(key, lab, N(t[i]) if i < len(t) else 0) for i, key, lab in COL]
    st = [x for x in st if x[2]]
    eq = dict(base.get('eq') or {})
    for key, lab, v in st: eq[key] = eq.get(key, 0) + v
    price = N(r[26]) or 0
    line = '｜'.join(f'{lab} {eq[key]}' for key, lab in LAB if eq.get(key))
    kind = KIND.get(eq.get('g'), '飾物')
    e = {'cat': base.get('cat'), 'sub': base.get('sub'), 'code': int(r[0]), 'ko': f"{r[16].strip()} {base.get('ko', '')}".strip(),
         'zh': f"{g}級 {pz}{base['zh']}" if g else f"{pz}{base['zh']}",
         'desc': f"鬼道（咒術磨練）完成品：搵咒術磨練 NPC，用基底裝備加咒術秘訣磨練出嚟。\n{kind}｜{line}{'｜' if line else ''}價格 {price}",
         'base': b, 'affix': {'n': pz, 'st': [[lab, v] for key, lab, v in st], 'g': g}}
    if base.get('img'): e['img'] = base['img']
    if base.get('en') and pe: e['en'] = f"{pe} {base['en']}"
    if eq: e['eq'] = eq
    sec = 'gi' + r[9].strip()
    e['recipe'] = [{'i': b, 'q': '1'}] + ([{'i': sec, 'q': '1'}] if sec in I else [])
    gs = 'gi' + r[13].strip()
    if r[13].strip() not in ('', '0') and gs != b and gs != k: e['gs'] = gs
    if old: old.update({x: y for x, y in e.items() if x not in ('img',) or 'img' not in old}); upd += 1
    else: I[k] = e; add += 1
for k, v in I.items():                              # 大成功：反向連結
    if v.get('gs') in I and v.get('affix'):
        L = I[v['gs']].setdefault('gsof', [])
        if k not in L: L.append(k)
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('enchanted items added', add, 'updated', upd, 'skipped', skip)
