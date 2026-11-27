"""Which production facility (生產設施) makes each item, from Village/Facility.txt + Factory.txt.

Adds items[*].fac = [[facility_zh, building_zh, min_tier, nations]] where min_tier 0 = built from the start,
1..3 = needs that upgrade stage; nations = list of countries whose facility of that type makes it.
Usage: python3 tools/facility_items.py  (run from repo root; needs /home/claude/gs and /home/claude/gts_tw)
"""
import json, re, glob, collections
GS = '/home/claude/gs/Online/Village/'
TXT = {}
for f in ['/home/claude/gts_tw/OnlineText.dat'] + sorted(glob.glob('/home/claude/gts_tw/*.dat')):
    raw = open(f, 'rb').read()
    txt = raw.decode('utf-16', 'ignore') if raw[:2] in (b'\xff\xfe', b'\xfe\xff') else raw.decode('utf-8', 'ignore')
    for l in txt.splitlines():
        m = re.match(r'^0*(\d+)\t(.*)$', l.rstrip('\n'))
        if m: TXT.setdefault(int(m.group(1)), m.group(2).strip())
rd = lambda f: [l.rstrip('\r\n').split('\t') for l in open(GS + f, 'rb').read().decode('cp949', 'replace').splitlines()]
NAT = ['朝鮮', '日本', '中國／台灣', '蒙古']
# building (Factory.txt): code -> (zh, [facility codes])
bld = {}
for r in rd('Factory.txt'):
    if len(r) > 20 and re.fullmatch(r'[A-Z]{3}', r[0] or '') and r[2].isdigit():
        bld[r[0]] = (TXT.get(int(r[2]), r[1]), [x for x in r[6:21] if x and x != '0'])
fac_bld = collections.defaultdict(list)
for b, (zh, fs) in bld.items():
    for f in fs:
        if f != 'STG': fac_bld[f].append(zh)
D = json.load(open('data.json', encoding='utf-8')); I = D['items']
bycode = {}
for k, e in I.items():
    if e.get('code') is not None: bycode.setdefault(int(e['code']), []).append(k)
hit = collections.defaultdict(dict)   # item -> {facility zh: {nation: min tier}}
for r in rd('Facility.txt'):
    if len(r) < 10 or not re.fullmatch(r'[A-Z]{3}', r[0] or '') or not r[1].isdigit() or r[0] == 'STG': continue
    fz = TXT.get(int(r[1]), r[2])
    for ci in range(4, min(len(r), 4 + 160)):
        v = r[ci].strip()
        if not v.isdigit() or v == '0': continue
        off = ci - 4; nat, tier = NAT[off // 40], (off % 40) // 10
        for k in bycode.get(int(v), []):
            d = hit[k].setdefault((fz, r[0]), {})
            d[nat] = min(d.get(nat, 9), tier)
n = 0
for k, fs in hit.items():
    out = []
    for (fz, code), nd in fs.items():
        t = min(nd.values())
        out.append([fz, '、'.join(fac_bld.get(code, [])), t, [x for x in NAT if x in nd]])
    out.sort(key=lambda x: x[2])
    I[k]['fac'] = out; n += 1
json.dump(D, open('data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('items with facility', n)
