'use strict';
/* ====== От бомжа до бизнесмена — логика игры ====== */
const SAVE_KEY = 'b2b_save_v1';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => Date.now();

function fmt(n) {
  if (!isFinite(n)) return '∞';
  const neg = n < 0; n = Math.abs(n);
  let s;
  if (n < 1000) s = (n < 10 && n % 1) ? n.toFixed(1).replace(/\.0$/, '') : String(Math.floor(n));
  else {
    const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    const i = Math.floor(Math.log10(n) / 3);
    if (i >= u.length) s = n.toExponential(2);
    else {
      const v = n / Math.pow(1000, i);
      let t = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : String(Math.floor(v));
      if (t.includes('.')) t = t.replace(/\.?0+$/, '');
      s = t + u[i];
    }
  }
  return (neg ? '−' : '') + s;
}
const money = n => fmt(n) + ' ₽';
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  if (h) return `${h}ч ${m}м`;
  if (m) return `${m}м ${s}с`;
  return `${s}с`;
}

/* ---------- состояние ---------- */
function fresh() {
  return {
    cash: 0, totalEarned: 0, lifetime: 0, taps: 0, stage: 0,
    biz: {}, upg: {}, life: {h0: 1, v0: 1, w0: 1},
    prestige: 0, rebirths: 0,
    boostUntil: 0, boostCd: 0, adCd: 0, frenzyUntil: 0,
    daily: {last: '', streak: 0},
    ach: {}, stocks: {}, stockAvg: {}, market: null,
    stats: {jackpots: 0, cupWins: 0, stockProfit: 0, golden: 0, maxCombo: 0, honest: 0, events: 0, spins: 0, playTime: 0, started: now(), bizBought: 0, rain: 0, rainBest: 0, energy: 0, piggy: 0, quests: 0, dayCombo: 0},
    piggy: 0, quests: {day: '', ids: [], base: {}, got: []},
    settings: {sound: true, vibe: true},
    buyMult: 1, lastSave: now(),
  };
}
let S = fresh();
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw), f = fresh();
    S = Object.assign(f, d);
    for (const k of ['stats', 'settings', 'daily']) S[k] = Object.assign(fresh()[k], d[k] || {});
    return true;
  } catch (e) { console.warn('save corrupted', e); return false; }
}
function save() {
  S.lastSave = now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}

/* ---------- формулы ---------- */
const bst = id => S.biz[id] || (S.biz[id] = {lvl: 0, mgr: false, prog: 0, run: false});
const upgSum = (type, base, op) => UPGRADES.filter(u => u.type === type && S.upg[u.id]).reduce((a, u) => op(a, u.v), base);
const tapUpg = () => upgSum('tap', 1, (a, v) => a * v);
const bizUpg = () => upgSum('global', 1, (a, v) => a * v);
const autoRate = () => upgSum('auto', 0, (a, v) => a + v);
const critChance = () => upgSum('crit', 0.03, (a, v) => a + v);
const ipsTapPct = () => upgSum('ipsTap', 0, (a, v) => a + v);
const statusPts = () => LIFE.filter(l => S.life[l.id]).reduce((a, l) => a + l.bonus, 0);
const lifeMult = () => 1 + statusPts() / 100;
const prestigeMult = () => 1 + S.prestige * 0.1;
const achMult = () => 1 + Object.keys(S.ach).length * 0.02;
const boostOn = () => now() < S.boostUntil;
const frenzyOn = () => now() < S.frenzyUntil;
const globalMult = () => lifeMult() * prestigeMult() * achMult() * (boostOn() ? 3 : 1);
const msMult = l => MILESTONES.reduce((m, t) => l >= t ? m * 2 : m, 1);
const nextMs = l => MILESTONES.find(t => t > l);
const bizRev = b => b.rev * bst(b.id).lvl * msMult(bst(b.id).lvl) * globalMult() * bizUpg();
function bizIps(managedOnly = true) {
  let s = 0;
  for (const b of BUSINESSES) { const st = bst(b.id); if (st.lvl && (st.mgr || !managedOnly)) s += bizRev(b) / b.time; }
  return s;
}
function tapValue() {
  const st = STAGES[S.stage];
  let v = st.tap * tapUpg() * lifeMult() * prestigeMult() * achMult() + bizIps() * ipsTapPct();
  if (boostOn()) v *= 3;
  if (frenzyOn()) v *= 7;
  return v;
}
const totalIps = () => bizIps() + autoRate() * tapValue();
function costN(b, n) { const l = bst(b.id).lvl, g = BIZ_GROWTH; return b.cost * Math.pow(g, l) * (Math.pow(g, n) - 1) / (g - 1); }
function maxN(b) {
  const l = bst(b.id).lvl, g = BIZ_GROWTH, c = b.cost * Math.pow(g, l);
  return Math.max(0, Math.floor(Math.log(S.cash * (g - 1) / c + 1) / Math.log(g)));
}
function buyCount(b) { return S.buyMult === 'max' ? Math.max(1, maxN(b)) : S.buyMult; }
const prestigeGain = () => Math.max(0, Math.floor(Math.sqrt(S.lifetime / 1e6)) - S.prestige);
function baseReward() { return Math.max(100, bizIps() * 60 + tapValue() * 40); }

function earn(x) { if (!(x > 0)) return; S.cash += x; S.totalEarned += x; S.lifetime += x; if (typeof SHINE !== 'undefined') SHINE.piggyAdd(x); }
function spend(x) { if (S.cash + 1e-9 < x) { Sfx.error(); vibe(40); $('#cash').classList.add('shake'); setTimeout(() => $('#cash').classList.remove('shake'), 300); return false; } S.cash -= x; return true; }
function vibe(ms) { if (S.settings.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

/* ---------- тема ---------- */
function applyTheme() {
  const st = STAGES[S.stage], r = document.documentElement.style;
  r.setProperty('--c1', st.c[0]); r.setProperty('--c2', st.c[1]); r.setProperty('--c3', st.c[2]);
  $('#scene').textContent = st.scene;
  $('#stageEmoji').textContent = st.emoji; $('#stageName').textContent = st.name;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = st.c[2];
}
function checkStage() {
  let up = false;
  while (S.stage < STAGES.length - 1 && S.totalEarned >= STAGES[S.stage + 1].need) { S.stage++; up = true; }
  if (up) {
    applyTheme(); Sfx.levelup(); confetti(220); vibe([30, 40, 60]);
    const st = STAGES[S.stage];
    showModal({em: st.emoji, title: 'Новый статус!', html: `<b style="font-size:20px">${st.name}</b><br><br>«${st.quote}»<br><br>💪 Сила тапа выросла до <b class="price">${money(tapValue())}</b>`, buttons: [{label: 'Вперёд! 🚀', cls: 'gold', fn: () => {}}]});
    renderTab();
  }
}

/* ---------- эффекты ---------- */
const fx = () => $('#fx');
function floatText(x, y, text, crit) {
  const d = document.createElement('div'); d.className = 'float' + (crit ? ' crit' : '');
  d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px';
  fx().appendChild(d); setTimeout(() => d.remove(), 1000);
}
function particles(x, y, n, set) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div'); p.className = 'part'; p.textContent = pick(set);
    const a = rnd(0, Math.PI * 2), r = rnd(50, 130);
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.setProperty('--dx', Math.cos(a) * r + 'px'); p.style.setProperty('--dy', Math.sin(a) * r - 30 + 'px'); p.style.setProperty('--r', rnd(-360, 360) + 'deg');
    fx().appendChild(p); setTimeout(() => p.remove(), 800);
  }
}
// конфетти
const cv = $('#confetti'), cx = cv.getContext('2d'); let conf = [], confRun = false;
function confetti(n = 150) {
  cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
  const cols = ['#ff3cac', '#ffd23f', '#00f5a0', '#00d9f5', '#a855f7', '#ff6a3d', '#fff'];
  for (let i = 0; i < n; i++) conf.push({x: innerWidth / 2 + rnd(-60, 60), y: innerHeight * 0.4, vx: rnd(-9, 9), vy: rnd(-16, -4), s: rnd(5, 11), c: pick(cols), r: rnd(0, 6), vr: rnd(-.3, .3), life: rnd(90, 160)});
  if (!confRun) { confRun = true; requestAnimationFrame(confStep); }
}
function confStep() {
  const k = devicePixelRatio; cx.clearRect(0, 0, cv.width, cv.height);
  conf = conf.filter(p => p.life-- > 0 && p.y < innerHeight + 40);
  for (const p of conf) {
    p.vy += 0.38; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    cx.save(); cx.translate(p.x * k, p.y * k); cx.rotate(p.r); cx.globalAlpha = Math.min(1, p.life / 40);
    cx.fillStyle = p.c; cx.fillRect(-p.s * k / 2, -p.s * k / 4, p.s * k, p.s * k / 2); cx.restore();
  }
  if (conf.length) requestAnimationFrame(confStep); else { confRun = false; cx.clearRect(0, 0, cv.width, cv.height); }
}
function toast(em, title, sub) {
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `<span>${em}</span><div>${title}<small>${sub || ''}</small></div>`;
  const box = $('#toasts'); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => t.remove(), 3500);
}

/* ---------- модалки ---------- */
let modalQueue = [], modalOpen = false;
function showModal(o) { modalQueue.push(o); if (!modalOpen) nextModal(); }
function nextModal() {
  const o = modalQueue.shift();
  if (!o) { modalOpen = false; $('#modal').classList.add('hidden'); return; }
  modalOpen = true;
  const c = $('#modalCard');
  c.innerHTML = `<div class="em">${o.em || '✨'}</div><h3>${o.title}</h3><p>${o.html || ''}</p><div class="mbtns"></div>`;
  (o.buttons || [{label: 'OK', cls: 'gold'}]).forEach(b => {
    const btn = document.createElement('button'); btn.className = 'btn wide ' + (b.cls || ''); btn.innerHTML = b.label;
    btn.onclick = () => { Sfx.click(); const r = b.fn && b.fn(); if (r !== 'keep') nextModal(); };
    c.querySelector('.mbtns').appendChild(btn);
  });
  $('#modal').classList.remove('hidden');
  c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
}

/* ---------- тап ---------- */
let combo = 0, lastTap = 0, autoAcc = 0;
const tapSets = [['🍾', '🥫', '🪙'], ['🍾', '🍾', '🪙'], ['🍂', '🪙', '✨'], ['📦', '🪙', '💵'], ['🌯', '💵', '✨'], ['💵', '🪙', '✨'], ['☕', '💵', '💰'], ['💼', '💰', '💵'], ['💎', '💰', '🛥️'], ['👑', '💎', '💰']];
function doTap(x, y) {
  Sfx.init();
  const t = now();
  combo = (t - lastTap < 450) ? combo + 1 : 1; lastTap = t;
  if (combo > S.stats.maxCombo) S.stats.maxCombo = combo;
  if (combo > (S.stats.dayCombo || 0)) S.stats.dayCombo = combo;
  const cm = 1 + Math.min(combo, 100) / 100;
  const crit = Math.random() < critChance();
  const v = tapValue() * cm * (crit ? 10 : 1);
  earn(v); S.taps++;
  floatText(x + rnd(-20, 20), y - 10, (crit ? 'КРИТ! +' : '+') + money(v), crit);
  particles(x, y, crit ? 6 : 2, tapSets[S.stage]);
  if (typeof SHINE !== 'undefined') SHINE.coin(x, y, crit ? 16 : 4, crit);
  crit ? Sfx.crit() : Sfx.tap(); vibe(crit ? 25 : 6);
  const c = $('#cash'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
}

/* ---------- вкладки ---------- */
let curTab = 'work', moreView = 'menu';
function setTab(t) {
  curTab = t;
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  $$('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + t));
  if (t === 'more') moreView = moreView === 'menu' ? 'menu' : moreView;
  renderTab(); $('#tab-' + t).scrollTop = 0;
}
function renderTab() {
  ({work: renderWork, biz: renderBiz, upg: renderUpg, life: renderLife, more: renderMore})[curTab]();
  updateDynamic();
}

/* ===== РАБОТА ===== */
function best(cat) { return LIFE.filter(l => l.cat === cat && S.life[l.id]).pop(); }
const PSKY=[['#ffb27a','#7a4a8c','#2a1a44'],['#ffc07a','#8a5ab0','#2a2560'],['#fff3a0','#6ee0c8','#1f7a8c'],['#fff0a0','#6cc8ff','#2a5fc0'],['#ff7ab0','#a03aa0','#2a0d50'],['#ffd28a','#5aa0ff','#1d2f8a'],['#ffc0e0','#c048b8','#3a1270'],['#7ae8ff','#1f6aa0','#06203a'],['#fff2a0','#e0a020','#5a3a00'],['#fff0a0','#ff5fb8','#5a0b72']];
function careerPortrait(){
 const stage=Math.max(0,Math.min(STAGES.length-1,S.stage)),suited=stage>=5,coat=suited?'#263e58':stage>=2?'#4f8e8b':'#706052',accent=stage>=7?'#edca7e':'#95d6cf';
 const city=Array.from({length:9},(_,i)=>{const h=20+((i*17+stage*11)%55);return '<g><rect x="'+(i*27-3)+'" y="'+(132-h)+'" width="23" height="'+h+'" rx="2" fill="'+(i%2?'#223b54':'#2e4c65')+'"/>'+Array.from({length:3},(_,j)=>'<path d="M'+(i*27+2)+' '+(138-h+j*11)+'h5m5 0h5" stroke="#e7c99366" stroke-width="3"/>').join('')+'</g>'}).join('');
 return '<svg class="career-portrait" viewBox="0 0 240 240" aria-hidden="true"><defs><radialGradient id="career-sky" cy=".35"><stop stop-color="'+PSKY[stage][0]+'"/><stop offset=".6" stop-color="'+PSKY[stage][1]+'"/><stop offset="1" stop-color="'+PSKY[stage][2]+'"/></radialGradient><linearGradient id="career-coat" x2="1" y2="1"><stop stop-color="'+coat+'"/><stop offset="1" stop-color="#15263b"/></linearGradient></defs><circle cx="120" cy="120" r="114" fill="url(#career-sky)"/><circle cx="181" cy="47" r="17" fill="#eac99a"/>'+city+'<path d="M10 159Q120 122 230 159V240H10Z" fill="#172c3e"/><path d="M25 182Q120 151 216 182M40 211Q120 179 200 211" fill="none" stroke="#c7ac6e33"/><ellipse cx="123" cy="219" rx="56" ry="11" fill="#07162a88"/><path d="M91 172h25l-4 44H86zm32 0h26l7 44h-27z" fill="#17263b"/><path d="M83 213h30v9H80zm46 0h31v9h-31z" fill="#0c192a"/><path d="M83 103q39-21 74 0l12 73q-49 17-98 0z" fill="url(#career-coat)" stroke="#b5d3d633" stroke-width="2"/><path d="M105 98l15 42 16-42" fill="'+(suited?'#e3e9e7':'#aeaa91')+'"/><path d="M118 110h6l3 29-7 8-6-8z" fill="'+accent+'"/><path d="M83 112l-16 51 12 5 21-46m56-10 15 45-12 5-20-40" fill="'+coat+'"/><ellipse cx="73" cy="170" rx="8" ry="10" fill="#dbac89"/><ellipse cx="164" cy="166" rx="8" ry="10" fill="#dbac89"/><rect x="110" y="82" width="21" height="24" rx="8" fill="#d2a17d"/><ellipse cx="120" cy="68" rx="27" ry="32" fill="#edc5a0"/><path d="M94 66q-10-39 26-37 33 0 28 35l-9-14q-20 4-35-3z" fill="#4b3a34"/><path d="M108 70h5m14 0h5" stroke="#483d3c" stroke-width="3" stroke-linecap="round"/><path d="M113 85q8 5 15-1" stroke="#966c59" stroke-width="2" fill="none"/>'+(stage<2?'<path d="M98 83q22 35 45-2l-4 24-19 10-18-11z" fill="#625448"/>':'')+(suited?'<path d="M79 168h27v21H78z" fill="#866c4b" stroke="#ddbf89"/><path d="M84 168v-6h15v6" fill="none" stroke="#ddbf89"/>':'')+(stage>=8?'<path d="M98 40l8-18 14 12 14-12 8 18z" fill="#ffd23f" stroke="#8a5a00" stroke-width="2"/><circle cx="120" cy="30" r="3.5" fill="#ff3cac"/><circle cx="104" cy="34" r="2.5" fill="#3dc8ff"/><circle cx="136" cy="34" r="2.5" fill="#3dff9a"/>':'')+'<circle cx="120" cy="120" r="112" fill="none" stroke="'+accent+'" stroke-width="3" stroke-opacity=".8"/></svg>';
}
function renderWork() {
  const st = STAGES[S.stage], nx = STAGES[S.stage + 1];
  const daily = dailyAvailable();
  $('#tab-work').innerHTML = `
  <div class="work-wrap">
    <div class="quote">«${st.quote}»</div>
    <div class="tap-zone">
      <div class="tap-ring"></div><div class="tap-ring2"></div>
      <button id="tapBtn" aria-label="Тап"><span class="char">${careerPortrait()}</span>
        <span class="acc a1">${best('home').emoji}</span><span class="acc a2">${best('car').emoji}</span><span class="acc a3">${best('wear').emoji}</span></button>
    </div>
    <div class="combo"><div id="comboFill"></div></div>
    <div class="combo-lbl" id="comboLbl"></div>
    <div class="tap-info">
      <span class="chip">👆 <span id="wTap"></span></span>
      <span class="chip">🤖 ${autoRate()}/с</span>
      <span class="chip">🍀 крит ${Math.round(critChance() * 100)}%</span>
    </div>
    ${daily ? `<button class="banner" data-act="openDaily"><span>🎁</span><div style="text-align:left">Ежедневный бонус готов!<div class="sub">Нажми, чтобы забрать</div></div></button>` : ''}
    <div class="boosts">
      <button class="boost" data-act="energy"><span class="bi">⚡</span><b>Энергетик</b><small id="bEnergy"></small><div class="cd" id="cdEnergy"></div></button>
      <button class="boost" data-act="ad"><span class="bi">📣</span><b>Реклама</b><small id="bAd"></small><div class="cd" id="cdAd"></div></button>
    </div>
    ${typeof SHINE !== 'undefined' ? `<button class="piggy" id="piggy" data-act="piggy"><span class="pig">🐷</span><div class="grow" style="text-align:left"><b>Копилка</b><div class="pbar2"><div id="piggyFill"></div></div><small id="piggyTxt"></small></div></button>
    ${SHINE.questsReady() ? `<button class="banner quest-banner" data-act="openQuests"><span>📜</span><div style="text-align:left">Задание выполнено!<div class="sub">Забери награду</div></div></button>` : `<button class="qline" data-act="openQuests">📜 Задания дня</button>`}` : ''}
    <div class="card" style="width:100%;margin-top:12px">
      ${nx ? `<div class="row"><div class="ico">${nx.emoji}</div><div class="grow"><div class="sub">Следующий статус</div><div class="name">${nx.name}</div><div class="sub">Заработай всего <span class="price">${money(nx.need)}</span></div></div></div>`
           : `<div class="row"><div class="ico">👑</div><div class="grow"><div class="name">Ты на вершине!</div><div class="sub">Попробуй «Новую жизнь» во вкладке «Ещё» для множителя</div></div></div>`}
    </div>
  </div>`;
  const btn = $('#tapBtn');
  btn.addEventListener('pointerdown', e => {
    e.preventDefault(); btn.classList.add('pressed');
    doTap(e.clientX, e.clientY);
  });
  const up = () => btn.classList.remove('pressed');
  btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('pointerleave', up);
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

/* ===== БИЗНЕС ===== */
function renderBiz() {
  let h = `<div class="h2">🏪 Бизнес</div><div class="mult-bar"><div class="seg">${[1, 10, 100, 'max'].map(m => `<button data-act="mult" data-v="${m}" class="${S.buyMult === m ? 'on' : ''}">${m === 'max' ? 'Макс' : 'x' + m}</button>`).join('')}</div></div>`;
  let shownLocked = false;
  BUSINESSES.forEach((b, i) => {
    const st = bst(b.id);
    const prevOwned = i === 0 || bst(BUSINESSES[i - 1].id).lvl > 0;
    if (!st.lvl && !prevOwned) {
      if (!shownLocked) { shownLocked = true; h += `<div class="card biz locked"><div class="row"><div class="ico">🔒</div><div class="grow"><div class="name">${b.name}</div><div class="sub">Купи предыдущий бизнес, чтобы открыть</div></div></div></div>`; }
      return;
    }
    const nm = nextMs(st.lvl);
    h += `<div class="card biz" id="biz-${b.id}">
      <div class="row">
        <div class="ico ${st.lvl && !st.mgr ? 'idle' : ''}" data-act="run" data-id="${b.id}">${b.emoji}</div>
        <div class="grow"><div class="name">${b.name}<span class="lvl">ур. ${st.lvl}</span></div>
          <div class="ms">${st.mgr ? '🧑‍💼 Менеджер работает' : st.lvl ? '👆 Жми на иконку, чтобы запустить' : 'Не куплен'}${nm ? ` · бонус x2 на ур. ${nm}` : ''}</div></div>
      </div>
      <div class="pbar ${b.time / (st.mgr ? 1 : 1) < 0.35 ? 'fast' : ''}"><div data-p="${b.id}"></div><span><b>${money(st.lvl ? bizRev(b) : b.rev * globalMult() * bizUpg())}</b><b data-t="${b.id}">${fmtTime(b.time)}</b></span></div>
      <div class="btns">
        <button class="btn" data-act="buyBiz" data-id="${b.id}" data-bb="${b.id}"></button>
        ${st.lvl && !st.mgr ? `<button class="btn pink" data-act="mgr" data-id="${b.id}" data-cost="${b.mgrCost}">🧑‍💼 ${money(b.mgrCost)}</button>` : ''}
      </div></div>`;
  });
  $('#tab-biz').innerHTML = h;
}
function buyBiz(id) {
  const b = BUSINESSES.find(x => x.id === id), n = buyCount(b), c = costN(b, n);
  if (!spend(c)) return;
  const st = bst(id), before = st.lvl; st.lvl += n; S.stats.bizBought = (S.stats.bizBought || 0) + n;
  Sfx.buy(); vibe(15);
  if (before === 0) { confetti(60); toast(b.emoji, 'Новый бизнес!', b.name); }
  const m = MILESTONES.filter(t => t > before && t <= st.lvl);
  if (m.length) { toast('⭐', `${b.name}: доход x${Math.pow(2, m.length)}!`, `Уровень ${m[m.length - 1]}`); Sfx.levelup(); confetti(80); }
  renderTab();
}
function hireMgr(id) {
  const b = BUSINESSES.find(x => x.id === id);
  if (!spend(b.mgrCost)) return;
  bst(id).mgr = true; Sfx.buy(); confetti(50); toast('🧑‍💼', 'Менеджер нанят!', b.name + ' работает сам'); renderTab();
}
function runBiz(id) {
  const st = bst(id); if (!st.lvl || st.mgr || st.run) return;
  st.run = true; st.prog = 0; Sfx.click(); vibe(8);
  const ico = document.querySelector(`#biz-${id} .ico`); if (ico) ico.classList.remove('idle');
}

/* ===== УЛУЧШЕНИЯ ===== */
function renderUpg() {
  const avail = UPGRADES.filter(u => !S.upg[u.id]).sort((a, b) => a.cost - b.cost);
  const owned = UPGRADES.filter(u => S.upg[u.id]);
  let h = `<div class="h2">🚀 Улучшения</div>`;
  h += `<div class="card" style="background:linear-gradient(135deg,rgba(0,245,160,.25),rgba(0,217,245,.15))"><div class="row"><div class="ico">📊</div><div class="grow">
    <div class="sub">Тап x${fmt(tapUpg())} · Бизнес x${fmt(bizUpg())} · Авто ${autoRate()}/с</div>
    <div class="sub">Статус x${lifeMult().toFixed(2)} · Опыт x${prestigeMult().toFixed(1)} · Достижения x${achMult().toFixed(2)}</div></div></div></div>`;
  avail.slice(0, 12).forEach(u => {
    h += `<div class="card item"><div class="ico">${u.emoji}</div><div class="grow"><div class="name">${u.name}</div><div class="sub">${u.desc}</div></div>
      <button class="btn gold" data-act="upg" data-id="${u.id}" data-cost="${u.cost}">${money(u.cost)}</button></div>`;
  });
  if (!avail.length) h += `<div class="card" style="text-align:center">🏆 Все улучшения куплены!</div>`;
  const mg = BUSINESSES.filter(b => bst(b.id).lvl && !bst(b.id).mgr);
  if (mg.length) {
    h += `<div class="cat-title">🧑‍💼 Менеджеры (бизнес работает сам и офлайн)</div>`;
    mg.forEach(b => h += `<div class="card item"><div class="ico">${b.emoji}</div><div class="grow"><div class="name">${b.name}</div><div class="sub">Автоматизация</div></div><button class="btn pink" data-act="mgr" data-id="${b.id}" data-cost="${b.mgrCost}">${money(b.mgrCost)}</button></div>`);
  }
  if (owned.length) h += `<div class="cat-title">✅ Куплено: ${owned.length}</div><div class="card" style="font-size:26px;letter-spacing:6px;text-align:center">${owned.map(u => u.emoji).join('')}</div>`;
  $('#tab-upg').innerHTML = h;
}
function buyUpg(id) {
  const u = UPGRADES.find(x => x.id === id); if (S.upg[id] || !spend(u.cost)) return;
  S.upg[id] = 1; Sfx.buy(); vibe(15); toast(u.emoji, u.name, u.desc); renderTab();
}

/* ===== ЖИЗНЬ ===== */
function renderLife() {
  const st = STAGES[S.stage];
  let h = `<div class="h2">🏝️ Жизнь</div>
  <div class="card status-card"><div class="sub">Твой статус</div><div class="big">+${statusPts()}%</div><div class="sub">бонус ко всему доходу</div>
    <div class="avatar-row">${st.emoji}${best('home').emoji}${best('car').emoji}${best('wear').emoji}</div><div class="name">${st.name}</div></div>`;
  LIFE_CATS.forEach(([cat, title]) => {
    h += `<div class="cat-title">${title}</div>`;
    LIFE.filter(l => l.cat === cat && l.cost > 0).forEach(l => {
      const own = S.life[l.id];
      h += `<div class="card item ${own ? 'owned' : ''}"><div class="ico">${l.emoji}</div><div class="grow"><div class="name">${l.name}</div><div class="sub">+${l.bonus}% к доходу</div></div>
        ${own ? '<span class="owned-tag">✓ Есть</span>' : `<button class="btn blue" data-act="life" data-id="${l.id}" data-cost="${l.cost}">${money(l.cost)}</button>`}</div>`;
    });
  });
  $('#tab-life').innerHTML = h;
}
function buyLife(id) {
  const l = LIFE.find(x => x.id === id); if (S.life[id] || !spend(l.cost)) return;
  S.life[id] = 1; Sfx.levelup(); confetti(120); vibe([20, 30, 20]);
  showModal({em: l.emoji, title: 'Покупка!', html: `Теперь у тебя есть <b>${l.name}</b>!<br>Статус +${l.bonus}% к доходу 😎`, buttons: [{label: 'Круто!', cls: 'gold'}]});
  renderTab();
}

/* ===== ЕЩЁ ===== */
function renderMore() {
  const el = $('#tab-more');
  const views = {menu: moreMenu, casino: viewCasino, cups: viewCups, stocks: viewStocks, daily: viewDaily, ach: viewAch, prestige: viewPrestige, stats: viewStats, settings: viewSettings, quests: () => SHINE.viewQuests()};
  el.innerHTML = (moreView !== 'menu' ? `<button class="btn ghost back" data-act="moreBack">← Назад</button>` : '') + views[moreView]();
  if (moreView === 'stocks') updateStocks();
}
function moreMenu() {
  const got = Object.keys(S.ach).length;
  return `<div class="h2">🎰 Ещё</div><div class="grid">
    <button class="tile t5" data-act="more" data-v="quests"><i>📜</i>Задания дня<small>Новые каждый день</small>${typeof SHINE !== 'undefined' && SHINE.questsReady() ? '<b class="dot"></b>' : ''}</button>
    <button class="tile t6" data-act="piggy"><i>🐷</i>Копилка<small>Разбей, когда полная</small></button>
    <button class="tile t1" data-act="more" data-v="casino"><i>🎰</i>Казино<small>Испытай удачу</small></button>
    <button class="tile t2" data-act="more" data-v="cups"><i>🥤</i>Напёрстки<small>Где шарик?</small></button>
    <button class="tile t3" data-act="more" data-v="stocks"><i>📈</i>Биржа<small>Купи дёшево</small></button>
    <button class="tile t4" data-act="more" data-v="daily"><i>🎁</i>Бонус дня<small>Серия: ${S.daily.streak}</small>${dailyAvailable() ? '<b class="dot"></b>' : ''}</button>
    <button class="tile" data-act="more" data-v="ach"><i>🏆</i>Достижения<small>${got}/${ACHIEVEMENTS.length}</small></button>
    <button class="tile" data-act="more" data-v="prestige"><i>♻️</i>Новая жизнь<small>Опыт: ${S.prestige}</small>${prestigeGain() >= 1 && S.stage >= 5 ? '<b class="dot"></b>' : ''}</button>
    <button class="tile" data-act="more" data-v="stats"><i>📊</i>Статистика<small>Твои рекорды</small></button>
    <button class="tile" data-act="more" data-v="settings"><i>⚙️</i>Настройки<small>Звук, вибро</small></button>
  </div>`;
}

/* --- казино --- */
let betPct = 0.1, spinning = false;
const betAmount = () => Math.max(10, Math.floor(S.cash * betPct));
function betSeg() { return `<div class="seg" style="margin:8px 0">${[0.1, 0.25, 0.5, 1].map(p => `<button data-act="bet" data-v="${p}" class="${betPct === p ? 'on' : ''}">${p === 1 ? 'Ва-банк' : p * 100 + '%'}</button>`).join('')}</div><div class="sub" style="text-align:center">Ставка: <span class="price" id="betAmt">${money(betAmount())}</span></div>`; }
function viewCasino() {
  return `<div class="h2">🎰 Казино «Золотая бутылка»</div>
  <div class="card"><div class="lights">${'<b></b>'.repeat(9)}</div>
    <div class="slots"><div class="reel" id="r0">7️⃣</div><div class="reel" id="r1">💎</div><div class="reel" id="r2">🍒</div></div>
    <div class="lights">${'<b></b>'.repeat(9)}</div>
    <div class="result" id="slotRes">Три одинаковых — x10, 💎💎💎 — x25, 7️⃣7️⃣7️⃣ — x50!</div>
    ${betSeg()}
    <button class="btn pink wide" style="margin-top:10px" data-act="spin" id="spinBtn">🎰 КРУТИТЬ</button>
    <div class="sub" style="text-align:center;margin-top:8px">Пара одинаковых — x1.5</div></div>`;
}
function doSpin() {
  if (spinning) return; const bet = betAmount();
  if (S.cash < 10) { toast('😢', 'Нет денег', 'Минимальная ставка 10 ₽'); Sfx.error(); return; }
  if (!spend(Math.min(bet, S.cash))) return;
  spinning = true; S.stats.spins++;
  const res = [pick(SLOT_SYMS), pick(SLOT_SYMS), pick(SLOT_SYMS)];
  const reels = [0, 1, 2].map(i => $('#r' + i)); reels.forEach(r => r.classList.add('spin'));
  $('#slotRes').className = 'result'; $('#slotRes').textContent = 'Крутим...';
  const iv = setInterval(() => { reels.forEach(r => { if (r.classList.contains('spin')) r.textContent = pick(SLOT_SYMS); }); Sfx.tick(); }, 70);
  [700, 1050, 1400].forEach((t, i) => setTimeout(() => { reels[i].classList.remove('spin'); reels[i].textContent = res[i]; Sfx.click(); vibe(10); }, t));
  setTimeout(() => {
    clearInterval(iv); spinning = false;
    let mult = 0;
    if (res[0] === res[1] && res[1] === res[2]) mult = res[0] === '7️⃣' ? 50 : res[0] === '💎' ? 25 : 10;
    else if (res[0] === res[1] || res[1] === res[2] || res[0] === res[2]) mult = 1.5;
    const r = $('#slotRes');
    if (!r) { if (mult) earn(bet * mult); return; }
    if (mult) {
      earn(bet * mult); r.className = 'result win'; r.textContent = `+${money(bet * mult)} (x${mult})`;
      Sfx.win(); if (mult >= 10) { confetti(200); vibe([40, 40, 80]); if (mult === 50) { S.stats.jackpots++; toast('🎰', 'ДЖЕКПОТ!', '7️⃣7️⃣7️⃣'); } }
    } else { r.className = 'result lose'; r.textContent = `−${money(bet)}`; Sfx.lose(); }
  }, 1500);
}

/* --- напёрстки --- */
let cups = {pos: [0, 1, 2], ball: 1, phase: 'idle', bet: 0};
function viewCups() {
  return `<div class="h2">🥤 Напёрстки</div>
  <div class="card"><div class="sub" style="text-align:center">Следи за шариком! Угадаешь — x2.7</div>
    <div class="cups" id="cups">${[0, 1, 2].map(i => `<div class="cup" data-act="cup" data-id="${i}" id="cup${i}" style="left:${cups.pos[i] * 35 + 2.5}%"><span class="ball" ${cups.ball === i ? '' : 'style="display:none"'}>🔴</span><span class="shell">🥤</span></div>`).join('')}</div>
    <div class="result" id="cupRes">${cups.phase === 'pick' ? 'Выбирай стакан!' : 'Сделай ставку'}</div>
    ${betSeg()}
    <button class="btn gold wide" style="margin-top:10px" data-act="cupsStart" id="cupBtn">🎲 ИГРАТЬ</button></div>`;
}
function placeCups() { [0, 1, 2].forEach(i => { const c = $('#cup' + i); if (c) c.style.left = (cups.pos[i] * 35 + 2.5) + '%'; }); }
function cupsStart() {
  if (cups.phase !== 'idle') return;
  if (S.cash < 10) { toast('😢', 'Нет денег', 'Минимальная ставка 10 ₽'); Sfx.error(); return; }
  cups.bet = Math.min(betAmount(), S.cash); if (!spend(cups.bet)) return;
  cups.phase = 'show'; cups.ball = Math.floor(Math.random() * 3);
  $$('.cup .ball').forEach((b, i) => b.style.display = i === cups.ball ? '' : 'none');
  const ballCup = $('#cup' + cups.ball); ballCup.classList.add('lift'); $('#cupRes').textContent = 'Запомни!'; $('#cupRes').className = 'result';
  setTimeout(() => {
    if (!$('#cups')) { cups.phase = 'idle'; return; }
    ballCup.classList.remove('lift'); cups.phase = 'shuffle'; $('#cupRes').textContent = 'Мешаем... 👀';
    let k = 0; const total = 9 + Math.floor(Math.random() * 5);
    const iv = setInterval(() => {
      if (!$('#cups')) { clearInterval(iv); cups.phase = 'pick'; return; }
      const a = Math.floor(Math.random() * 3); let b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
      const ia = cups.pos.indexOf(a), ib = cups.pos.indexOf(b); cups.pos[ia] = b; cups.pos[ib] = a; placeCups(); Sfx.whoosh();
      if (++k >= total) { clearInterval(iv); cups.phase = 'pick'; $('#cupRes').textContent = 'Где шарик? Выбирай!'; }
    }, 320);
  }, 1100);
}
function cupPick(i) {
  if (cups.phase !== 'pick') return; cups.phase = 'reveal';
  $('#cup' + i).classList.add('lift'); if (i !== cups.ball) setTimeout(() => $('#cup' + cups.ball) && $('#cup' + cups.ball).classList.add('lift'), 400);
  const r = $('#cupRes');
  if (i === cups.ball) { const w = cups.bet * 2.7; earn(w); S.stats.cupWins++; r.className = 'result win'; r.textContent = `Угадал! +${money(w)}`; Sfx.win(); confetti(120); vibe([30, 30, 60]); }
  else { r.className = 'result lose'; r.textContent = `Мимо! −${money(cups.bet)}`; Sfx.lose(); vibe(60); }
  setTimeout(() => { cups.phase = 'idle'; $$('.cup').forEach(c => c.classList.remove('lift')); }, 1800);
}

/* --- биржа --- */
function initMarket() {
  if (S.market && STOCKS.every(s => S.market[s.id])) return;
  S.market = {};
  STOCKS.forEach(s => { const h = []; let p = s.p; for (let i = 0; i < 40; i++) { p *= Math.exp(s.vol * gauss() + 0.03 * Math.log(s.p / p)); h.push(p); } S.market[s.id] = {p, h}; });
}
function gauss() { return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()); }
function tickMarket() {
  STOCKS.forEach(s => { const m = S.market[s.id]; m.p = Math.max(0.5, m.p * Math.exp(s.vol * gauss() + 0.03 * Math.log(s.p / m.p))); m.h.push(m.p); if (m.h.length > 40) m.h.shift(); });
  if (curTab === 'more' && moreView === 'stocks') updateStocks();
}
let stockQty = 1;
function viewStocks() {
  let h = `<div class="h2">📈 Биржа</div><div class="seg" style="margin-bottom:10px">${[1, 10, 100, 'max'].map(q => `<button data-act="sq" data-v="${q}" class="${stockQty === q ? 'on' : ''}">${q === 'max' ? 'Макс' : 'x' + q}</button>`).join('')}</div>`;
  STOCKS.forEach(s => {
    h += `<div class="card stock"><div class="row"><div class="ico" style="width:44px;height:44px;font-size:24px">${s.emoji}</div><div class="grow"><div class="name">${s.name}</div>
      <div class="sub">Цена: <b class="price" id="sp-${s.id}"></b> <span class="chg" id="sc-${s.id}"></span></div></div></div>
      <canvas id="ch-${s.id}" width="600" height="92"></canvas>
      <div class="sub" id="sh-${s.id}" style="margin-bottom:8px"></div>
      <div class="btns row"><button class="btn grow" data-act="sbuy" data-id="${s.id}">Купить</button><button class="btn red grow" data-act="ssell" data-id="${s.id}">Продать всё</button></div></div>`;
  });
  return h;
}
function updateStocks() {
  STOCKS.forEach(s => {
    const m = S.market[s.id], sp = $('#sp-' + s.id); if (!sp) return;
    const prev = m.h[m.h.length - 2] || m.p, ch = (m.p / prev - 1) * 100;
    sp.textContent = money(m.p);
    const sc = $('#sc-' + s.id); sc.textContent = (ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch).toFixed(1) + '%'; sc.className = 'chg ' + (ch >= 0 ? 'up' : 'down');
    const q = S.stocks[s.id] || 0, avg = S.stockAvg[s.id] || 0;
    $('#sh-' + s.id).innerHTML = q ? `В портфеле: <b>${fmt(q)}</b> шт · <span class="${m.p >= avg ? 'up' : 'down'}">${m.p >= avg ? '+' : ''}${money((m.p - avg) * q)}</span>` : 'Нет акций';
  });
  drawCharts();
}
function drawCharts() {
  STOCKS.forEach(s => {
    const c = $('#ch-' + s.id); if (!c) return; const g = c.getContext('2d'), h = S.market[s.id].h, W = c.width, H = c.height;
    const mn = Math.min(...h), mx = Math.max(...h), up = h[h.length - 1] >= h[0];
    g.clearRect(0, 0, W, H);
    const col = up ? '#2ee59d' : '#ff4d6d', grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, up ? 'rgba(46,229,157,.45)' : 'rgba(255,77,109,.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.beginPath(); h.forEach((v, i) => { const x = i / (h.length - 1) * W, y = H - 6 - (v - mn) / (mx - mn || 1) * (H - 12); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.lineWidth = 4; g.strokeStyle = col; g.lineJoin = 'round'; g.stroke();
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fillStyle = grad; g.fill();
  });
}
function stockBuy(id) {
  const m = S.market[id]; let q = stockQty === 'max' ? Math.floor(S.cash / m.p) : stockQty;
  if (q < 1 || !spend(q * m.p)) { if (q < 1) { Sfx.error(); toast('😢', 'Не хватает денег', ''); } return; }
  const old = S.stocks[id] || 0; S.stockAvg[id] = ((S.stockAvg[id] || 0) * old + m.p * q) / (old + q); S.stocks[id] = old + q;
  Sfx.coin(); vibe(10); updateStocks();
}
function stockSell(id) {
  const q = S.stocks[id] || 0; if (!q) { Sfx.error(); return; }
  const m = S.market[id], v = q * m.p, prof = (m.p - (S.stockAvg[id] || 0)) * q;
  S.cash += v; S.stats.stockProfit += prof; if (prof > 0) { S.totalEarned += prof; S.lifetime += prof; }
  S.stocks[id] = 0; S.stockAvg[id] = 0;
  prof >= 0 ? (Sfx.win(), toast('📈', 'Прибыль!', '+' + money(prof))) : (Sfx.lose(), toast('📉', 'Убыток', money(prof)));
  updateStocks();
}

/* --- ежедневный бонус --- */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const dailyAvailable = () => S.daily.last !== dayKey();
function viewDaily() {
  const av = dailyAvailable(), y = new Date(); y.setDate(y.getDate() - 1);
  const streakNext = av ? (S.daily.last === dayKey(y) ? S.daily.streak + 1 : 1) : S.daily.streak;
  const curDay = ((streakNext - 1) % 7) + 1;
  const ems = ['💵', '💵', '💰', '💰', '💎', '💎', '👑'];
  return `<div class="h2">🎁 Ежедневный бонус</div><div class="card" style="text-align:center">
    <div class="sub">Заходи каждый день — награда растёт!</div>
    <div class="days">${ems.map((e, i) => `<div class="day ${i + 1 < curDay || (!av && i + 1 === curDay) ? 'done' : ''} ${av && i + 1 === curDay ? 'today' : ''}"><i>${e}</i>${i + 1}</div>`).join('')}</div>
    ${av ? `<div class="sub">Сегодня: <b class="price">${money(dailyReward(curDay))}</b>${curDay === 7 ? ' + ⚡ Энергетик' : ''}</div><button class="btn gold wide" style="margin-top:12px" data-act="claimDaily">🎁 ЗАБРАТЬ</button>`
          : `<div class="name" style="margin-top:8px">✅ Уже получено. Приходи завтра!</div>`}</div>`;
}
const dailyReward = d => Math.max(500, baseReward() * 5) * d;
function claimDaily() {
  if (!dailyAvailable()) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  S.daily.streak = S.daily.last === dayKey(y) ? S.daily.streak + 1 : 1; S.daily.last = dayKey();
  const d = ((S.daily.streak - 1) % 7) + 1, r = dailyReward(d);
  earn(r); if (d === 7) { S.boostUntil = now() + 60e3; }
  Sfx.levelup(); confetti(180); vibe([20, 20, 40]);
  showModal({em: '🎁', title: `День ${d}!`, html: `Ты получил <b class="price">${money(r)}</b>${d === 7 ? '<br>⚡ и Энергетик на 60 секунд!' : ''}`, buttons: [{label: 'Ура!', cls: 'gold'}]});
  renderTab();
}

/* --- достижения --- */
function viewAch() {
  const got = Object.keys(S.ach).length;
  return `<div class="h2">🏆 Достижения ${got}/${ACHIEVEMENTS.length}</div><div class="sub" style="margin:-4px 2px 10px">Каждое достижение даёт +2% ко всему доходу</div>` +
    ACHIEVEMENTS.map(([id, em, n, d]) => `<div class="ach ${S.ach[id] ? 'got' : ''}"><div class="ico">${em}</div><div class="grow"><div class="name">${n}</div><div class="sub">${d}</div></div>${S.ach[id] ? '✅' : '🔒'}</div>`).join('');
}
function checkAch() {
  for (const [id, em, n, d, f] of ACHIEVEMENTS) {
    if (!S.ach[id] && f(S)) { S.ach[id] = now(); toast(em, 'Достижение: ' + n, d + ' · +2% к доходу'); Sfx.win(); confetti(70); }
  }
}

/* --- перерождение --- */
function viewPrestige() {
  const g = prestigeGain(), ok = g >= 1 && S.stage >= 5;
  return `<div class="h2">♻️ Новая жизнь</div><div class="card" style="text-align:center">
    <div style="font-size:64px">🌅</div>
    <div class="name" style="white-space:normal">Начни заново с опытом!</div>
    <p class="sub" style="margin:8px 0 12px;font-size:13px">Деньги, бизнесы, улучшения и имущество обнулятся, но каждый пункт опыта навсегда даёт <b>+10%</b> ко всему доходу. Достижения и статистика сохранятся.</p>
    <div class="stat"><span>Опыт сейчас</span><b>${S.prestige} (x${prestigeMult().toFixed(1)})</b></div>
    <div class="stat"><span>Получишь</span><b>+${g}</b></div>
    <div class="stat"><span>Новый множитель</span><b>x${(1 + (S.prestige + g) * 0.1).toFixed(1)}</b></div>
    ${ok ? `<button class="btn pink wide" style="margin-top:14px" data-act="rebirth">♻️ Начать заново</button>`
         : `<p class="sub" style="margin-top:12px">Доступно со статуса «Владелец ларька» и когда опыта будет хотя бы +1 (заработай больше за всё время).</p>`}</div>`;
}
function rebirth() {
  const g = prestigeGain(); if (g < 1 || S.stage < 5) return;
  showModal({em: '♻️', title: 'Точно?', html: `Начнёшь с нуля, но получишь <b>+${g}</b> опыта (x${(1 + (S.prestige + g) * 0.1).toFixed(1)} к доходу).`, buttons: [
    {label: '♻️ Да, новая жизнь!', cls: 'pink', fn: () => {
      const keep = {prestige: S.prestige + g, rebirths: S.rebirths + 1, lifetime: S.lifetime, ach: S.ach, stats: S.stats, settings: S.settings, daily: S.daily, market: S.market, taps: S.taps};
      S = Object.assign(fresh(), keep); applyTheme(); confetti(250); Sfx.levelup(); moreView = 'menu'; setTab('work'); save();
      toast('♻️', 'Новая жизнь!', `Множитель x${prestigeMult().toFixed(1)}`);
    }},
    {label: 'Отмена', cls: 'ghost'}]});
}

/* --- статистика --- */
function viewStats() {
  const st = S.stats, lv = Object.values(S.biz).reduce((a, b) => a + b.lvl, 0);
  const rows = [['💰 Заработано за всё время', money(S.lifetime)], ['📈 Заработано в этой жизни', money(S.totalEarned)], ['⚡ Доход в секунду', money(totalIps())], ['👆 Сила тапа', money(tapValue())],
    ['✋ Всего тапов', fmt(S.taps)], ['🔥 Лучшее комбо', 'x' + st.maxCombo], ['🏪 Уровней бизнеса', fmt(lv)], ['🧑‍💼 Менеджеров', Object.values(S.biz).filter(b => b.mgr).length],
    ['😎 Статус', '+' + statusPts() + '%'], ['♻️ Перерождений', S.rebirths], ['🎓 Опыт', S.prestige], ['🏆 Достижений', Object.keys(S.ach).length + '/' + ACHIEVEMENTS.length],
    ['🍾 Золотых бутылок', st.golden], ['🎲 Событий', st.events], ['🎰 Вращений слотов', st.spins], ['🥤 Побед в напёрстки', st.cupWins], ['📊 Прибыль на бирже', money(st.stockProfit)], ['⏱️ Время в игре', fmtTime(st.playTime)]];
  return `<div class="h2">📊 Статистика</div><div class="card">${rows.map(([a, b]) => `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
}
/* --- настройки --- */
function viewSettings() {
  return `<div class="h2">⚙️ Настройки</div><div class="card">
    <div class="row stat" data-act="toggle" data-v="sound"><span class="grow">🔊 Звук</span><div class="toggle ${S.settings.sound ? 'on' : ''}"></div></div>
    <div class="row stat" data-act="toggle" data-v="vibe"><span class="grow">📳 Вибрация</span><div class="toggle ${S.settings.vibe ? 'on' : ''}"></div></div>
    <p class="sub" style="margin-top:8px">На iPhone Safari вибрация может не поддерживаться — тогда работает только анимация.</p></div>
    <div class="card"><div class="name">📲 Установить на iPhone</div><p class="sub" style="margin-top:6px;font-size:13px">Открой игру в Safari → нажми «Поделиться» ⬆️ → «На экран „Домой“». Игра откроется на весь экран и работает без интернета.</p></div>
    <div class="card"><div class="name">💾 Сохранение</div><p class="sub" style="margin:6px 0 10px">Игра сохраняется автоматически каждые 5 секунд.</p>
    <button class="btn red wide" data-act="reset">🗑️ Сбросить прогресс</button></div>
    <p class="sub" style="text-align:center;margin-top:6px">От бомжа до бизнесмена · v1.0</p>`;
}
function resetGame() {
  showModal({em: '⚠️', title: 'Сбросить всё?', html: 'Весь прогресс, опыт и достижения будут удалены навсегда.', buttons: [
    {label: '🗑️ Да, удалить', cls: 'red', fn: () => { localStorage.removeItem(SAVE_KEY); S = fresh(); initMarket(); applyTheme(); moreView = 'menu'; setTab('work'); save(); toast('🧔', 'Начинаем с нуля', 'Удачи!'); }},
    {label: 'Отмена', cls: 'ghost'}]});
}

/* ---------- случайные события ---------- */
const EVENTS = [
  () => ({em: '👮', title: 'Полиция!', html: 'Сержант Петров подозрительно на тебя смотрит: «Документики!»', buttons: [
    {label: `💸 Дать на лапу (−${money(S.cash * 0.1)})`, cls: 'gold', fn: () => { S.cash *= 0.9; res('😅', 'Отпустили', 'Сержант доволен.'); }},
    {label: '🏃 Убежать!', cls: 'pink', fn: () => Math.random() < .5 ? res('💨', 'Убежал!', 'Ты быстрее ветра.') : (S.cash *= 0.75, res('🚓', 'Догнали...', 'Штраф −25% денег.', true))}]}),
  () => ({em: '🧾', title: 'Налоговая проверка', html: 'Инспектор хочет увидеть твои доходы.', buttons: [
    {label: `📑 Заплатить налог (−${money(S.cash * 0.15)})`, cls: 'gold', fn: () => { S.cash *= 0.85; res('✅', 'Всё чисто', 'Спишь спокойно.'); }},
    {label: '🧦 Спрятать в носок', cls: 'pink', fn: () => Math.random() < .6 ? res('😎', 'Не нашли!', 'Носок — надёжный банк.') : (S.cash *= 0.6, res('🚨', 'Нашли!', 'Штраф −40%.', true))}]}),
  () => { const v = baseReward() * 3; return {em: '👛', title: 'Нашёл кошелёк!', html: `Внутри <b class="price">${money(v)}</b> и визитка владельца.`, buttons: [
    {label: '💰 Забрать себе', cls: 'gold', fn: () => { earn(v); res('🤑', 'Повезло!', '+' + money(v)); }},
    {label: '😇 Вернуть хозяину', cls: 'blue', fn: () => { S.stats.honest++; Math.random() < .45 ? (earn(v * 4), res('🎩', 'Хозяин — миллионер!', 'В благодарность: +' + money(v * 4))) : res('🙏', 'Спасибо!', 'Карма +100. Тебе зачтётся.'); }}]}; },
  () => { const inv = S.cash * 0.2; return {em: '🤝', title: 'Выгодная сделка?', html: `Мутный тип в кожанке предлагает вложить <b class="price">${money(inv)}</b>. «Отвечаю, втрое отобьёшь!»`, buttons: [
    {label: '🤝 Вложить', cls: 'gold', fn: () => { S.cash -= inv; Math.random() < .55 ? (earn(inv * 3), res('📈', 'Сработало!', '+' + money(inv * 3))) : res('🕳️', 'Кинули...', 'Тип исчез вместе с деньгами.', true); }},
    {label: '🙅 Отказаться', cls: 'ghost', fn: () => res('🧠', 'Мудро', 'Деньги целы.')}]}; },
  () => ({em: '🔮', title: 'Цыганка', html: '«Позолоти ручку, красавчик — всю правду скажу!»', buttons: [
    {label: `✋ Позолотить (−${money(S.cash * 0.05)})`, cls: 'gold', fn: () => { S.cash *= 0.95; Math.random() < .5 ? (S.boostUntil = now() + 60e3, res('✨', 'Предсказание сбылось!', '⚡ Доход x3 на 60 секунд!')) : res('🙃', 'Обманула', 'Ну, бывает.', true); }},
    {label: '🚶 Пройти мимо', cls: 'ghost', fn: () => res('😏', 'Не сегодня', '')}]}),
  () => { const t = baseReward() * 0.5; return {em: '🎫', title: 'Лотерея «Бинго»', html: `Билет стоит <b class="price">${money(t)}</b>. Джекпот — в 25 раз больше!`, buttons: [
    {label: '🎫 Купить билет', cls: 'gold', fn: () => { if (S.cash < t) return res('😢', 'Не хватило денег', '', true); S.cash -= t; Math.random() < .12 ? (earn(t * 25), confetti(200), res('🎉', 'ВЫИГРЫШ!', '+' + money(t * 25))) : res('🗑️', 'Мимо', 'Не повезло в этот раз.', true); }},
    {label: '🙅 Не играю', cls: 'ghost', fn: () => res('👌', 'Ок', '')}]}; },
];
function res(em, title, text, bad) {
  setTimeout(() => { bad ? Sfx.lose() : Sfx.win(); if (!bad) confetti(60); showModal({em, title, html: text, buttons: [{label: 'OK', cls: 'gold'}]}); }, 50);
}
let nextEvent = now() + rnd(70e3, 120e3);
function maybeEvent() {
  if (now() < nextEvent || modalOpen || S.totalEarned < 300 || document.hidden) return;
  nextEvent = now() + rnd(90e3, 150e3); S.stats.events++;
  Sfx.whoosh(); vibe([20, 40, 20]); showModal(pick(EVENTS)());
}

/* ---------- золотая бутылка ---------- */
let nextGold = now() + rnd(30e3, 60e3), goldHide = 0;
function goldTick() {
  const g = $('#golden');
  if (!g.classList.contains('hidden') && now() > goldHide) g.classList.add('hidden');
  if (now() < nextGold || document.hidden) return;
  const f = S.upg.gb ? 0.55 : 1;
  nextGold = now() + rnd(45e3, 100e3) * f; goldHide = now() + 9000;
  g.style.left = rnd(20, innerWidth - 80) + 'px'; g.style.top = rnd(innerHeight * 0.2, innerHeight * 0.65) + 'px';
  g.textContent = pick(['🍾', '💰', '💎']); g.classList.remove('hidden'); Sfx.coin();
}
$('#golden').addEventListener('pointerdown', e => {
  e.preventDefault(); Sfx.init(); const g = $('#golden'); g.classList.add('hidden'); S.stats.golden++;
  if (Math.random() < .3) { S.frenzyUntil = now() + 15e3; floatText(e.clientX, e.clientY, 'БЕЗУМИЕ! Тап x7', true); toast('🔥', 'Безумие тапов!', 'x7 к тапу на 15 секунд'); }
  else { const v = Math.max(77, bizIps() * 90 + tapValue() * 40); earn(v); floatText(e.clientX, e.clientY, '+' + money(v), true); }
  particles(e.clientX, e.clientY, 16, ['✨', '💰', '⭐', '💎']); Sfx.levelup(); vibe([20, 20, 40]);
});

/* ---------- бусты ---------- */
function energy() {
  if (now() < S.boostCd) { Sfx.error(); return; }
  S.boostUntil = now() + 30e3; S.boostCd = now() + 180e3; S.stats.energy = (S.stats.energy || 0) + 1; Sfx.levelup(); confetti(80); vibe(30); toast('⚡', 'Энергетик!', 'Весь доход x3 на 30 секунд');
}
function ad() {
  if (now() < S.adCd) { Sfx.error(); return; }
  const v = Math.max(200, totalIps() * 120 + tapValue() * 50); earn(v); S.adCd = now() + 300e3;
  Sfx.coin(); confetti(60); toast('📣', 'Реклама сработала!', '+' + money(v));
}

/* ---------- обработчик действий ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  Sfx.init();
  const a = t.dataset.act, id = t.dataset.id, v = t.dataset.v;
  switch (a) {
    case 'buyBiz': buyBiz(id); break;
    case 'mgr': hireMgr(id); break;
    case 'run': runBiz(id); break;
    case 'mult': S.buyMult = v === 'max' ? 'max' : +v; Sfx.click(); renderTab(); break;
    case 'upg': buyUpg(id); break;
    case 'life': buyLife(id); break;
    case 'more': moreView = v; Sfx.click(); renderTab(); $('#tab-more').scrollTop = 0; break;
    case 'moreBack': moreView = 'menu'; Sfx.click(); renderTab(); break;
    case 'openDaily': moreView = 'daily'; setTab('more'); break;
    case 'bet': betPct = +v; Sfx.click(); $$('[data-act=bet]').forEach(b => b.classList.toggle('on', b === t)); break;
    case 'spin': doSpin(); break;
    case 'cupsStart': cupsStart(); break;
    case 'cup': cupPick(+id); break;
    case 'sq': stockQty = v === 'max' ? 'max' : +v; Sfx.click(); $$('[data-act=sq]').forEach(b => b.classList.toggle('on', b === t)); break;
    case 'sbuy': stockBuy(id); break;
    case 'ssell': stockSell(id); break;
    case 'claimDaily': claimDaily(); break;
    case 'rebirth': rebirth(); break;
    case 'toggle': S.settings[v] = !S.settings[v]; Sfx.on = S.settings.sound; Sfx.click(); renderTab(); save(); break;
    case 'reset': resetGame(); break;
    case 'energy': energy(); break;
    case 'ad': ad(); break;
    case 'quest': SHINE.claimQuest(id); break;
    case 'piggy': SHINE.piggyBreak(); break;
    case 'openQuests': moreView = 'quests'; setTab('more'); break;
  }
});
$$('#tabs button').forEach(b => b.addEventListener('click', () => { Sfx.init(); Sfx.click(); vibe(5); if (b.dataset.tab === 'more' && curTab === 'more') moreView = 'menu'; setTab(b.dataset.tab); }));

/* ---------- цикл ---------- */
function updateHUD() {
  $('#cash').textContent = money(S.cash);
  $('#ips').textContent = money(totalIps()) + '/с';
  $('#boostTag').classList.toggle('hidden', !boostOn() && !frenzyOn());
  $('#boostTag').textContent = frenzyOn() ? '🔥 тап x7' : '⚡ x3';
  const cur = STAGES[S.stage], nx = STAGES[S.stage + 1];
  if (nx) {
    const p = clamp((S.totalEarned - cur.need) / (nx.need - cur.need), 0, 1);
    $('#stageFill').style.width = (p * 100) + '%';
    $('#stageNext').textContent = `${nx.emoji} ${nx.name}: ${Math.floor(p * 100)}%`;
  } else { $('#stageFill').style.width = '100%'; $('#stageNext').textContent = '👑 Вершина достигнута!'; }
}
function updateDynamic() {
  updateHUD();
  $$('[data-cost]').forEach(b => b.classList.toggle('off', S.cash < +b.dataset.cost));
  if (curTab === 'work' && $('#wTap')) {
    $('#wTap').textContent = money(tapValue());
    const e = S.boostCd - now(), a = S.adCd - now();
    $('#bEnergy').textContent = boostOn() ? `Активно: ${fmtTime((S.boostUntil - now()) / 1000)}` : e > 0 ? `Через ${fmtTime(e / 1000)}` : 'x3 доход на 30с — ГОТОВО!';
    $('#cdEnergy').style.width = (e > 0 ? (1 - e / 180e3) * 100 : 100) + '%';
    $('#bAd').textContent = a > 0 ? `Через ${fmtTime(a / 1000)}` : `+${money(Math.max(200, totalIps() * 120 + tapValue() * 50))} — ГОТОВО!`;
    $('#cdAd').style.width = (a > 0 ? (1 - a / 300e3) * 100 : 100) + '%';
  }
  if (curTab === 'biz') {
    BUSINESSES.forEach(b => {
      const btn = document.querySelector(`[data-bb="${b.id}"]`); if (!btn) return;
      const n = buyCount(b), c = costN(b, n);
      btn.innerHTML = `${bst(b.id).lvl ? 'Улучшить' : 'Купить'} x${n} · ${money(c)}`; btn.dataset.cost = c; btn.classList.toggle('off', S.cash < c);
    });
  }
  if (curTab === 'more' && (moreView === 'casino' || moreView === 'cups') && $('#betAmt')) $('#betAmt').textContent = money(betAmount());
  // точки на вкладках
  $('#dotBiz').classList.toggle('hidden', !BUSINESSES.some((b, i) => (i === 0 || bst(BUSINESSES[i - 1].id).lvl) && S.cash >= costN(b, 1)));
  $('#dotUpg').classList.toggle('hidden', !UPGRADES.some(u => !S.upg[u.id] && S.cash >= u.cost));
  $('#dotMore').classList.toggle('hidden', !dailyAvailable() && !(typeof SHINE !== 'undefined' && SHINE.questsReady()));
  if (curTab === 'work' && $('#piggyFill')) { const cap = SHINE.piggyCap(), p = Math.min(1, (S.piggy || 0) / cap); $('#piggyFill').style.width = (p * 100) + '%'; $('#piggyTxt').textContent = p >= 0.999 ? `ПОЛНАЯ! Разбей — получишь ${money((S.piggy || 0) * 2)}` : `${money(S.piggy || 0)} из ${money(cap)} · x2 при разбивании`; $('#piggy').classList.toggle('full', p >= 0.999); }
}
function updateBars() {
  if (curTab !== 'biz') return;
  BUSINESSES.forEach(b => {
    const d = document.querySelector(`[data-p="${b.id}"]`); if (!d) return;
    const st = bst(b.id); d.style.width = (st.prog * 100) + '%';
    const t = document.querySelector(`[data-t="${b.id}"]`);
    if (t) t.textContent = (st.run || st.mgr) ? fmtTime(b.time * (1 - st.prog) + 0.99) : fmtTime(b.time);
    const ico = document.querySelector(`#biz-${b.id} .ico`);
    if (ico && st.lvl && !st.mgr) ico.classList.toggle('idle', !st.run);
  });
}
let lastFrame = performance.now(), uiAcc = 0, secAcc = 0, mktAcc = 0, saveAcc = 0;
function frame(t) {
  const dt = Math.min(1, (t - lastFrame) / 1000); lastFrame = t;
  // бизнесы
  for (const b of BUSINESSES) {
    const st = bst(b.id); if (!st.lvl || !(st.mgr || st.run)) continue;
    st.prog += dt / b.time;
    if (st.prog >= 1) {
      if (st.mgr) { const n = Math.floor(st.prog); earn(bizRev(b) * n); st.prog -= n; }
      else { earn(bizRev(b)); st.prog = 0; st.run = false; if (curTab === 'biz') { const el = document.querySelector(`#biz-${b.id} .ico`); if (el) { const r = el.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top, '+' + money(bizRev(b))); Sfx.coin(); } } }
    }
  }
  // авто-тапы
  autoAcc += autoRate() * dt; if (autoAcc >= 1) { const n = Math.floor(autoAcc); autoAcc -= n; earn(tapValue() * n); }
  if (now() - lastTap > 1200) combo = 0;
  uiAcc += dt; secAcc += dt; mktAcc += dt; saveAcc += dt;
  updateBars();
  if (curTab === 'work' && $('#comboFill')) {
    $('#comboFill').style.width = Math.min(combo, 100) + '%';
    $('#comboLbl').textContent = combo > 3 ? `🔥 КОМБО x${(1 + Math.min(combo, 100) / 100).toFixed(2)}` : '';
  }
  if (uiAcc > 0.15) { uiAcc = 0; updateDynamic(); checkStage(); }
  if (secAcc > 1) { S.stats.playTime += secAcc; secAcc = 0; checkAch(); maybeEvent(); goldTick(); }
  if (mktAcc > 2) { mktAcc = 0; tickMarket(); }
  if (saveAcc > 5) { saveAcc = 0; save(); }
  requestAnimationFrame(frame);
}

/* ---------- офлайн доход ---------- */
function offlineEarnings() {
  const sec = Math.min(8 * 3600, (now() - S.lastSave) / 1000);
  if (sec < 30) return;
  const ips = bizIps() + autoRate() * tapValue(); const v = ips * sec;
  // прогресс циклов без менеджеров не копится
  if (v > 0) {
    earn(v);
    showModal({em: '😴', title: 'С возвращением!', html: `Пока тебя не было (${fmtTime(sec)}), ты заработал<br><b class="price" style="font-size:26px">${money(v)}</b>${ips === 0 ? '' : ''}`, buttons: [{label: '💰 Забрать', cls: 'gold', fn: () => { Sfx.coin(); confetti(100); }}]});
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else { offlineEarnings(); lastFrame = performance.now(); S.lastSave = now(); }
});
addEventListener('pagehide', save);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

/* ---------- старт ---------- */
const had = load();
Sfx.on = S.settings.sound;
initMarket(); applyTheme(); renderTab();
if (had) offlineEarnings();
else showModal({em: '🧔', title: 'От бомжа до бизнесмена', html: 'У тебя нет ничего, кроме коробки и мечты.<br><br>👆 Тапай, собирай бутылки, открывай бизнесы и стань <b>миллиардером</b>!', buttons: [{label: '🚀 Начать путь', cls: 'gold', fn: () => Sfx.init()}]});
S.lastSave = now();
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller; let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadSW || reloading) return; reloading = true; save(); location.reload(); });
  navigator.serviceWorker.register('service-worker.js', {updateViaCache: 'none'}).then(reg => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    setInterval(() => reg.update().catch(() => {}), 15 * 60e3);
  }).catch(() => {});
}
window.__game = {get S() { return S; }, fmt, save, load, checkStage, setTab, earn};
