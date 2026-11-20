"""開孔（Slotted / 有孔的）同入石（寶石詞綴）版本裝備：
JewelryItem.txt 每行係一件獨立道具（基底裝備 + 寶石加成）；AddSocketItem.txt / AddJewelryItem.txt 係開孔、入石方法。
Usage: python3 tools/socket_items.py <game dir with Online/> <TW gts dir> <Global gts dir>"""
import json, sys, re
G, TW, GL = sys.argv[1:4]; P = 'data.json'
def texts(p):
    T = {}
    for l in open(p, 'rb').read().decode('utf-16-le', 'replace').splitlines():
        c = l.split('\t')
        if len(c) >= 2 and c[0].isdigit() and c[1].strip(): T[int(c[0])] = c[1].strip()
    return T
ZH, EN = texts(TW + '/OnlineText.dat'), texts(GL + '/OnlineText.dat')
rows = lambda f: [l.split('\t') + [''] * 20 for l in open(G + '/Online/' + f, 'rb').read().decode('cp949', 'replace').splitlines() if l[:1].isdigit()]
N = lambda v: int(float(v)) if re.fullmatch(r'-?\d+(\.\d+)?', (v or '').strip()) else 0
JI = rows('Item/JewelryItem.txt')
SK = {r[0].strip(): r for r in rows('ProfessionalSkill/AddSocketItem.txt')}
JW = {r[0].strip(): r for r in rows('ProfessionalSkill/AddJewelryItem.txt')}
STAT = [(9, 's', '力量'), (10, 'd', '敏捷'), (11, 'v', '體力'), (12, 'i', '智力'), (13, None, '屬性傷害'), (14, None, '土屬性傷害修正'),
        (15, None, '攻擊傷害'), (16, None, '受到傷害減少'), (17, None, '暴擊率'), (18, None, '暴擊傷害')]
LAB = [('mn', '最小攻擊'), ('mx', '最大攻擊'), ('at', '攻擊'), ('ac', '防禦'), ('pr', '打擊抵抗'), ('mr', '法術抵抗'), ('s', '力量'),
       ('d', '敏捷'), ('v', '體力'), ('i', '智力'), ('md', '傭兵防禦'), ('ma', '傭兵攻擊'), ('lv', '需求等級')]
KIND = {'W': '武器', 'C': '服裝', 'A': '防具', 'H': '防具', 'G': '防具', 'B': '防具', 'S': '防具'}
D = json.load(open(P, encoding='utf-8')); I = D['items']; add = skip = 0
for r in JI:
    k, b = 'gi' + r[0].strip(), 'gi' + r[6].strip()
    base = I.get(b)
    if not base or (k in I and not I[k].get('sock')): skip += 1; continue
    pz, pe = ZH.get(N(r[8]), '').strip(), EN.get(N(r[8]), '').strip()
    if not pz: skip += 1; continue
    st = [(key, lab, N(r[i])) for i, key, lab in STAT if N(r[i])]
    eq = dict(base.get('eq') or {})
    for key, lab, v in st:
        if key: eq[key] = eq.get(key, 0) + v
    line = '｜'.join(f'{lab} {eq[key]}' for key, lab in LAB if eq.get(key))
    slotted = N(r[8]) == 8729
    e = {'cat': base.get('cat'), 'sub': base.get('sub'), 'code': int(r[0]), 'ko': r[1].strip(),
         'zh': pz + base['zh'], 'base': b, 'sock': 1 if slotted else 2,
         'affix': {'n': pz, 'st': [[lab, v] for key, lab, v in st], 'g': 0, 'k': 'sock'}}
    if base.get('img'): e['img'] = base['img']
    if base.get('en') and pe: e['en'] = f"{pe} {base['en']}"
    if eq: e['eq'] = eq
    if slotted and r[0].strip() in SK:
        s = SK[r[0].strip()]
        e['recipe'] = [{'i': b, 'q': '1'}] + [{'i': 'gi' + s[5].strip(), 'q': '1'}] * ('gi' + s[5].strip() in I)
        e['cfee'] = N(s[11]); e['rate'] = N(s[2])
        e['desc'] = f"開孔版本：用基底裝備加夾鉗開孔，成功率 {N(s[2])}%（加安定劑 +{N(s[9])}%），手續費 {N(s[11])} 兩。開咗孔先可以入寶石。"
    elif r[0].strip() in JW:
        j = JW[r[0].strip()]
        e['recipe'] = [{'i': 'gi' + j[3].strip(), 'q': '1'}] + [{'i': 'gi' + j[5].strip(), 'q': '1'}] * ('gi' + j[5].strip() in I)
        e['cfee'] = N(j[12]); e['rate'] = N(j[2])
        e['desc'] = f"入石版本：將寶石鑲入開咗孔嘅裝備，成功率 {N(j[2])}%（加安定劑 +{N(j[9])}%），手續費 {N(j[12])} 兩。"
    else:
        e['desc'] = '入石版本：鑲咗寶石嘅裝備。'
    e['desc'] += f"\n{KIND.get(eq.get('g'), '飾物')}｜{line}"
    if k in I: I[k].update(e)
    else: I[k] = e; add += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('socket/jewel items added', add, 'skipped', skip)
