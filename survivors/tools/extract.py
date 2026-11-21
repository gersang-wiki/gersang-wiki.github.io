import json, re, math, statistics, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
M, IT, MO, SK, G = d['mercs'], d['items'], d['monsters'], d['skills'], d['grp']

def code(mid): return mid[2:]  # guU02 -> U02
weapon_groups = {k: set(v) for k, v in G.items()}
WT_OF_GROUP = {}
for it in IT.values():
    eq = it.get('eq') or {}
    if it.get('cat') == '武器' and eq.get('only') and eq.get('wt'):
        WT_OF_GROUP.setdefault(eq['only'], eq['wt'])
def weapon_type(mid):
    c = code(mid)
    if mid.startswith('guC') or mid.startswith('guB'): return '主角武器'
    for g, wt in WT_OF_GROUP.items():
        if g in weapon_groups and c in weapon_groups[g] and g != 'C_Doll': return wt
    return None

# --- which mercs: Joseon + Joseon heroes
sel = {k: v for k, v in M.items() if v.get('nat') == '朝鮮'}
def skills_of(v):
    r = []
    for s in (v.get('sk') or []):
        x = SK.get(s) or {}
        r.append({'id': s, 'n': x.get('zh') or s, 'd': (x.get('mdesc') or {}).get('zh') or '', 'r': x.get('range')})
    return r
mercs = {}
for k, v in sel.items():
    st = v.get('st') or {}
    mercs[k] = {
        'zh': v['zh'], 'ko': v.get('ko'), 'en': v.get('en'), 'desc': (v.get('desc') or {}).get('zh', ''),
        'hero': k.startswith('guC') or k.startswith('guB'), 'sex': v.get('sex'),
        'lv': st.get('lv') or 0, 'cost': st.get('cost') or 0, 'atk': st.get('atk') or [1, 2], 'hp': st.get('hp') or 50,
        'str': st.get('str') or 0, 'dex': st.get('dex') or 0, 'int': st.get('int') or 0, 'ac': st.get('ac') or 0,
        'credit': st.get('credit'), 'wt': weapon_type(k), 'sk': skills_of(v), 'el': v.get('el'),
        'legend': bool(v.get('legend')),
        'to': [{'id': t['id'], 'k': t['k'], 'lv': t.get('lv')} for t in v.get('to', [])],
        'from': [{'id': f['id'], 'k': f['k'], 'lv': f.get('lv'), 'items': f.get('items', [])} for f in v.get('from', [])],
        'hire': bool(v.get('hire')),
    }
# referenced-but-foreign mercs (for showing locked recipe ingredients)
foreign = {}
for v in mercs.values():
    for f in v['from'] + v['to']:
        if f['id'] not in mercs and f['id'] in M:
            foreign[f['id']] = {'zh': M[f['id']]['zh'], 'nat': M[f['id']].get('nat')}

# --- zones (Joseon), order by median hp
zones = {}
for k, v in MO.items():
    if v.get('nat') == '朝鮮' and v.get('zone') and v.get('hp'):
        zones.setdefault(v['zone'], []).append(k)
def parse_atk(s):
    n = [int(x) for x in re.findall(r'\d+', str(s or '1'))]
    return sum(n) / len(n) if n else 1
zone_list = []
for zn, ids in zones.items():
    hps = sorted(MO[i]['hp'] for i in ids)
    med = statistics.median(hps)
    mons = []
    for i in ids:
        m = MO[i]
        mons.append({'id': i, 'zh': m['zh'], 'hp': m['hp'], 'exp': m.get('exp') or 1, 'atk': parse_atk(m.get('atk')),
                     'move': m.get('move'), 'drops': [[x['i'], float(re.sub(r'[^0-9.]','',str(x.get('p','1')) ) or 1) / 100] for x in m.get('drops', []) if x.get('i') in IT]})
    mons.sort(key=lambda x: x['hp'])
    # regular = lower part, bosses = big outliers
    reg = [x for x in mons if x['hp'] <= med * 4] or mons[:1]
    boss = [x for x in mons if x['hp'] > med * 4]
    if not boss: boss = [mons[-1]]; reg = mons[:-1] or mons
    zone_list.append({'zh': zn, 'med': med, 'reg': reg, 'boss': boss})
zone_list.sort(key=lambda z: z['med'])

# --- items: equipment usable by selected mercs' weapon types + armour etc. lv<=200, recipe materials, drops
need = set()
for v in mercs.values():
    for f in v['from']:
        for i, q in f['items']: need.add(i)
for z in zone_list:
    for m in z['reg'] + z['boss']:
        for i, p in m['drops']: need.add(i)
wts = {v['wt'] for v in mercs.values() if v['wt']}
def price(it):
    m = re.search(r'價格\s*([\d,]+)', it.get('desc', ''))
    return int(m.group(1).replace(',', '')) if m else 0
items = {}
for k, it in IT.items():
    eq = it.get('eq') or {}
    keep = k in need
    shop = '村莊' in it.get('desc', '') and '販售' in it.get('desc', '')
    if eq and eq.get('g') in 'WAHGBRSP' and (eq.get('lv') or 0) <= 200:
        if eq['g'] == 'W': keep = keep or (eq.get('wt') in wts and shop) or (eq.get('only') in ('C_Main', 'C_Main2nd') and (eq.get('lv') or 0) <= 150)
        else: keep = keep or shop
    if not keep: continue
    items[k] = {'zh': it['zh'], 'cat': it.get('cat'), 'p': price(it), 'shop': shop,
                'eq': {kk: eq[kk] for kk in ('g', 'mn', 'mx', 'lv', 'wt', 'ac', 's', 'd', 'v', 'i') if kk in eq} if eq else None,
                'only': eq.get('only') if eq else None}
groups = {g: sorted(c for c in weapon_groups[g] if 'gu' + c in mercs or g in ('C_Main','C_Main2nd')) for g in {i['only'] for i in items.values() if i['only']} if g in weapon_groups}

expt = [[r[0], r[1]] for r in d['lv'][:200]]
data = {'mercs': mercs, 'foreign': foreign, 'zones': zone_list, 'items': items, 'groups': groups, 'exp': expt}
open(out, 'w').write('// 由 tools/extract.py 從 gersang-wiki/data.json 生成，唔好手改\nexport default ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(mercs), 'mercs', len(foreign), 'foreign', len(zone_list), 'zones', len(items), 'items', 'wts', wts)
for z in zone_list: print(z['zh'], round(z['med']), [m['zh'] for m in z['reg']], '| boss', [m['zh'] for m in z['boss']])
print({k: (v['zh'], v['wt']) for k, v in mercs.items()})
