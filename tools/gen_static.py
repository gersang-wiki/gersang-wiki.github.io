"""Build crawlable static pages (w/*.html), index pages and sitemap.xml from data.json.
Run from repo root: python3 tools/gen_static.py"""
import json, os, re, html, shutil, datetime
SITE = 'https://gersang-wiki.github.io'
D = json.load(open('data.json', encoding='utf-8'))
OUT = 'w'
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)

E = lambda s: html.escape(str(s), quote=True)
TYPES = {'items': '道具', 'mercs': '傭兵', 'monsters': '怪物', 'places': '地圖', 'npcs': 'NPC', 'quests': '任務', 'skills': '技能'}
ALL = {}
for t in TYPES:
    for k, e in D[t].items(): ALL[k] = (t, e)
def T(x):
    if isinstance(x, dict): return x.get('zh') or x.get('en') or ''
    return x or ''
def name(k):
    e = ALL.get(k, (0, {}))[1]; return e.get('zh') or e.get('en') or e.get('ko') or k
def link(k, extra=''):
    if k not in ALL: return E(k)
    return f'<a href="{k}.html">{E(name(k))}</a>{extra}'
H = re.compile(r'[가-힣]')

# reverse indexes
dropby, usedin, monat, npcat, questof, rewardof = {}, {}, {}, {}, {}, {}
for k, m in D['monsters'].items():
    for d in m.get('drops') or []: dropby.setdefault(d.get('i'), []).append((k, d.get('p', '')))
    for p in m.get('at') or []: monat.setdefault(p, []).append(k)
for k, it in D['items'].items():
    for r in it.get('recipe') or []: usedin.setdefault(r.get('i'), []).append((k, r.get('q', '')))
for k, n in D['npcs'].items():
    for p in (n.get('at') or []) if isinstance(n.get('at'), list) else [n.get('at')]:
        if p: npcat.setdefault(p, []).append(k)
for k, q in D['quests'].items():
    if q.get('npc'): questof.setdefault(q['npc'], []).append(k)
    for r in q.get('reward') or []: rewardof.setdefault(r.get('i'), []).append(k)

CSS = ('body{font:16px/1.65 system-ui,-apple-system,"Noto Sans TC","Microsoft JhengHei",sans-serif;max-width:860px;margin:0 auto;padding:16px;color:#222;background:#faf8f3}'
       'a{color:#8a4b0f}h1{margin:.2em 0}.names{color:#666;margin:0 0 12px}.open{display:inline-block;background:#8a4b0f;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0 16px}'
       'section{background:#fff;border:1px solid #e6e0d4;border-radius:10px;padding:12px 16px;margin:12px 0}h2{font-size:1.05em;margin:0 0 8px}'
       'ul{margin:0;padding-left:1.2em}dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:0}dt{color:#666}dd{margin:0}'
       'nav{font-size:.9em;color:#666}footer{font-size:.85em;color:#888;margin:24px 0}')

def page(k, title, names, desc, body, crumb):
    url = f'{SITE}/{OUT}/{k}.html'
    meta = re.sub(r'\s+', ' ', desc)[:155]
    return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}｜巨商百科</title><meta name="description" content="{E(meta)}"><link rel="canonical" href="{url}">
<meta property="og:title" content="{E(title)}｜巨商百科"><meta property="og:description" content="{E(meta)}"><meta property="og:url" content="{url}">
<link rel="stylesheet" href="s.css"></head><body>
<nav><a href="/">巨商百科</a> › {crumb}</nav>
<h1>{E(title)}</h1><p class="names">{E(names)}</p>
<a class="open" href="/#{k}">喺巨商百科打開完整資料 →</a>
{body}
<footer>巨商（Gersang）百科：道具、傭兵、怪物、地圖、任務、合成材料同成本計算。資料來源：《巨商》遊戲資料檔。<br><a href="/">首頁</a> ・ {' ・ '.join(f'<a href="{t}.html">{n}</a>' for t, n in TYPES.items())}</footer>
</body></html>'''

def sec(title, inner): return f'<section><h2>{E(title)}</h2>{inner}</section>' if inner else ''
def ul(xs, cap=300): return '<ul>' + ''.join(f'<li>{x}</li>' for x in xs[:cap]) + '</ul>' if xs else ''
def dl(pairs): return '<dl>' + ''.join(f'<dt>{E(a)}</dt><dd>{E(b)}</dd>' for a, b in pairs if b not in (None, '')) + '</dl>' if pairs else ''
def lines(s): return ''.join(f'<p>{E(l)}</p>' for l in str(s).split('\n') if l.strip())

def build(k, t, e):
    zh, en, ko = e.get('zh') or '', e.get('en') or '', e.get('ko') or ''
    title = zh or en or ko or k
    names = ' ／ '.join(x for x in (en, ko) if x and x != title)
    descs, body = [], ''
    if t == 'items':
        d = str(e.get('desc', '')).split('\n'); flavor = [x for x in d if '｜' not in x and not x.startswith('取得')]
        stats = [x for x in d if '｜' in x]
        descs = [f'{title}（{e.get("cat","")}{"・"+e["sub"] if e.get("sub") else ""}）'] + flavor
        kv = []
        for s in stats:
            for p in s.split('｜'):
                m = re.match(r'^(.*?)\s*(-?[\d.,]+)$', p.strip())
                if m: kv.append((m.group(1), m.group(2)))
        fv = re.search(r'可兌換\s*([\d.]+)\s*(億|萬)?兩', '\n'.join(flavor))
        out = []
        for a, b in kv:
            if a == '價格':
                v = int(b.replace(',', ''))
                if fv: out.append(('面值', f'{fv.group(1)}{fv.group(2) or ""}兩'))
                else: out += [('基本價格', f'{v:,} 兩'), ('賣 NPC', f'{v//3:,} 兩')]
            else: out.append((a, b))
        kv = out
        body += sec('說明', lines('\n'.join(flavor + [x for x in d if x.startswith('取得')])) + (f'<p>{E(e["note"])}</p>' if e.get('note') else ''))
        body += sec('資料', dl([('分類', e.get('cat', '') + (' ／ ' + e['sub'] if e.get('sub') else ''))] + kv))
        rc = [dict(q='', **r) if 'q' not in r else r for r in e.get('recipe') or [] if r.get('i')]
        body += sec('製作材料', ul([link(r['i'], f' × {E(r["q"])}' if str(r['q']).isdigit() else (f'（{E(r["q"])}）' if r['q'] else '')) for r in rc]))
        body += sec('邊度掉落', ul([link(m, f'　{E(p)}') for m, p in dropby.get(k, [])]))
        body += sec('用嚟製作', ul([link(i, f' 需要 × {E(q)}') for i, q in usedin.get(k, [])]))
        body += sec('任務獎勵', ul([link(q) for q in rewardof.get(k, [])]))
    elif t == 'mercs':
        descs = [f'{title}（{e.get("nat","")}{e.get("cat","")}）', T(e.get('desc')), T(e.get('hire'))]
        st = e.get('st') or {}
        L = {'str': '力量', 'dex': '敏捷', 'vit': '體力', 'int': '智力', 'hp': '生命', 'mp': '魔力', 'ac': '防禦'}
        body += sec('說明', lines(T(e.get('desc'))) + (f'<p>{E(T(e.get("hire")))}</p>' if e.get('hire') else ''))
        body += sec('資料', dl([('國家', e.get('nat', '')), ('分類', e.get('cat', ''))] + [(L[a], st.get(a)) for a in L if a in st]))
        body += sec('技能', ul([link(s) for s in (e.get('sk') or []) if isinstance(s, str)]))
        body += sec('轉職／升級', ul([link(x) if isinstance(x, str) else E(str(x)) for x in (e.get('to') or [])][:50]))
    elif t == 'monsters':
        descs = [f'{title}：生命 {e.get("hp","")}、經驗 {e.get("exp","")}、{e.get("zone","")}']
        body += sec('資料', dl([('生命', e.get('hp')), ('經驗', e.get('exp')), ('攻擊', e.get('atk')), ('國家', e.get('nat')), ('區域', e.get('zone')), ('移動', e.get('move')), ('等級', e.get('grade'))]))
        body += sec('出現地點', ul([link(p) for p in e.get('at') or []]))
        dr = [link(d['i'], f'　{E(d.get("p",""))}') for d in e.get('drops') or []]
        body += sec('掉落道具', ul(dr))
        descs.append('掉落：' + '、'.join(name(d['i']) for d in (e.get('drops') or [])[:12]))
    elif t == 'places':
        descs = [f'{title}（{e.get("region","")}）'] 
        ms = monat.get(k, []); descs.append('怪物：' + '、'.join(name(m) for m in ms[:15]))
        body += sec('出現怪物', ul([link(m) for m in ms]))
        body += sec('NPC', ul([link(n) for n in npcat.get(k, [])]))
        body += sec('相連地圖', ul([link(p[0]) for p in e.get('pt') or [] if isinstance(p, list)]))
    elif t == 'npcs':
        descs = [f'{title}：' + '、'.join(e.get('fn') or []), e.get('role') or '']
        at = e.get('at') if isinstance(e.get('at'), list) else [e.get('at')] if e.get('at') else []
        body += sec('資料', dl([('功能', '、'.join(e.get('fn') or [])), ('說明', e.get('role'))]))
        body += sec('位置', ul([link(p) for p in at]))
        body += sec('任務', ul([link(q) for q in questof.get(k, [])]))
    elif t == 'quests':
        descs = [f'{title}（{e.get("qt","")}任務{"，等級 "+str(e["lv"]) if e.get("lv") else ""}）', T(e.get('task')), str(e.get('desc') or '')]
        body += sec('任務內容', lines(T(e.get('task'))) + lines(e.get('desc') or ''))
        body += sec('資料', dl([('類型', e.get('qt')), ('等級', e.get('lv'))]))
        body += sec('NPC', ul([link(e['npc'])] if e.get('npc') else []))
        body += sec('獎勵道具', ul([link(r['i'], f' × {E(r.get("q",""))}') for r in e.get('reward') or []]))
    elif t == 'skills':
        descs = [f'{title}（技能）', T(e.get('mdesc')) or T(e.get('desc'))]
        body += sec('說明', lines(T(e.get('mdesc')) or T(e.get('desc'))))
        body += sec('資料', dl([('消耗', e.get('cost')), ('範圍', e.get('range'))]))
        body += sec('使用傭兵', ul([link(u) for u in (e.get('users') or []) + (e.get('musers') or []) if isinstance(u, str)]))
    if en: descs.insert(1, en)
    desc = '。'.join(x.strip('。 ') for x in descs if x and not H.search(x)) + '。'
    return page(k, title, names, desc, body, f'<a href="{t}.html">{TYPES[t]}</a>')

open(f'{OUT}/s.css', 'w').write(CSS)
urls = [SITE + '/']
for t, label in TYPES.items():
    lis = []
    for k, e in D[t].items():
        if not (e.get('zh') or e.get('en')): continue
        open(f'{OUT}/{k}.html', 'w', encoding='utf-8').write(build(k, t, e))
        urls.append(f'{SITE}/{OUT}/{k}.html'); lis.append(link(k))
    idx = page(t, f'{label}一覽', f'全部 {len(lis)} 個{label}', f'巨商百科：全部 {len(lis)} 個{label}一覽。', sec(label, ul(lis, 100000)), f'<a href="{t}.html">{label}</a>')
    idx = idx.replace(f'<a class="open" href="/#{t}">', f'<a class="open" href="/#{ {"items":"items","mercs":"mercs","monsters":"monsters","places":"places","npcs":"npcs","quests":"quests","skills":"skills"}[t]}">')
    open(f'{OUT}/{t}.html', 'w', encoding='utf-8').write(idx); urls.append(f'{SITE}/{OUT}/{t}.html')
today = datetime.date.today().isoformat()
with open('sitemap.xml', 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for u in urls: f.write(f'<url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n')
    f.write('</urlset>\n')
print(len(urls), 'urls')
