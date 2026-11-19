"""Apply a new Global client English text pack (Korean.gts) to data.json English names.
Usage: python3 tools/en_text_update.py <old gts dir> <new gts dir> <game dir with Online/>"""
import json, sys, glob
OLD, NEW, G = sys.argv[1:4]; P = 'data.json'
def texts(p):
    T = {}
    for l in open(p, 'rb').read().decode('utf-16-le', 'replace').splitlines():
        c = l.split('\t')
        if len(c) >= 2 and c[0].isdigit() and c[1].strip(): T[int(c[0])] = c[1].strip().replace('\\n', '\n')
    return T
O = {f: texts(f'{OLD}/{f}') for f in ('OnlineText.dat', 'GameText.dat', 'QuestText.dat')}
N = {f: texts(f'{NEW}/{f}') for f in O}
D = json.load(open(P, encoding='utf-8'))
def rows(p):
    L = open(p, 'rb').read().decode('cp949', 'replace').splitlines()
    h = next((l for l in L if l.startswith('#')), None)
    if not h: return None, []
    return [x.strip() for x in h.lstrip('#').split('\t')], [l.split('\t') for l in L if l and l[0] not in '#;']
nc = {}
for f in glob.glob(G + '/Online/Item/*.txt'):
    H, R = rows(f)
    if not H or 'Name Code' not in H: continue
    a, b = 0, H.index('Name Code')
    for c in R:
        if len(c) > b and c[a].strip().isdigit() and c[b].strip().isdigit(): nc.setdefault('gi' + c[a].strip(), int(c[b]))
H, R = rows(G + '/Online/CharInfo/Character List.txt')
b = H.index('Name Code')
for c in R:
    if len(c) > b and c[0].strip() and c[b].strip().isdigit():
        for p in ('gu', 'gm'): nc.setdefault(p + c[0].strip(), int(c[b]))
OT, NT = O['OnlineText.dat'], N['OnlineText.dat']
cnt = {'code': 0, 'new': 0, 'text': 0}; log = []
for t in ('items', 'mercs', 'monsters'):
    for k, e in D[t].items():
        c = nc.get(k)
        if not c or not NT.get(c): continue
        old, new = OT.get(c), NT[c]
        if e.get('en') == new: continue
        if not e.get('en') or e.get('en') == old or e.get('en') == e.get('ko'):
            log.append((k, e.get('en'), new)); cnt['new' if not e.get('en') else 'code'] += 1; e['en'] = new
# other renamed strings (npcs, places, quests, skills): exact old → new
R2 = {}
for f in O:
    for c, old in O[f].items():
        new = N[f].get(c)
        if new and new != old and '\n' not in old and len(old) < 80: R2.setdefault(old, new)
STILL = {v for f in N for v in N[f].values()}
R2 = {o: n for o, n in R2.items() if o not in STILL}
for t in ('skills', 'npcs', 'places', 'quests'):
    for k, e in D[t].items():
        if e.get('en') in R2: log.append((k, e['en'], R2[e['en']])); e['en'] = R2[e['en']]; cnt['text'] += 1
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(cnt)
for l in log[:80]: print(l)
