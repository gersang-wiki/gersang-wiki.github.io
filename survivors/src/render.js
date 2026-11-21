// 原創像素美術：按巨商角色嘅身份、兵器、國籍、屬性即時生成（唔係原作素材）
// Optional local asset pack (assets-local/sprites.json) can override any sprite key.

const cache = new Map();
const pack = new Map();
export const SCALE = 3;

export async function loadLocalPack() {
  try {
    const res = await fetch('assets-local/sprites.json', { cache: 'no-store' });
    if (!res.ok) return 0;
    const manifest = await res.json();
    await Promise.all(Object.entries(manifest).map(([key, file]) => new Promise(ok => {
      const img = new Image(); img.onload = () => { pack.set(key, img); ok(); }; img.onerror = ok; img.src = 'assets-local/' + file;
    })));
    return pack.size;
  } catch { return 0; }
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, v + amt));
  return '#' + ((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0');
}
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const ELEM = { 火: '#c83a20', 雷: '#4a5ad0', 風: '#3a9a6a', 水: '#2a7ab0', 地: '#8a6a30' };

// ---------------- humanoid builder ----------------
// look: {robe, hat, weapon, skin, hair, cape, horse, female, armor, plume}
function humanoid(look, frame) {
  const [c, g] = canvas(16, 22);
  const p = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const skin = look.skin || '#f0c8a0', robe = look.robe, dark = shade(robe, -45), hair = look.hair || '#201810';
  const oy = 5, lf = frame ? 1 : 0;
  if (look.cape) p(3, oy + 6, 10, 10, look.cape);
  p(5, oy + 13, 2, 3 - lf, '#302820'); p(9, oy + 13, 2, 2 + lf, '#302820');
  if (look.female) { p(3, oy + 10, 10, 5, robe); p(3, oy + 14, 10, 1, dark); p(5, oy + 7, 6, 4, look.top || shade(robe, 40)); p(7, oy + 9, 3, 1, '#c02040'); }
  else { p(4, oy + 7, 8, 7, robe); p(4, oy + 12, 8, 2, dark); p(7, oy + 7, 2, 7, shade(robe, 25)); }
  if (look.armor) { p(4, oy + 7, 8, 5, look.armor); p(4, oy + 9, 8, 1, shade(look.armor, -40)); p(5, oy + 12, 6, 1, '#d0a020'); }
  p(3, oy + 8, 1, 4, look.armor || robe); p(12, oy + 8, 1, 4, look.armor || robe); p(3, oy + 12, 1, 1, skin); p(12, oy + 12, 1, 1, skin);
  p(5, oy + 2, 6, 5, skin); p(6, oy + 4, 1, 1, '#000'); p(9, oy + 4, 1, 1, '#000');
  if (look.hat !== 'bald') p(5, oy + 1, 6, 2, hair);
  if (look.female && look.hat !== 'crown') { p(4, oy + 2, 1, 5, hair); p(11, oy + 2, 1, 5, hair); }
  switch (look.hat) {
    case 'gat': p(2, oy + 1, 12, 1, '#101010'); p(5, oy - 2, 6, 3, '#101010'); p(4, oy + 2, 1, 4, '#101010'); break; // 黑笠
    case 'headband': p(5, oy + 1, 6, 1, '#c03030'); p(11, oy + 2, 2, 1, '#c03030'); break;
    case 'topknot': p(7, oy - 1, 2, 2, hair); break;
    case 'helmet': p(4, oy, 8, 3, look.helm || '#606870'); p(7, oy - 2, 2, 2, look.plume || '#c03030'); break;
    case 'admiral': p(4, oy, 8, 3, '#303848'); p(6, oy - 3, 4, 3, '#c02020'); p(3, oy + 2, 10, 1, '#d0a020'); break;
    case 'bald': p(5, oy + 1, 6, 2, shade(skin, -15)); break;
    case 'monk': p(5, oy + 1, 6, 2, shade(skin, -15)); p(4, oy + 9, 8, 1, '#a02020'); break;
    case 'jeongjagwan': p(4, oy - 1, 8, 3, '#202020'); p(6, oy - 3, 4, 2, '#202020'); break; // 儒巾
    case 'bun': p(6, oy - 2, 4, 3, hair); p(10, oy - 1, 2, 1, '#e0c040'); break;
    case 'crown': p(4, oy - 1, 8, 2, '#d0a020'); p(5, oy - 3, 1, 2, '#d0a020'); p(10, oy - 3, 1, 2, '#d0a020'); p(4, oy + 2, 1, 6, hair); p(11, oy + 2, 1, 6, hair); break;
    case 'taoist': p(5, oy - 1, 6, 3, '#202020'); p(7, oy - 2, 2, 1, '#202020'); break;
    case 'bandit': p(5, oy + 1, 6, 1, '#b02020'); break;
  }
  switch (look.weapon) {
    case 'bow': p(13, oy + 5, 1, 8, '#8a5a2a'); p(14, oy + 4, 1, 1, '#8a5a2a'); p(14, oy + 13, 1, 1, '#8a5a2a'); p(14, oy + 5, 1, 8, '#e0e0e0'); break;
    case 'sword': p(13, oy + 3, 1, 9, '#d0d8e0'); p(12, oy + 11, 3, 1, '#806020'); break;
    case 'spear': p(13, oy - 3, 1, 18, '#8a6a3a'); p(12, oy - 4, 3, 2, '#d0d8e0'); break;
    case 'needle': p(13, oy + 8, 2, 1, '#e0e0f0'); p(13, oy + 10, 2, 1, '#e0e0f0'); p(12, oy + 7, 1, 5, '#806040'); break;
    case 'moktak': p(12, oy + 10, 3, 3, '#8a5a20'); p(13, oy + 11, 1, 1, '#3a2010'); break;
    case 'fan': p(12, oy + 8, 4, 4, '#f0e8d0'); p(12, oy + 8, 4, 1, '#c03030'); break;
    case 'cannon': p(10, oy + 9, 6, 3, '#404040'); p(15, oy + 9, 1, 3, '#202020'); break;
    case 'coin': p(13, oy + 10, 2, 2, '#e8c040'); break;
    case 'bracelet': p(2, oy + 11, 2, 2, '#d0a020'); p(12, oy + 11, 2, 2, '#d0a020'); break;
    case 'doll': p(12, oy + 9, 3, 4, '#e0a0c0'); break;
  }
  if (look.horse) {
    const [c2, g2] = canvas(26, 26);
    const q = (x, y, w, h, col) => { g2.fillStyle = col; g2.fillRect(x, y, w, h); };
    const hc = look.horse === true ? '#6a4a2a' : look.horse;
    q(2, 15, 19, 6, hc); q(19, 10, 4, 7, hc); q(21, 9, 4, 2, shade(hc, -50)); q(1, 15, 2, 5, '#201810');
    q(3, 21, 2, 4 + (frame ? 0 : 1), shade(hc, -40)); q(17, 21, 2, 5 - (frame ? 1 : 0), shade(hc, -40));
    q(7, 14, 8, 2, '#a02020');
    g2.drawImage(c, 5, -4);
    return c2;
  }
  return c;
}

// war cart (龜甲車 / 雷戰車)
function cart(kind, frame, elem) {
  const [c, g] = canvas(24, 18);
  const p = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (kind === 'turtle') {
    p(2, 6, 20, 7, '#4a6a3a'); p(4, 4, 16, 3, '#5a7a4a');
    for (let i = 0; i < 5; i++) p(4 + i * 4, 5, 2, 1, '#c0c0a0'); // spikes
    p(20, 7, 4, 3, '#d0a020'); p(22, 8, 1, 1, '#000'); // dragon head
  } else { p(2, 7, 18, 5, '#6a4a2a'); p(14, 4, 9, 3, '#303030'); p(4, 3, 8, 4, '#8a6a3a'); }
  if (elem) p(2, 12, 20, 1, elem);
  p(4, 13, 4, 4, '#2a1a10'); p(16, 13, 4, 4, '#2a1a10');
  p(5 + (frame ? 1 : 0), 14, 1, 1, '#aaa'); p(17 + (frame ? 0 : 1), 14, 1, 1, '#aaa');
  return c;
}

// ---------------- creatures ----------------
function creature(name, frame, tint) {
  const h = hashStr(name);
  const base = tint || ['#8a7a6a', '#7a6a5a', '#9a8a6a', '#6a6a7a'][h % 4];
  const d = shade(base, -50), l = shade(base, 40), f = frame ? 1 : 0;
  const has = re => re.test(name);
  if (has(/鹿|四不像/)) return beast({ body: has(/四不像/) ? '#8a8a70' : '#b0784a', horns: true, spots: !has(/四不像/), frame });
  if (has(/狐/)) return beast({ body: '#e0a040', tail: has(/九尾|三尾/) ? 3 : 1, frame, tint: tint });
  if (has(/虎|山貓/)) return beast({ body: has(/白/) ? '#e8e8e0' : '#d08a2a', stripes: true, frame });
  if (has(/熊/)) return beast({ body: has(/白/) ? '#e8e8f0' : '#3a2a20', big: true, frame, mark: has(/半月/) });
  if (has(/豬/)) return beast({ body: '#5a4030', tusk: true, frame });
  if (has(/犬|獵犬/)) return beast({ body: '#303038', frame });
  if (has(/獅/)) return beast({ body: '#9a9a90', big: true, frame, mane: true });
  if (has(/馬/) && !has(/海馬/)) return beast({ body: has(/火/) ? '#c04020' : '#6a4a2a', frame, horse: true });
  if (has(/龜/)) return simple(20, 14, p => { p(3, 4, 14, 7, '#4a7a4a'); p(5, 3, 10, 2, '#5a8a5a'); p(16, 6, 4, 3, '#8aa070'); p(18, 7, 1, 1, '#000'); p(4, 11, 3, 2 + f, '#8aa070'); p(13, 11, 3, 3 - f, '#8aa070'); });
  if (has(/海馬/)) return simple(14, 20, p => { p(5, 2, 5, 4, '#3a8ab0'); p(9, 3, 4, 2, '#3a8ab0'); p(5, 6, 4, 8, '#3a8ab0'); p(4, 14, 4, 3, '#3a8ab0'); p(6, 17, 3, 2, '#2a6a90'); p(7, 3, 1, 1, '#000'); p(3, 7, 2, 4 + f, '#80c0e0'); });
  if (has(/龍/)) return simple(26, 20, p => { const b = has(/白/) ? '#e0e8f0' : has(/黃/) ? '#d0b030' : has(/雷/) ? '#4a5ad0' : '#3a8a5a'; p(2, 10, 16, 4, b); p(14, 6, 6, 5, b); p(19, 7, 5, 3, b); p(22, 8, 1, 1, '#f04040'); p(15, 4, 1, 3, '#d0a020'); p(18, 4, 1, 3, '#d0a020'); p(0, 12 + f, 3, 2, b); p(5, 14, 2, 3, d); p(12, 14, 2, 3 - f, d); for (let i = 0; i < 4; i++) p(4 + i * 4, 9, 2, 1, shade(b, -40)); });
  if (has(/蛇|蟒/)) return simple(24, 12, p => { const b = has(/紫/) ? '#7a3a8a' : '#4a6a2a'; for (let i = 0; i < 5; i++) p(1 + i * 4, 6 + ((i + f) % 2) * 2, 5, 3, b); p(20, 4, 4, 4, b); p(22, 5, 1, 1, '#f0e040'); p(24 - 1, 7, 1, 1, '#c02020'); });
  if (has(/蛾|鳥|雀|姑獲|雷鳥/)) return simple(20, 16, p => { const b = has(/紅雀|朱/) ? '#d03020' : has(/雷鳥|青銅/) ? '#6a8a8a' : has(/蛾/) ? '#a09060' : '#5a5a6a'; p(7, 6, 6, 5, b); p(12, 4, 4, 3, b); p(15, 5, 2, 1, '#e0a020'); p(13, 5, 1, 1, '#000'); p(1, 3 + f * 3, 7, 3, shade(b, 30)); p(12, 3 + f * 3 - 2, 0, 0, b); p(4, 11, 5, 2, shade(b, -30)); if (has(/人面/)) p(12, 3, 4, 4, '#f0c8a0'); });
  if (has(/樹/)) return simple(18, 24, p => { p(7, 10, 4, 12, '#5a3a20'); p(2, 2, 14, 9, has(/妖靈/) ? '#5a3a7a' : '#3a6a2a'); p(6, 13, 1, 1, '#f0e040'); p(10, 13, 1, 1, '#f0e040'); p(4 + f, 21, 3, 3, '#5a3a20'); p(11 - f, 21, 3, 3, '#5a3a20'); });
  if (has(/石爺爺/)) return simple(16, 22, p => { p(4, 1, 8, 3, '#707070'); p(3, 4, 10, 16, '#8a8a88'); p(5, 7, 2, 2, '#303030'); p(9, 7, 2, 2, '#303030'); p(6, 10, 4, 3, '#6a6a68'); p(3, 14, 2, 5, '#6a6a68'); p(11, 14, 2, 5, '#6a6a68'); p(3, 20, 4, 2 - f, '#5a5a58'); p(9, 20, 4, 1 + f, '#5a5a58'); });
  if (has(/石人|石鳥|巨山/)) return simple(20, 22, p => { p(4, 4, 12, 14, '#8a8a80'); p(6, 1, 8, 4, '#9a9a90'); p(7, 3, 2, 1, '#f04040'); p(11, 3, 2, 1, '#f04040'); p(1, 7, 3, 8, '#7a7a70'); p(16, 7, 3, 8, '#7a7a70'); p(5, 18, 4, 4 - f, '#6a6a60'); p(11, 18, 4, 3 + f, '#6a6a60'); });
  if (has(/蜥|蝪/)) return simple(22, 12, p => { const b = has(/火/) ? '#d05020' : '#5a8a4a'; p(4, 5, 12, 4, b); p(15, 4, 5, 4, b); p(18, 5, 1, 1, '#000'); p(0, 6 + f, 5, 2, b); p(5, 9, 2, 2 + f, d); p(12, 9, 2, 3 - f, d); });
  if (has(/蟾/)) return simple(18, 14, p => { p(3, 5, 12, 7, '#6a7a3a'); p(5, 3, 3, 3, '#6a7a3a'); p(10, 3, 3, 3, '#6a7a3a'); p(6, 4, 1, 1, '#f0e040'); p(11, 4, 1, 1, '#f0e040'); p(2, 11, 4, 2 + f, '#5a6a2a'); p(12, 11, 4, 3 - f, '#5a6a2a'); });
  if (has(/燈籠/)) return simple(14, 22, p => { p(6, 0, 2, 3, '#303030'); p(2, 3, 10, 13, '#3a8a9a'); p(2, 6, 10, 1, '#205060'); p(2, 11, 10, 1, '#205060'); p(4, 8, 6, 3, '#f0f0a0'); p(5, 16, 4, 2, '#303030'); p(5 + f, 18, 1, 3, '#f0f0a0'); });
  if (has(/魂|靈|鬼|叉|瘟神|魔|邪念|冰雪神|阿魯塔|杜魯珈|魔奧|執行者/)) {
    const ghost = has(/魂|靈|邪念/);
    const look = { robe: ghost ? '#8090b0' : has(/冰雪/) ? '#a0d0f0' : has(/瘟/) ? '#4a7a3a' : '#5a2a3a', hat: has(/獨角|叉/) ? 'topknot' : 'helmet', helm: '#3a2a3a', plume: '#f04040', weapon: has(/狼牙|刀斧|武官|劍|槍/) ? 'spear' : 'sword', skin: ghost ? '#c8d0e8' : has(/叉|鬼/) ? '#c05040' : '#b0a0a0' };
    const cc = humanoid(look, frame);
    if (ghost) { const gg = cc.getContext('2d'); gg.globalCompositeOperation = 'destination-out'; gg.fillStyle = 'rgba(0,0,0,0.35)'; gg.fillRect(0, 0, 16, 22); }
    if (has(/獨角|叉|鬼/) && !ghost) { const gg = cc.getContext('2d'); gg.fillStyle = '#f0e0a0'; gg.fillRect(7, 2, 2, 3); }
    return cc;
  }
  if (has(/巫|女/)) return humanoid({ robe: has(/死靈|邪/) ? '#4a2a4a' : '#e0e0e0', female: true, top: '#c03030', hat: 'bun', weapon: 'fan' }, frame);
  // human bandits & others
  const robe = has(/黑色商團|黑暗|黑/) ? '#2a2a30' : has(/赤/) ? '#a03020' : has(/山賊|盜|扒手/) ? '#7a5a3a' : '#5a5a6a';
  const weapon = has(/弓/) ? 'bow' : has(/鐵鎚|斧|刀斧/) ? 'moktak' : has(/槍/) ? 'spear' : has(/術士|長老|操練/) ? 'fan' : 'sword';
  return humanoid({ robe, hat: has(/小/) ? 'bandit' : has(/長老|縣令/) ? 'gat' : 'bandit', weapon }, frame);

  function simple(w, hh, draw) { const [cc, gg] = canvas(w, hh); draw((x, y, ww, hhh, col) => { gg.fillStyle = col; gg.fillRect(x, y, ww, hhh); }); return cc; }
  function beast(o) {
    const big = o.big ? 1 : 0, [cc, gg] = canvas(20 + big * 4, 16 + big * 2);
    const p = (x, y, w, hh, col) => { gg.fillStyle = col; gg.fillRect(x, y, w, hh); };
    const b = o.tint || o.body, dd = shade(b, -50), ff = o.frame ? 1 : 0;
    p(2, 6, 13 + big * 3, 5 + big * 2, b); p(14 + big * 3, 4, 4 + big, 4 + big, b); p(17 + big * 4, 5, 1, 1, '#000');
    p(14 + big * 3, 3, 1, 1, dd); p(16 + big * 3, 3, 1, 1, dd);
    p(3, 11 + big * 2, 2, 3 - ff, dd); p(12 + big * 2, 11 + big * 2, 2, 2 + ff, dd);
    if (o.horns) { p(14, 0, 1, 3, '#d0c0a0'); p(17, 0, 1, 3, '#d0c0a0'); p(13, 0, 2, 1, '#d0c0a0'); }
    if (o.spots) { p(5, 7, 1, 1, '#f0e0c0'); p(9, 8, 1, 1, '#f0e0c0'); p(7, 7, 1, 1, '#f0e0c0'); }
    if (o.stripes) { p(5, 6, 1, 4, '#201810'); p(8, 6, 1, 4, '#201810'); p(11, 6, 1, 4, '#201810'); }
    if (o.tail) for (let i = 0; i < o.tail; i++) p(0, 3 + i * 2, 3, 2, shade(b, 30));
    else p(0, 6, 3, 1, b);
    if (o.tusk) p(18, 7, 2, 1, '#f0f0e0');
    if (o.mane) p(13, 2, 5, 7, '#7a6a40');
    if (o.mark) p(15, 9, 3, 1, '#f0f0f0');
    if (o.horse) { p(16, 1, 2, 3, b); p(14, 2, 2, 6, '#201810'); }
    return cc;
  }
}

// ---------------- merc look from game data ----------------
export function mercLook(id, m) {
  const n = m.zh, elem = ELEM[m.el];
  const has = re => re.test(n);
  if (/^guM|^guE|^guD|^guT62|^guT122|^guT86|^guV29/.test(id)) return { creature: n, tint: elem };
  if (has(/龜甲車/)) return { cart: 'turtle', elem };
  if (has(/雷戰車/)) return { cart: 'thunder', elem };
  const L = { robe: '#e8e4d8', hat: 'topknot', weapon: 'sword' };
  // 主角
  if (has(/曹鐵西/)) Object.assign(L, { robe: has(/神弓/) ? '#3a6a3a' : '#6a5030', hat: has(/神弓/) ? 'helmet' : 'headband', weapon: has(/獵人|神弓/) ? 'bow' : 'coin', armor: has(/神弓/) ? '#4a5a3a' : null, cape: has(/神弓/) ? '#2a4a2a' : null });
  else if (has(/李明花/)) Object.assign(L, { robe: has(/砲手/) ? '#5a3a6a' : '#e080a0', top: '#f0e0a0', female: true, hat: 'bun', weapon: has(/砲手/) ? 'cannon' : 'coin', cape: has(/大商人|砲手/) ? '#c09040' : null });
  // 名將 / 傳說
  else if (has(/李舜臣/)) Object.assign(L, { robe: '#1a2a5a', hat: 'admiral', weapon: 'bow', armor: '#2a3a6a', cape: '#a02020' });
  else if (has(/許浚/)) Object.assign(L, { robe: '#e0e0e8', hat: 'gat', weapon: 'needle' });
  else if (has(/權慄|宣武功臣/)) Object.assign(L, { robe: '#5a2a1a', hat: 'helmet', helm: '#3a3a3a', weapon: 'sword', armor: has(/覺醒/) ? '#c09020' : '#7a3a20', cape: has(/功臣/) ? '#a02020' : null });
  else if (has(/申砬|諡號忠臣/)) Object.assign(L, { robe: '#2a4a3a', hat: 'helmet', weapon: 'bow', armor: '#3a5a4a', horse: has(/覺醒/) ? '#e8e8e8' : true, cape: has(/忠臣/) ? '#2050a0' : null });
  else if (has(/四溟|西山/)) Object.assign(L, { robe: '#7a6a5a', hat: 'monk', weapon: 'moktak', cape: has(/西山/) ? '#c08030' : null });
  else if (has(/柳城龍/)) Object.assign(L, { robe: '#d8d0c0', hat: 'gat', weapon: 'fan' });
  else if (has(/美室|源花/)) Object.assign(L, { robe: '#a02050', top: '#f0c0d0', female: true, hat: 'crown', weapon: 'fan' });
  else if (has(/金時敏|金庾信/)) Object.assign(L, { robe: '#3a3a4a', hat: 'helmet', weapon: 'spear', armor: has(/庾信/) ? '#9a8a40' : '#5a5a6a', cape: has(/庾信/) ? '#802020' : null });
  else if (has(/朱蒙/)) Object.assign(L, { robe: '#2a3a7a', hat: 'crown', weapon: 'bow', armor: '#c0a030', cape: '#4a5ad0' });
  else if (has(/崔茂宣/)) Object.assign(L, { robe: '#5a2a1a', hat: 'gat', weapon: 'cannon', cape: '#c83a20' });
  else if (has(/洪吉童/)) Object.assign(L, { robe: '#e8e8f0', hat: 'gat', weapon: 'fan', cape: '#3a9a6a' });
  // 基礎兵
  else if (has(/挑夫/)) Object.assign(L, { robe: '#a08a60', hat: 'headband', weapon: 'none', cape: '#6a5030' });
  else if (has(/弓騎兵/)) Object.assign(L, { robe: '#5a7a4a', hat: 'helmet', weapon: 'bow', horse: true });
  else if (has(/弓手/)) Object.assign(L, { robe: '#5a8a4a', hat: 'gat', weapon: 'bow' });
  else if (has(/醫術師/)) Object.assign(L, { robe: '#e8e8f0', hat: 'jeongjagwan', weapon: 'needle' });
  else if (has(/刀手/)) Object.assign(L, { robe: '#4a6fa5', hat: 'topknot', weapon: 'sword' });
  else if (has(/破戒僧/)) Object.assign(L, { robe: '#6a6a6a', hat: 'monk', weapon: 'moktak' });
  else if (has(/儒生/)) Object.assign(L, { robe: '#f0ecdc', hat: 'jeongjagwan', weapon: 'fan' });
  else if (has(/槍手/)) Object.assign(L, { robe: '#8a5a3a', hat: 'helmet', weapon: 'spear' });
  if (elem && !L.cape) L.cape = elem;
  return L;
}

export function sprite(key, build) {
  if (pack.has(key)) return pack.get(key);
  let s = cache.get(key); if (!s) { s = build(); cache.set(key, s); } return s;
}
export function mercSprite(id, m, frame) {
  return sprite(`merc_${id}_${frame}`, () => {
    const L = mercLook(id, m);
    if (L.creature) return creature(L.creature, frame, L.tint);
    if (L.cart) return cart(L.cart, frame, L.elem);
    return humanoid(L, frame);
  });
}
export function monsterSprite(mon, frame) { return sprite(`mon_${mon.id}_${frame}`, () => creature(mon.zh, frame)); }
export function peddlerSprite(frame) { return sprite(`peddler_${frame}`, () => humanoid({ robe: '#3a7a5a', hat: 'gat', weapon: 'none', cape: '#c0a060' }, frame)); }
export function portrait(id, m) {
  const key = `portrait_${id}`;
  let url = cache.get(key);
  if (!url) {
    const img = mercSprite(id, m, 0), [c, g] = canvas(img.width * 3, img.height * 3);
    g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, c.width, c.height); url = c.toDataURL(); cache.set(key, url);
  }
  return url;
}

// ---------------- ground per zone ----------------
function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }
const TILE = 48;
export function zoneTheme(zh) {
  if (/海底|湖/.test(zh)) return { g: ['#2a5a6a', '#2f6070', '#285464', '#3a6a5a'], deco: 'coral' };
  if (/洞窟|王陵/.test(zh)) return { g: ['#4a4038', '#4f453c', '#453b34', '#5a5040'], deco: 'rock' };
  if (/漢拏|火/.test(zh)) return { g: ['#5a4a3a', '#604e3c', '#554434', '#6a3a2a'], deco: 'rock' };
  if (/商團|營地|莊園/.test(zh)) return { g: ['#6a6040', '#706644', '#645a3c', '#5a5a3a'], deco: 'tent' };
  if (/月奇峰/.test(zh)) return { g: ['#d8dce4', '#e0e4ea', '#d0d4dc', '#b0b8c0'], deco: 'pine' };
  if (/庭園/.test(zh)) return { g: ['#4a7a4a', '#508050', '#467446', '#8a8a70'], deco: 'lantern' };
  return { g: ['#5d8a3c', '#62903f', '#58843a', '#6b7a3a'], deco: 'pine' };
}
function tileSprite(theme, v) {
  return sprite(`tile_${theme.g[0]}_${v}`, () => {
    const [c, g] = canvas(16, 16), base = theme.g[v];
    g.fillStyle = base; g.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 6; i++) { g.fillStyle = shade(base, i % 2 ? 16 : -16); g.fillRect((i * 7 + v * 3) % 15, (i * 5 + v) % 15, 1, 2); }
    return c;
  });
}
function decoSprite(kind, v) {
  return sprite(`deco_${kind}_${v}`, () => {
    const [c, g] = canvas(16, 24); const p = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    if (kind === 'pine' && v === 0) { p(7, 18, 2, 6, '#5a3a20'); p(3, 12, 10, 6, '#2f5a2a'); p(4, 7, 8, 6, '#3a6a30'); p(6, 2, 4, 6, '#447a38'); }
    else if (kind === 'coral') { p(6, 14, 2, 10, '#d06060'); p(3, 12, 2, 8, '#d06060'); p(10, 10, 2, 10, '#e08080'); }
    else if (kind === 'tent') { p(1, 12, 14, 10, '#8a7a5a'); p(4, 8, 8, 4, '#9a8a6a'); p(7, 16, 3, 6, '#3a2a1a'); }
    else if (kind === 'lantern' || v === 2) { p(6, 12, 4, 10, '#8a8a8a'); p(4, 10, 8, 3, '#6a6a6a'); p(5, 20, 6, 3, '#6a6a6a'); p(7, 14, 2, 2, '#f0d060'); }
    else { p(3, 16, 10, 6, '#7a7a80'); p(4, 15, 7, 2, '#9a9aa0'); }
    return c;
  });
}
export function drawGround(ctx, camX, camY, w, h, theme) {
  const x0 = Math.floor(camX / TILE) - 1, y0 = Math.floor(camY / TILE) - 1, x1 = Math.ceil((camX + w) / TILE) + 1, y1 = Math.ceil((camY + h) / TILE) + 2;
  for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
    const r = hash(tx, ty); const v = r < 0.7 ? 0 : r < 0.85 ? 1 : r < 0.97 ? 2 : 3;
    ctx.drawImage(tileSprite(theme, v), tx * TILE - camX, ty * TILE - camY, TILE, TILE);
  }
  for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
    const r = hash(tx * 7 + 3, ty * 13 + 1);
    if (r > 0.96) ctx.drawImage(decoSprite(theme.deco, r > 0.99 ? 2 : r > 0.975 ? 1 : 0), tx * TILE - camX, ty * TILE - camY - 24, 48, 72);
  }
}
