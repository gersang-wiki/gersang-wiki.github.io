import { GS, M, mercName, itemName, RUN_SECONDS, MID_BOSS_AT, combatStats, styleOf, skillEffect, SKILL_CD, enemyStats, TAMEABLE, levelFromExp, partySize } from './rules.js';
import { drawGround, zoneTheme, mercSprite, monsterSprite, peddlerSprite, loadLocalPack, SCALE } from './render.js';
import { save, persist, openCamp, applyRunResult, hasSave, openNewGame } from './camp.js';

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
export const overlay = document.getElementById('overlay');
let W = 0, H = 0;
function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; ctx.imageSmoothingEnabled = false; }
addEventListener('resize', resize); resize();

export function setOverlay(html) { overlay.innerHTML = html; overlay.style.display = html ? 'flex' : 'none'; overlay.scrollTop = 0; }

// ---------------- input ----------------
const keys = new Set();
addEventListener('keydown', e => {
  keys.add(e.key.toLowerCase());
  if (game && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) togglePause();
  if (game && game.mode === 'levelup' && ['1', '2', '3'].includes(e.key)) pickChoice(+e.key - 1);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
cv.addEventListener('touchstart', e => { const t = e.changedTouches[0]; Object.assign(stick, { active: true, id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 }); e.preventDefault(); }, { passive: false });
cv.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) if (t.identifier === stick.id) {
    let dx = t.clientX - stick.ox, dy = t.clientY - stick.oy; const l = Math.hypot(dx, dy), m = 50;
    if (l > m) { dx = dx / l * m; dy = dy / l * m; } stick.dx = dx / m; stick.dy = dy / m;
  }
  e.preventDefault();
}, { passive: false });
const endTouch = e => { for (const t of e.changedTouches) if (t.identifier === stick.id) { stick.active = false; stick.dx = stick.dy = 0; } };
cv.addEventListener('touchend', endTouch); cv.addEventListener('touchcancel', endTouch);

// ---------------- helpers ----------------
const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function pickWeighted(list) { const tot = list.reduce((s, [, w]) => s + w, 0); let r = Math.random() * tot; for (const [v, w] of list) if ((r -= w) <= 0) return v; return list[0][0]; }
function nearestEnemy(x, y, maxR, exclude) {
  let best = null, bd = maxR * maxR;
  for (const e of game.enemies) { if (e.dead || (exclude && exclude.has(e))) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
export const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------------- run state ----------------
export let game = null;

function makeUnit(rec, isHero) {
  const st = combatStats(rec), m = M(rec.id);
  return { rec, id: rec.id, m, isHero, st, x: rand(-30, 30), y: rand(-30, 30), cd: rand(0, 0.6), face: 1, anim: rand(0, 1), atkFx: 0,
    atkUp: 0, spdUp: 0, skillLv: 0, dash: 0,
    skills: (m.sk || []).map(s => ({ ...s, fx: skillEffect(s), cd: rand(2, SKILL_CD[skillEffect(s)]) })) };
}

export function startRun(zoneIdx) {
  const zone = GS.zones[zoneIdx];
  const heroRec = save.roster.find(r => r.uid === 0);
  const hero = makeUnit(heroRec, true);
  const party = save.party.map(uid => save.roster.find(r => r.uid === uid)).filter(Boolean).map(r => makeUnit(r, false));
  const porter = party.filter(u => u.st.style === 'porter').length;
  game = {
    mode: 'play', zoneIdx, zone, theme: zoneTheme(zone.zh), t: 0, level: 1, xp: 0, xpNext: 5, pendingLevels: 0, kills: 0,
    silver: 0, exp: 0, loot: {}, tamed: [], porter,
    player: { x: 0, y: 0, hp: hero.st.hp, maxHp: hero.st.hp, speed: 150, inv: 0, face: 1, moving: false, anim: 0 },
    hero, mercs: party, temps: [], enemies: [], projs: [], gems: [], coins: [], fx: [], texts: [], fields: [],
    passives: {}, rerolls: 1 + Math.floor(levelFromExp(heroRec.exp) / 30), choices: [], spawnAcc: 0, boss: null, midDone: false, finalDone: false,
    peddler: null, nextPeddler: 150, buffT: 0, bonusDmg: 0, won: false, lootMsgT: 0,
  };
  hero.x = hero.y = 0;
  setOverlay('');
  banner(`${zone.zh}`);
}

function unitDmg(u) {
  let m = (1 + 0.2 * u.atkUp) * (1 + 0.1 * (game.passives.rally || 0) + game.bonusDmg) * (game.buffT > 0 ? 1.25 : 1);
  if (u.isHero) m *= 1 + 0.25 * (game.passives.coin || 0);
  return u.st.dmg * m;
}
const unitCd = u => u.st.cd / (1 + 0.15 * u.spdUp);

// ---------------- combat ----------------
function hitEnemy(e, dmg, kx = 0, ky = 0, kb = 0) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.08;
  if (kb) { const l = Math.hypot(kx, ky) || 1, f = e.boss ? 0.1 : 1; e.x += kx / l * kb * f; e.y += ky / l * kb * f; }
  if (game.texts.length < 70) game.texts.push({ x: e.x + rand(-6, 6), y: e.y - e.r - 8, v: Math.round(dmg), life: 0.6, big: dmg >= 200 });
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true; game.kills++;
  const mon = e.mon, g = game;
  g.exp += mon.exp;
  g.gems.push({ x: e.x, y: e.y, v: e.boss ? 40 : Math.max(1, Math.round(Math.sqrt(mon.exp) / 2)), big: e.boss || mon.exp > 50 });
  const coin = Math.round((4 + Math.sqrt(mon.hp) / 1.5) * (1 + 0.2 * g.porter));
  if (e.boss) for (let i = 0; i < 16; i++) g.coins.push({ x: e.x + rand(-40, 40), y: e.y + rand(-40, 40), v: coin * 4 });
  else if (Math.random() < 0.35) g.coins.push({ x: e.x, y: e.y, v: coin });
  for (const [it, p] of mon.drops) if (GS.items[it] && Math.random() < Math.min(0.25, p * (e.boss ? 20 : 1.5))) {
    g.loot[it] = (g.loot[it] || 0) + 1;
    if (g.lootMsgT <= 0) { g.texts.push({ x: e.x, y: e.y - 30, v: `獲得 ${itemName(it)}`, life: 1.2, loot: true }); g.lootMsgT = 0.4; }
  }
  const tame = TAMEABLE[mon.zh];
  if (tame && !e.boss && !g.tamed.includes(tame) && Math.random() < 0.003) { g.tamed.push(tame); banner(`收服咗 ${mon.zh}！`); }
  g.fx.push({ kind: 'puff', x: e.x, y: e.y, life: 0.3, max: 0.3 });
  if (e.boss) { if (g.boss === e) g.boss = g.enemies.find(x => x.boss && !x.dead) || null; if (e.final) { g.won = true; endRun(true); } }
}
function spawnEnemy(mon, isBoss, final) {
  const p = game.player, a = rand(0, Math.PI * 2), R = Math.hypot(W, H) / 2 + 40;
  const s = enemyStats(mon, isBoss, game.zone), scale = isBoss ? (final ? 1 : 0.6) : 1 + game.t / 60 * 0.08;
  const e = { mon, boss: isBoss, final, x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, hp: s.hp * scale, maxHp: s.hp * scale, dmg: s.dmg, speed: s.speed, r: s.r, flash: 0, slow: 0, anim: rand(0, 1), face: 1, dead: false };
  game.enemies.push(e); return e;
}
function healPlayer(v) {
  const p = game.player; if (p.hp >= p.maxHp) return;
  p.hp = Math.min(p.maxHp, p.hp + v); game.texts.push({ x: p.x, y: p.y - 44, v: '+' + Math.round(v), life: 0.8, heal: true });
}

function basicAttack(u, t) {
  const dmg = unitDmg(u), dx = t.x - u.x, dy = t.y - u.y, l = Math.hypot(dx, dy) || 1;
  u.face = dx < 0 ? -1 : 1; u.atkFx = 0.15;
  const P = (o) => game.projs.push(Object.assign({ x: u.x, y: u.y - 12, dmg, pierce: 1, hit: new Set() }, o));
  switch (u.st.style) {
    case 'arrow': P({ vx: dx / l * 540, vy: dy / l * 540, life: 0.8, kind: 'arrow', pierce: 1 + Math.floor(u.rec.lv / 40) }); break;
    case 'needle': for (const a of [-0.15, 0, 0.15]) { const c = Math.cos(a), s = Math.sin(a); P({ vx: (dx * c - dy * s) / l * 480, vy: (dx * s + dy * c) / l * 480, life: 0.6, kind: 'needle', dmg: dmg * 0.45 }); } break;
    case 'orb': P({ vx: dx / l * 320, vy: dy / l * 320, life: 1.1, kind: 'orb', splash: 55 }); break;
    case 'bullet': P({ vx: dx / l * 800, vy: dy / l * 800, life: 0.6, kind: 'bullet', dmg: dmg * 1.6, pierce: 2 }); game.fx.push({ kind: 'flash', x: u.x + dx / l * 14, y: u.y - 12 + dy / l * 14, life: 0.08, max: 0.08 }); break;
    case 'coin': {
      const hit = new Set([t]); const n = 1 + Math.floor((game.passives.coin || 0) / 2);
      for (let i = 0; i < n; i++) { const tt = i === 0 ? t : nearestEnemy(u.x, u.y, 280, hit); if (!tt) break; hit.add(tt); const ddx = tt.x - u.x, ddy = tt.y - u.y, ll = Math.hypot(ddx, ddy) || 1; P({ vx: ddx / ll * 460, vy: ddy / ll * 460, life: 0.8, kind: 'coin' }); }
      break;
    }
  }
}

function castSkill(u, sk) {
  const g = game, base = unitDmg(u) * (1 + 0.4 * u.skillLv), p = g.player;
  const t = nearestEnemy(u.x, u.y, 380);
  if (!t && !['heal', 'buff'].includes(sk.fx)) return false;
  g.texts.push({ x: u.x, y: u.y - 50, v: sk.n.replace(/\(.*\)/, ''), life: 1.0, skill: true });
  switch (sk.fx) {
    case 'heal': healPlayer(p.maxHp * 0.15 * (1 + 0.3 * u.skillLv)); g.fx.push({ kind: 'healfx', x: p.x, y: p.y, life: 0.5, max: 0.5 }); break;
    case 'buff': g.buffT = 6 + u.skillLv * 2; g.fx.push({ kind: 'ring', x: p.x, y: p.y, r: 120, life: 0.5, max: 0.5, col: '#ffd84a' }); break;
    case 'bind': g.fields.push({ x: t.x, y: t.y, r: 95, life: 3.5, dps: base * 0.6, tick: 0, col: 'bind' }); break;
    case 'summon': {
      const clone = makeUnit(u.rec, false); clone.x = u.x; clone.y = u.y; clone.life = 8 + 2 * u.skillLv; clone.atkUp = u.atkUp; clone.skills = []; clone.ghost = true;
      if (clone.st.style === 'porter') break; g.temps.push(clone); break;
    }
    case 'line': {
      const dx = t.x - u.x, dy = t.y - u.y, l = Math.hypot(dx, dy) || 1;
      g.projs.push({ x: u.x, y: u.y - 12, vx: dx / l * 700, vy: dy / l * 700, life: 0.9, kind: 'beam', dmg: base * 4, pierce: 99, hit: new Set() }); break;
    }
    case 'lightning': {
      const hit = new Set();
      for (let i = 0; i < 4 + u.skillLv; i++) { const e = nearestEnemy(t.x + rand(-120, 120), t.y + rand(-120, 120), 200, hit); if (!e) break; hit.add(e);
        g.fx.push({ kind: 'strike', x: e.x, y: e.y, life: 0.25, max: 0.25 }); for (const o of g.enemies) if (!o.dead && dist2(o, e) < 50 * 50) hitEnemy(o, base * 2.5); }
      break;
    }
    case 'fire': g.fx.push({ kind: 'fire', x: t.x, y: t.y, r: 110, life: 0.5, max: 0.5 }); for (const e of g.enemies) if (!e.dead && dist2(e, t) < 110 * 110) hitEnemy(e, base * 3.5); break;
    case 'volley': { const dx = t.x - u.x, dy = t.y - u.y, b = Math.atan2(dy, dx);
      for (let i = -3; i <= 3; i++) { const a = b + i * 0.12; g.projs.push({ x: u.x, y: u.y - 12, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, life: 0.8, kind: 'arrow', dmg: base * 1.3, pierce: 2, hit: new Set() }); }
      break; }
    default: g.fx.push({ kind: 'ring', x: t.x, y: t.y, r: 75, life: 0.3, max: 0.3, col: '#ffb060' }); for (const e of g.enemies) if (!e.dead && dist2(e, t) < 75 * 75) hitEnemy(e, base * 3);
  }
  return true;
}

function updateUnit(u, i, n, dt) {
  const p = game.player;
  u.cd -= dt; u.atkFx = Math.max(0, u.atkFx - dt);
  for (const sk of u.skills) { sk.cd -= dt; if (sk.cd <= 0) { if (castSkill(u, sk)) sk.cd = SKILL_CD[sk.fx] * (1 - 0.1 * u.skillLv); else sk.cd = 1; } }
  if (u.isHero) { u.x = p.x; u.y = p.y; u.face = p.face; u.anim = p.anim;
    if (u.cd <= 0) { const t = nearestEnemy(p.x, p.y, u.st.range || 280); if (t) { u.cd = unitCd(u); basicAttack(u, t); } } return; }
  const ang = (i / Math.max(1, n)) * Math.PI * 2 + game.t * 0.2;
  let tx = p.x + Math.cos(ang) * 64, ty = p.y + Math.sin(ang) * 48, spd = Math.max(220, p.speed * 1.4);
  const style = u.st.style;
  if (style === 'melee' || style === 'sweep') {
    const t = nearestEnemy(p.x, p.y, 190);
    if (t) {
      const near = nearestEnemy(u.x, u.y, 260) || t; tx = near.x; ty = near.y; spd = 250;
      const reach = (style === 'sweep' ? 50 : 30) + near.r;
      if (dist2(u, near) < reach * reach) {
        tx = u.x; ty = u.y;
        if (u.cd <= 0) {
          u.cd = unitCd(u); u.atkFx = 0.15; u.face = near.x < u.x ? -1 : 1;
          if (style === 'sweep') { game.fx.push({ kind: 'ring', x: u.x, y: u.y, r: 58, life: 0.2, max: 0.2 }); for (const e of game.enemies) if (!e.dead && dist2(e, u) < (58 + e.r) ** 2) hitEnemy(e, unitDmg(u) * 0.8, e.x - u.x, e.y - u.y, 16); }
          else { game.fx.push({ kind: 'slash', x: near.x, y: near.y, life: 0.12, max: 0.12, f: u.face }); hitEnemy(near, unitDmg(u), near.x - u.x, near.y - u.y, 5); }
        }
      }
    }
  } else if (style !== 'porter' && u.cd <= 0) {
    const t = nearestEnemy(u.x, u.y, u.st.range || 260); if (t) { u.cd = unitCd(u); basicAttack(u, t); }
  }
  const dx = tx - u.x, dy = ty - u.y, l = Math.hypot(dx, dy);
  if (l > 4) { const s = Math.min(l, spd * dt * (l > 320 ? 3 : 1)); u.x += dx / l * s; u.y += dy / l * s; u.anim += dt * 2; if (Math.abs(dx) > 2) u.face = dx < 0 ? -1 : 1; }
}

function separate() {
  const cell = 32, grid = new Map(), E = game.enemies;
  for (const e of E) { const k = ((e.x / cell) | 0) * 100003 + ((e.y / cell) | 0); let b = grid.get(k); if (!b) grid.set(k, b = []); b.push(e); }
  for (const e of E) {
    const cx = (e.x / cell) | 0, cy = (e.y / cell) | 0;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const b = grid.get((cx + ox) * 100003 + cy + oy); if (!b) continue;
      for (const o of b) { if (o === e) continue; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), m = (e.r + o.r) * 0.8;
        if (d > 0 && d < m) { const w = o.boss ? 1 : e.boss ? 0 : 0.5, push = (m - d) * 0.5 * w; e.x += dx / d * push; e.y += dy / d * push; } }
    }
  }
}

export function update(dt) {
  const g = game, p = g.player;
  g.t += dt; g.buffT = Math.max(0, g.buffT - dt); g.lootMsgT -= dt;
  let mx = 0, my = 0;
  if (keys.has('w') || keys.has('arrowup')) my -= 1;
  if (keys.has('s') || keys.has('arrowdown')) my += 1;
  if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
  if (keys.has('d') || keys.has('arrowright')) mx += 1;
  if (stick.active) { mx = stick.dx; my = stick.dy; }
  const ml = Math.hypot(mx, my); p.moving = ml > 0.1;
  if (p.moving) { const s = p.speed * (1 + 0.1 * (g.passives.speed || 0)) * Math.min(1, ml) / ml; p.x += mx * s * dt; p.y += my * s * dt; p.anim += dt * 2.5; if (Math.abs(mx) > 0.1) p.face = mx < 0 ? -1 : 1; }
  p.inv = Math.max(0, p.inv - dt);

  // spawns: weight monsters by run progress
  const prog = Math.min(1, g.t / RUN_SECONDS), reg = g.zone.reg;
  if (!g.finalDone) {
    g.spawnAcc += dt * (1.0 + g.t / 60 * 0.6);
    while (g.spawnAcc >= 1 && g.enemies.length < 300) {
      g.spawnAcc -= 1;
      const c = prog * (reg.length - 1);
      spawnEnemy(pickWeighted(reg.map((m, i) => [m, Math.exp(-((i - c) ** 2) / 2) + 0.05])), false, false);
    }
  }
  const bosses = g.zone.boss;
  if (!g.midDone && g.t >= MID_BOSS_AT) { g.midDone = true; g.boss = spawnEnemy(bosses[0], true, false); banner(`${bosses[0].zh} 出現！`); }
  if (!g.finalDone && g.t >= RUN_SECONDS) { g.finalDone = true; const fb = bosses[bosses.length - 1]; g.boss = spawnEnemy(fb, true, true); banner(`首領 ${fb.zh} 出現！`); }

  if (!g.peddler && g.t >= g.nextPeddler) { const a = rand(0, Math.PI * 2); g.peddler = { x: p.x + Math.cos(a) * 320, y: p.y + Math.sin(a) * 320, life: 40, anim: 0 }; g.nextPeddler += 150; banner('行商人嚟咗！'); }
  if (g.peddler) { g.peddler.life -= dt; g.peddler.anim += dt; if (g.peddler.life <= 0) g.peddler = null; else if (dist2(g.peddler, p) < 34 * 34) openPeddler(); }

  updateUnit(g.hero, 0, 1, dt);
  const all = g.mercs.concat(g.temps);
  all.forEach((u, i) => updateUnit(u, i, all.length, dt));
  for (const t of g.temps) t.life -= dt;
  g.temps = g.temps.filter(t => t.life > 0);

  const ac = g.hero.st.ac;
  for (const e of g.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt); e.slow = Math.max(0, e.slow - dt);
    const dx = p.x - e.x, dy = p.y - e.y, l = Math.hypot(dx, dy) || 1;
    const s = e.speed * (e.slow > 0 ? 0.4 : 1) * dt; e.x += dx / l * s; e.y += dy / l * s; e.anim += dt * 2; e.face = dx < 0 ? -1 : 1;
    if (l < e.r + 12 && p.inv <= 0) {
      p.hp -= e.dmg * 100 / (100 + ac * 2); p.inv = 0.45; g.fx.push({ kind: 'hurt', x: p.x, y: p.y, life: 0.2, max: 0.2 });
      if (p.hp <= 0) { endRun(false); return; }
    }
    if (l > 1400 && !e.boss) { const a = rand(0, Math.PI * 2), R = Math.hypot(W, H) / 2 + 40; e.x = p.x + Math.cos(a) * R; e.y = p.y + Math.sin(a) * R; }
  }
  separate();

  for (const f of g.fields) { f.life -= dt; f.tick -= dt; for (const e of g.enemies) if (!e.dead && dist2(e, f) < f.r * f.r) { e.slow = 0.2; if (f.tick <= 0) hitEnemy(e, f.dps * 0.5); } if (f.tick <= 0) f.tick = 0.5; }
  g.fields = g.fields.filter(f => f.life > 0);

  for (const pr of g.projs) {
    pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
    for (const e of g.enemies) {
      if (e.dead || pr.hit.has(e)) continue;
      if (dist2(e, pr) < (e.r + (pr.kind === 'beam' ? 14 : 6)) ** 2) {
        pr.hit.add(e);
        if (pr.splash) { g.fx.push({ kind: 'ring', x: pr.x, y: pr.y, r: pr.splash, life: 0.25, max: 0.25, col: '#b080ff' }); for (const o of g.enemies) if (!o.dead && dist2(o, pr) < pr.splash ** 2) hitEnemy(o, pr.dmg); }
        else hitEnemy(e, pr.dmg, pr.vx, pr.vy, pr.kind === 'bullet' ? 12 : 3);
        if (--pr.pierce <= 0) { pr.life = 0; break; }
      }
    }
  }
  g.projs = g.projs.filter(pr => pr.life > 0);
  g.enemies = g.enemies.filter(e => !e.dead);

  const magnet = 70 * (1 + 0.35 * (g.passives.magnet || 0)) * (1 + 0.3 * g.porter);
  for (const list of [g.gems, g.coins]) for (const o of list) {
    const d2 = dist2(o, p);
    if (d2 < magnet * magnet || o.pull) { o.pull = true; const dx = p.x - o.x, dy = p.y - o.y, l = Math.hypot(dx, dy) || 1; o.x += dx / l * 520 * dt; o.y += dy / l * 520 * dt; }
    if (d2 < 16 * 16) { o.got = true; if (list === g.gems) gainXp(o.v); else g.silver += o.v; }
  }
  g.gems = g.gems.filter(o => !o.got); g.coins = g.coins.filter(o => !o.got);
  if (g.gems.length > 500) { const extra = g.gems.splice(0, g.gems.length - 400); g.gems.push({ x: extra[0].x, y: extra[0].y, v: extra.reduce((s, x) => s + x.v, 0), big: true }); }

  for (const f of g.fx) f.life -= dt; g.fx = g.fx.filter(f => f.life > 0);
  for (const t of g.texts) { t.life -= dt; t.y -= 30 * dt; } g.texts = g.texts.filter(t => t.life > 0);
  if (g.pendingLevels > 0 && g.mode === 'play') openLevelUp();
}
function gainXp(v) { const g = game; g.xp += v; while (g.xp >= g.xpNext) { g.xp -= g.xpNext; g.level++; g.pendingLevels++; g.xpNext = Math.floor(5 + g.level * 3 + Math.pow(g.level, 1.35)); } }

// ---------------- in-run level-up ----------------
const PASSIVES = {
  hp: { name: '人蔘', desc: '最大血量 +20%，並回復', max: 5 },
  speed: { name: '輕功', desc: '移動速度 +10%', max: 4 },
  magnet: { name: '算盤', desc: '拾取範圍 +35%', max: 4 },
  coin: { name: '主角修練', desc: '主角傷害 +25%', max: 5 },
  rally: { name: '軍令', desc: '全隊傷害 +10%', max: 5 },
};
function buildChoices() {
  const g = game, c = [];
  for (const u of [g.hero, ...g.mercs]) {
    if (u.st.style === 'porter') continue;
    const nm = mercName(u.id);
    if (u.atkUp < 5) c.push([{ t: 'atk', u, title: `${nm} 攻擊強化`, sub: `Lv ${u.atkUp} → ${u.atkUp + 1}`, desc: '攻擊力 +20%' }, 3]);
    if (u.spdUp < 3) c.push([{ t: 'spd', u, title: `${nm} 攻速強化`, sub: `Lv ${u.spdUp} → ${u.spdUp + 1}`, desc: '攻擊速度 +15%' }, 2]);
    if (u.skills.length && u.skillLv < 3) c.push([{ t: 'skill', u, title: `${u.skills.map(s => s.n.replace(/\(.*\)/, '')).join('・')}`, sub: `${nm} 技能 Lv ${u.skillLv + 1}`, desc: '技能傷害 +40%、冷卻 -10%', tag: 'job' }, 3]);
  }
  for (const k in PASSIVES) if ((g.passives[k] || 0) < PASSIVES[k].max) c.push([{ t: 'passive', k, title: PASSIVES[k].name, sub: `Lv ${g.passives[k] || 0} → ${(g.passives[k] || 0) + 1}`, desc: PASSIVES[k].desc }, 2]);
  const out = []; let guard = 0;
  while (out.length < 3 && c.length && guard++ < 60) { const x = pickWeighted(c); if (!out.includes(x)) out.push(x); }
  if (!out.length) out.push({ t: 'silver', title: '銀兩 +100', sub: '', desc: '全部滿晒' });
  return out;
}
function openLevelUp() { game.mode = 'levelup'; game.choices = buildChoices(); renderLevelUp(); }
function renderLevelUp() {
  setOverlay(`<div class="panel"><h2>升級！</h2><div class="cards">${game.choices.map((v, i) => `<button class="card ${v.tag || ''}" data-i="${i}"><div class="key">${i + 1}</div><div class="ct">${v.title}</div><div class="cs">${v.sub}</div><div class="cd">${v.desc}</div></button>`).join('')}</div>
    ${game.rerolls > 0 ? `<button class="btn small" id="reroll">重抽（剩 ${game.rerolls}）</button>` : ''}</div>`);
  overlay.querySelectorAll('.card').forEach(b => b.onclick = () => pickChoice(+b.dataset.i));
  const rr = document.getElementById('reroll'); if (rr) rr.onclick = () => { game.rerolls--; game.choices = buildChoices(); renderLevelUp(); };
}
export function pickChoice(i) {
  const g = game, c = g.choices[i]; if (!c || g.mode !== 'levelup') return;
  if (c.t === 'atk') c.u.atkUp++;
  else if (c.t === 'spd') c.u.spdUp++;
  else if (c.t === 'skill') c.u.skillLv++;
  else if (c.t === 'passive') { g.passives[c.k] = (g.passives[c.k] || 0) + 1; if (c.k === 'hp') { const add = Math.round(g.hero.st.hp * 0.2); g.player.maxHp += add; g.player.hp += add; } }
  else g.silver += 100;
  g.pendingLevels--;
  if (g.pendingLevels > 0) { g.choices = buildChoices(); renderLevelUp(); } else { g.mode = 'play'; setOverlay(''); }
}

function openPeddler() {
  game.mode = 'peddler';
  const items = [
    { id: 'potion', name: '人蔘湯', desc: '回復 50% 血量', cost: 30 },
    { id: 'whet', name: '磨刀石', desc: '全隊攻擊 +5%（本局）', cost: 120 },
  ];
  const render = () => {
    setOverlay(`<div class="panel"><h2>行商人</h2><p class="muted">本局銀兩：<b class="gold">${game.silver}</b></p><div class="cards">
      ${items.map((it, i) => `<button class="card shop" data-i="${i}" ${game.silver < it.cost ? 'disabled' : ''}><div class="ct">${it.name}</div><div class="cs gold">${it.cost} 兩</div><div class="cd">${it.desc}</div></button>`).join('')}
      </div><button class="btn" id="leave">告辭</button></div>`);
    overlay.querySelectorAll('.card').forEach(b => b.onclick = () => { const it = items[+b.dataset.i]; if (game.silver < it.cost) return; game.silver -= it.cost; if (it.id === 'potion') healPlayer(game.player.maxHp * 0.5); else game.bonusDmg += 0.05; render(); });
    document.getElementById('leave').onclick = () => { game.peddler = null; game.mode = 'play'; setOverlay(''); };
  };
  render();
}

let bannerText = '', bannerT = 0;
function banner(t) { bannerText = t; bannerT = 2.5; }
function togglePause() {
  if (game.mode === 'play') {
    game.mode = 'pause';
    setOverlay(`<div class="panel"><h2>暫停</h2><p>${game.zone.zh} ・ ${fmtTime(game.t)}</p><button class="btn" id="resume">繼續</button><button class="btn small" id="quit">撤退（保留經驗同戰利品）</button></div>`);
    document.getElementById('resume').onclick = togglePause; document.getElementById('quit').onclick = () => endRun(false);
  } else if (game.mode === 'pause') { game.mode = 'play'; setOverlay(''); }
}
export function endRun(win) {
  if (game.mode === 'over') return;
  game.mode = 'over';
  const res = applyRunResult(game, win);
  const lootList = Object.entries(game.loot).map(([i, n]) => `${itemName(i)} ×${n}`).join('、') || '（冇）';
  setOverlay(`<div class="panel"><h2>${win ? `${game.zone.zh} 平定！` : '撤退'}</h2>
    <p>存活 ${fmtTime(game.t)} ・ 擊殺 ${game.kills}</p>
    <p>經驗 <b>${Math.round(game.exp).toLocaleString()}</b> ・ 銀兩 <b class="gold">${res.silver.toLocaleString()} 兩</b>${win ? '（含平定獎勵）' : ''}</p>
    ${res.levelUps.length ? `<p>${res.levelUps.map(x => `${x.name} Lv ${x.from} → <b>${x.to}</b>`).join('<br>')}</p>` : ''}
    ${game.tamed.length ? `<p class="gold">收服：${game.tamed.map(mercName).join('、')}</p>` : ''}
    ${res.unlocked ? `<p class="gold">新地圖開放：${res.unlocked}</p>` : ''}
    <p class="muted">戰利品：${lootList}</p>
    <button class="btn" id="tocamp">返營地</button></div>`);
  document.getElementById('tocamp').onclick = () => { game = null; openCamp(); };
}

// ---------------- render ----------------
function draw() {
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, W, H);
  if (!game) { drawAttract(); return; }
  const g = game, p = g.player, camX = Math.round(p.x - W / 2), camY = Math.round(p.y - H / 2);
  drawGround(ctx, camX, camY, W, H, g.theme);
  const sx = x => Math.round(x - camX), sy = y => Math.round(y - camY);
  for (const f of g.fields) { ctx.fillStyle = 'rgba(240,220,90,0.18)'; ctx.strokeStyle = 'rgba(240,220,90,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), f.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  for (const gm of g.gems) { const s = gm.big ? 8 : 6; ctx.fillStyle = gm.big ? '#60e0ff' : '#40a0ff'; ctx.fillRect(sx(gm.x) - s / 2, sy(gm.y) - s / 2, s, s); }
  for (const c of g.coins) { ctx.fillStyle = '#e8c040'; ctx.fillRect(sx(c.x) - 5, sy(c.y) - 5, 10, 10); ctx.fillStyle = '#7a5a10'; ctx.fillRect(sx(c.x) - 2, sy(c.y) - 2, 4, 4); }

  const ents = [];
  for (const e of g.enemies) ents.push([e.y, () => drawEnemy(e, sx, sy)]);
  for (const u of g.mercs.concat(g.temps)) ents.push([u.y, () => drawUnit(u, sx(u.x), sy(u.y))]);
  ents.push([p.y, () => drawHero(sx(p.x), sy(p.y))]);
  if (g.peddler) ents.push([g.peddler.y, () => { const img = peddlerSprite(Math.floor(g.peddler.anim * 2) % 2); blit(img, sx(g.peddler.x), sy(g.peddler.y), 1); label('行商人', sx(g.peddler.x), sy(g.peddler.y) - 70, '#9fe0b0'); }]);
  ents.sort((a, b) => a[0] - b[0]).forEach(e => e[1]());

  for (const pr of g.projs) {
    const x = sx(pr.x), y = sy(pr.y), a = Math.atan2(pr.vy, pr.vx);
    if (pr.kind === 'arrow' || pr.kind === 'needle') { ctx.strokeStyle = pr.kind === 'arrow' ? '#e0d0a0' : '#e0e8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * (pr.kind === 'arrow' ? 12 : 7), y - Math.sin(a) * (pr.kind === 'arrow' ? 12 : 7)); ctx.lineTo(x, y); ctx.stroke(); }
    else if (pr.kind === 'bullet') { ctx.fillStyle = '#303030'; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = '#ffa040'; ctx.fillRect(x - 2, y - 2, 4, 4); }
    else if (pr.kind === 'orb') { ctx.fillStyle = '#b080ff'; ctx.fillRect(x - 6, y - 6, 12, 12); ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 2, 4, 4); }
    else if (pr.kind === 'beam') { ctx.strokeStyle = '#a0e0ff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 40, y - Math.sin(a) * 40); ctx.lineTo(x, y); ctx.stroke(); }
    else { ctx.fillStyle = '#e8c040'; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = '#7a5a10'; ctx.fillRect(x - 1, y - 1, 3, 3); }
  }
  for (const f of g.fx) drawFx(f, sx, sy);
  ctx.textAlign = 'center';
  for (const t of g.texts) {
    ctx.globalAlpha = clamp(t.life / 0.3, 0, 1); ctx.font = `bold ${t.skill ? 15 : t.big ? 18 : 13}px sans-serif`;
    ctx.fillStyle = '#000'; ctx.fillText(t.v, sx(t.x) + 1, sy(t.y) + 1);
    ctx.fillStyle = t.heal ? '#70ff90' : t.skill ? '#7ad0ff' : t.loot ? '#ffb060' : t.big ? '#ffd84a' : '#fff'; ctx.fillText(t.v, sx(t.x), sy(t.y));
  }
  ctx.globalAlpha = 1;
  if (g.peddler) edgeArrow(sx(g.peddler.x), sy(g.peddler.y), '#70e090');
  if (g.boss && !g.boss.dead) edgeArrow(sx(g.boss.x), sy(g.boss.y), '#ff5050');
  drawHud();
  if (stick.active) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 50, 0, 7); ctx.fill(); ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(stick.ox + stick.dx * 50, stick.oy + stick.dy * 50, 20, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
}
function blit(img, x, y, face, scale = SCALE) {
  const w = img.width * scale, h = img.height * scale;
  ctx.save(); ctx.translate(x, y); if (face < 0) ctx.scale(-1, 1); ctx.drawImage(img, -w / 2, -h + 6, w, h); ctx.restore();
}
function shadow(x, y, r) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y + 4, r, r * 0.4, 0, 0, 7); ctx.fill(); }
function label(t, x, y, col, size = 12) { ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(t, x + 1, y + 1); ctx.fillStyle = col; ctx.fillText(t, x, y); }
function drawEnemy(e, sx, sy) {
  const x = sx(e.x), y = sy(e.y);
  if (x < -100 || y < -120 || x > W + 100 || y > H + 120) return;
  const img = monsterSprite(e.mon, Math.floor(e.anim * 2) % 2);
  shadow(x, y, e.r);
  blit(img, x, y, e.face, e.boss ? SCALE * 1.8 : SCALE);
  if (e.flash > 0) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - e.r, e.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  if (e.boss) label(e.mon.zh, x, y + 22, '#ff8080', 13);
  else if (e.hp < e.maxHp) { ctx.fillStyle = '#300'; ctx.fillRect(x - 12, y + 8, 24, 3); ctx.fillStyle = '#e03030'; ctx.fillRect(x - 12, y + 8, 24 * e.hp / e.maxHp, 3); }
}
function drawUnit(u, x, y) {
  const img = mercSprite(u.id, u.m, Math.floor(u.anim * 2) % 2);
  shadow(x, y, 10);
  if (u.ghost) ctx.globalAlpha = 0.55;
  if (u.m.legend) { ctx.fillStyle = `rgba(255,216,74,${0.25 + 0.15 * Math.sin(game.t * 5)})`; ctx.beginPath(); ctx.arc(x, y - 22, 28, 0, 7); ctx.fill(); }
  blit(img, x, y - (u.atkFx > 0 ? 3 : 0), u.face);
  ctx.globalAlpha = 1;
  label(mercName(u.id), x, y + 18, u.m.legend ? '#ffb060' : '#e8e0c8', 11);
}
function drawHero(x, y) {
  const p = game.player, u = game.hero, img = mercSprite(u.id, u.m, p.moving ? Math.floor(p.anim * 2) % 2 : 0);
  shadow(x, y, 11);
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2) ctx.globalAlpha = 0.5;
  blit(img, x, y, p.face); ctx.globalAlpha = 1;
  ctx.fillStyle = '#300'; ctx.fillRect(x - 20, y + 10, 40, 5); ctx.fillStyle = '#40d060'; ctx.fillRect(x - 20, y + 10, 40 * clamp(p.hp / p.maxHp, 0, 1), 5);
}
function drawFx(f, sx, sy) {
  const a = f.life / f.max, x = sx(f.x), y = sy(f.y); ctx.globalAlpha = a;
  switch (f.kind) {
    case 'puff': ctx.fillStyle = '#ddd'; for (let i = 0; i < 4; i++) ctx.fillRect(x + Math.cos(i * 1.6) * (1 - a) * 20 - 3, y - 10 + Math.sin(i * 1.6) * (1 - a) * 20 - 3, 6, 6); break;
    case 'slash': ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 12, 16, -f.f - 0.6, -f.f + 0.9); ctx.stroke(); break;
    case 'ring': ctx.strokeStyle = f.col || '#ffe0a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 6, f.r * (1.2 - a * 0.4), 0, 7); ctx.stroke(); break;
    case 'strike': ctx.fillStyle = '#e0f0ff'; ctx.fillRect(x - 3, y - 400, 6, 400); ctx.fillStyle = '#80c0ff'; ctx.beginPath(); ctx.arc(x, y - 6, 40 * (1 - a) + 10, 0, 7); ctx.fill(); break;
    case 'fire': ctx.fillStyle = '#ff7030'; ctx.beginPath(); ctx.arc(x, y - 6, f.r * (1.1 - a * 0.5), 0, 7); ctx.fill(); ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.arc(x, y - 6, f.r * 0.5 * (1.1 - a * 0.5), 0, 7); ctx.fill(); break;
    case 'flash': ctx.fillStyle = '#fff4a0'; ctx.fillRect(x - 6, y - 6, 12, 12); break;
    case 'hurt': ctx.fillStyle = 'rgba(255,0,0,0.25)'; ctx.fillRect(0, 0, W, H); break;
    case 'healfx': ctx.fillStyle = '#70ff90'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 16 + i * 8, y - 20 - (1 - a) * 30 - (i % 2) * 8, 4, 8); break;
  }
  ctx.globalAlpha = 1;
}
function edgeArrow(x, y, col) {
  if (x > 0 && x < W && y > 0 && y < H) return;
  const cx = W / 2, cy = H / 2, a = Math.atan2(y - cy, x - cx), ex = clamp(cx + Math.cos(a) * W, 30, W - 30), ey = clamp(cy + Math.sin(a) * H, 60, H - 30);
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.fill(); ctx.restore();
}
function drawHud() {
  const g = game;
  ctx.fillStyle = '#102030'; ctx.fillRect(0, 0, W, 10); ctx.fillStyle = '#40a0ff'; ctx.fillRect(0, 0, W * g.xp / g.xpNext, 10);
  const remain = g.finalDone ? 0 : Math.max(0, RUN_SECONDS - g.t);
  label(g.finalDone ? '討伐首領！' : fmtTime(remain), W / 2, 38, '#fff', 22);
  ctx.textAlign = 'left'; ctx.font = 'bold 14px sans-serif';
  const hl = (t, y, col = '#fff') => { ctx.fillStyle = '#000'; ctx.fillText(t, 13, y + 1); ctx.fillStyle = col; ctx.fillText(t, 12, y); };
  hl(`${g.zone.zh}`, 30, '#ffd84a'); hl(`Lv ${g.level} ・ 擊殺 ${g.kills}`, 50); hl(`銀兩 ${g.silver}`, 70, '#ffd84a'); hl(`經驗 ${Math.round(g.exp).toLocaleString()}`, 90, '#a0e0ff');
  if (g.buffT > 0) hl('激勵中', 110, '#ffd84a');
  if (g.boss && !g.boss.dead) { const bw = Math.min(500, W - 40), bx = (W - bw) / 2; ctx.fillStyle = '#300'; ctx.fillRect(bx, 52, bw, 12); ctx.fillStyle = '#e03030'; ctx.fillRect(bx, 52, bw * g.boss.hp / g.boss.maxHp, 12); label(g.boss.mon.zh, W / 2, 80, '#fff', 13); }
  if (bannerT > 0) { ctx.globalAlpha = clamp(bannerT, 0, 1); label(bannerText, W / 2, H * 0.3, '#ffd84a', 26); ctx.globalAlpha = 1; }
}
let attractT = 0;
const ATTRACT = ['guC00', 'guC01', 'guU02', 'guU30', 'guU95', 'guU102', 'guT2', 'guT29', 'guM30', 'guE34', 'guT80'];
function drawAttract() {
  attractT += 1 / 60;
  drawGround(ctx, Math.round(attractT * 20), 0, W, H, zoneTheme('朝鮮地圖'));
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
  ATTRACT.forEach((id, i) => { const m = M(id); if (!m) return; const img = mercSprite(id, m, Math.floor(attractT * 3 + i) % 2); blit(img, W / 2 + (i - (ATTRACT.length - 1) / 2) * 76, H - 40, 1); });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (game && game.mode === 'play') update(dt);
  if (bannerT > 0) bannerT -= dt;
  draw(); requestAnimationFrame(frame);
}
window.__gs = { get game() { return game; }, startRun, update, pickChoice, endRun, get save() { return save; } };
loadLocalPack().then(n => { if (n) console.log(`本機素材包已載入：${n} 個 sprite`); });
if (hasSave()) openCamp(); else openNewGame();
requestAnimationFrame(frame);
