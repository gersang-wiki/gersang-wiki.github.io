// 將巨商數值轉換成 Survivors 戰鬥數值（遊戲化改編）
import GS from './gsdata.js';
export { GS };

export const RUN_SECONDS = 10 * 60;
export const MID_BOSS_AT = 5 * 60;
export const SLOTS = ['W', 'A', 'H', 'G', 'B', 'S', 'R', 'P'];
export const SLOT_NAME = { W: '武器', A: '盔甲', H: '頭盔', G: '手套', B: '腰帶', S: '鞋子', R: '戒指', P: '飾物' };
export const HEROES = ['guC00', 'guC01'];
// 主角轉職要求等級（原作冇列明，遊戲化設定）
const HERO_JOB_LV = { guC02: 30, guC03: 30, guB10: 100, guB11: 100 };

export const M = id => GS.mercs[id];
export const mercName = id => (GS.mercs[id] || GS.foreign[id] || { zh: id }).zh;
export const itemName = id => (GS.items[id] || { zh: id }).zh;

// ---------- exp ----------
const EXP = GS.exp; // [lv, cumulative]
export const MAX_LV = EXP.length;
export function levelFromExp(exp) {
  let lv = 1;
  for (const [l, need] of EXP) { if (exp >= need) lv = l; else break; }
  return lv;
}
export function expProgress(exp) {
  const lv = levelFromExp(exp), cur = EXP[lv - 1]?.[1] ?? 0, next = EXP[lv]?.[1] ?? cur + 1;
  return { lv, cur: exp - cur, need: next - cur };
}

// ---------- attack style ----------
export function styleOf(id) {
  const m = M(id); if (!m) return 'melee';
  if (id === 'guU00') return 'porter';
  if (m.hero) return { guC00: 'coin', guC01: 'coin', guC02: 'arrow', guC03: 'coin', guB10: 'arrow', guB11: 'bullet' }[id];
  const n = m.zh;
  if (/車/.test(n)) return /雷/.test(n) ? 'needle' : 'arrow';
  if (/朱蒙/.test(n)) return 'arrow';
  if (/崔茂宣/.test(n)) return 'bullet';
  switch (m.wt) {
    case '弓箭': return 'arrow';
    case '針': return 'needle';
    case '劍': case '鐵刀': case '手環': return 'melee';
    case '長槍': return 'sweep';
    case '木魚': case '扇': return 'orb';
  }
  if (m.int > Math.max(m.str, m.dex)) return 'orb';
  return 'melee';
}
const BASE_CD = { arrow: 1.0, needle: 1.1, melee: 0.8, sweep: 1.1, orb: 1.4, bullet: 1.7, coin: 0.8, porter: 99 };
export const STYLE_NAME = { arrow: '遠程・弓', needle: '遠程・針', melee: '近戰', sweep: '近戰・橫掃', orb: '法術・範圍', bullet: '遠程・砲', coin: '遠程・銅錢', porter: '挑夫・拾取 +30% 銀兩 +20%' };

function primaryStat(m, style) {
  if (style === 'orb') return m.int;
  if (style === 'melee' || style === 'sweep') return m.str;
  return m.dex;
}
export function equipBonus(equip) {
  const b = { atk: 0, s: 0, d: 0, i: 0, v: 0, ac: 0 };
  for (const slot of SLOTS) {
    const it = equip && equip[slot] && GS.items[equip[slot]]; if (!it || !it.eq) continue;
    const e = it.eq;
    if (e.mn != null) b.atk += ((e.mn || 0) + (e.mx || 0)) / 2;
    b.s += e.s || 0; b.d += e.d || 0; b.i += e.i || 0; b.v += e.v || 0; b.ac += e.ac || 0;
  }
  return b;
}
// unit = {id, lv, equip}
export function combatStats(unit) {
  const m = M(unit.id), style = styleOf(unit.id), eb = equipBonus(unit.equip);
  const stat = primaryStat(m, style) + (style === 'orb' ? eb.i : style === 'melee' || style === 'sweep' ? eb.s : eb.d);
  const atk = (m.atk[0] + m.atk[1]) / 2 + eb.atk;
  const dmg = 4 * Math.pow(atk, 0.85) * (1 + unit.lv * 0.06) * (1 + stat / 150);
  const cd = BASE_CD[style] / (1 + (m.dex + eb.d) / 400);
  const hp = Math.round(m.hp + unit.lv * 8 + (m.str + eb.v) * 1.5 + eb.v * 2);
  return { style, dmg, cd, hp, ac: m.ac + eb.ac, range: { arrow: 300, needle: 240, orb: 240, bullet: 340, coin: 280 }[style] || 0 };
}

// ---------- skills: parse description into an effect ----------
export function skillEffect(sk) {
  const d = (sk.d || '') + sk.n;
  if (/恢復|淨化|治療/.test(d)) return 'heal';
  if (/暫停|捕縛|陷阱|設伏|八門|降低移動/.test(d)) return 'bind';
  if (/召喚|分身/.test(d)) return 'summon';
  if (/直線|前方/.test(d)) return 'line';
  if (/閃電|雷/.test(d)) return 'lightning';
  if (/火|砲彈|震天/.test(d)) return 'fire';
  if (/連射|自動發射/.test(d)) return 'volley';
  if (/提升|增加|激勵|敏捷|信物/.test(d)) return 'buff';
  if (/無法|沉默|失明/.test(d)) return 'bind';
  if (/熄火/.test(d)) return 'fire';
  return 'blast';
}
export const SKILL_CD = { heal: 6, bind: 7, summon: 9, line: 5, lightning: 5, fire: 6, volley: 4, buff: 12, blast: 5 };

// ---------- job change & fusion ----------
export function jobTargets(id) {
  return (M(id)?.to || []).filter(t => t.k === '轉職' && GS.mercs[t.id]).map(t => {
    const lv = t.lv || HERO_JOB_LV[t.id] || 100;
    const from = (GS.mercs[t.id].from || []).find(f => f.id === id) || { items: [] };
    return { to: t.id, lv, items: scaleItems(from.items), cost: lv * 400 };
  });
}
function scaleItems(items) { return (items || []).map(([i, q]) => [i, Math.max(1, Math.ceil(q / 5))]); }
export const FUSION_RECIPES = Object.entries(GS.mercs)
  .filter(([, m]) => m.from.some(f => f.k === '合成' || f.k === '傳說'))
  .map(([out, m]) => {
    const parts = m.from.filter(f => f.k === '合成' || f.k === '傳說');
    return { out, kind: parts[0].k, mercs: parts.map(f => f.id), items: scaleItems(parts.flatMap(f => f.items || [])),
      locked: parts.some(f => !GS.mercs[f.id]) };
  });
export function itemPrice(id) { const it = GS.items[id]; return Math.max(200, Math.round((it?.p || 4000) / 20)); }
export function sellPrice(id) { const it = GS.items[id]; return Math.max(1, Math.round((it?.p || 100) / 50)); }

export function canEquip(unit, itemId) {
  const it = GS.items[itemId]; if (!it || !it.eq) return false;
  const m = M(unit.id);
  if ((it.eq.lv || 0) > unit.lv) return false;
  if (it.eq.g !== 'W') return true;
  if (it.only) return (GS.groups[it.only] || []).includes(unit.id.slice(2)) || (it.only.startsWith('C_Main') && m.hero);
  return !!m.wt && it.eq.wt === m.wt;
}

// ---------- hiring ----------
export const HIRABLE = Object.entries(GS.mercs).filter(([id, m]) => m.hire && !m.hero && !m.from.length && m.cost > 0 && /^guU/.test(id)).map(([id]) => id);
export const hireCost = id => Math.round(M(id).cost / 20);
export const partySize = heroLv => Math.min(8, 2 + Math.floor(heroLv / 8));
// monster mercs that can be tamed when their monster appears
export const TAMEABLE = Object.fromEntries(Object.entries(GS.mercs).filter(([id, m]) => /^guM/.test(id) && m.cost > 0).map(([id, m]) => [m.zh, id]));

// ---------- enemies ----------
export function enemyStats(mon, isBoss, zone) {
  let hp = 3 * Math.pow(mon.hp, 0.75);
  if (isBoss) {
    const regMed = zone.reg.map(x => 3 * Math.pow(x.hp, 0.75)).sort((a, b) => a - b)[Math.floor(zone.reg.length / 2)];
    hp = Math.max(regMed * 40, Math.min(hp, regMed * 120));
  }
  return { hp, dmg: 4 + 2 * Math.pow(mon.atk, 0.6) * (isBoss ? 1.5 : 1), speed: isBoss ? 55 : 50 + (mon.hp % 7) * 6, r: isBoss ? 30 : 12 + Math.min(6, Math.log10(mon.hp + 1) * 1.5) };
}
