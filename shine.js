'use strict';
/* ====== v2.0 «Блеск успеха»: живой город, золотые монеты, денежный дождь, копилка, задания дня ====== */
const SHINE = (() => {
  const lowFx = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Палитры неба для каждого статуса: верх, середина, горизонт, дома, окна, светило ('sun'|'moon'|'neon')
  const SKIES = [
    ['#2b1f4a', '#5a3a6e', '#ff8a5c', '#24183a', '#ffcf6b', 'moon'],
    ['#24346e', '#6a4c9c', '#ff9a6b', '#1f2550', '#ffd76b', 'sun'],
    ['#38c7e8', '#8ae3c8', '#fff1a8', '#2f7a6a', '#fff4c0', 'sun'],
    ['#2aa8ff', '#7fd8ff', '#ffe08a', '#3d5fa8', '#fff3b0', 'sun'],
    ['#1a0b3e', '#7a1f6e', '#ff4f7a', '#1f0d36', '#ff9de6', 'neon'],
    ['#1a4fd6', '#5aa0ff', '#ffb36b', '#1d2f72', '#ffe39a', 'sun'],
    ['#4a1c8c', '#c048b8', '#ffb07a', '#2c0f52', '#ffd0f0', 'sun'],
    ['#06121f', '#123a5c', '#2ec5ff', '#081a2c', '#7ae8ff', 'neon'],
    ['#3a2400', '#b07a10', '#ffe27a', '#2a1a00', '#fff2b0', 'sun'],
    ['#3a0b52', '#c42e8a', '#ffd76b', '#2a0838', '#fff0a0', 'sun'],
  ];
  const sky = document.createElement('canvas'); sky.id = 'sky'; document.getElementById('bg').prepend(sky);
  const fxc = document.createElement('canvas'); fxc.id = 'fx2'; document.body.appendChild(fxc);
  const g = sky.getContext('2d'), f = fxc.getContext('2d');
  let W = 0, H = 0, DPR = 1, bgCache = null, bgKey = '';
  function size() {
    DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    for (const c of [sky, fxc]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    bgKey = '';
  }
  addEventListener('resize', size); size();
  const R = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function buildBg(st) {
    const P = SKIES[st] || SKIES[0], c = document.createElement('canvas'); c.width = sky.width; c.height = sky.height;
    const x = c.getContext('2d'); x.scale(DPR, DPR);
    const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, P[0]); gr.addColorStop(0.55, P[1]); gr.addColorStop(0.82, P[2]); gr.addColorStop(1, P[3]);
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    // светило
    const sx = W * 0.78, sy = H * 0.2;
    if (P[5] !== 'neon') {
      const halo = x.createRadialGradient(sx, sy, 0, sx, sy, 160); halo.addColorStop(0, P[5] === 'moon' ? 'rgba(255,245,220,.55)' : 'rgba(255,250,210,.8)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
      x.fillStyle = halo; x.fillRect(sx - 160, sy - 160, 320, 320);
      x.fillStyle = P[5] === 'moon' ? '#fff3d6' : '#fffbe0'; x.beginPath(); x.arc(sx, sy, P[5] === 'moon' ? 26 : 34, 0, 7); x.fill();
      if (P[5] === 'moon') { x.fillStyle = P[0]; x.beginPath(); x.arc(sx + 11, sy - 6, 22, 0, 7); x.fill(); }
    }
    // облака
    const rnd = R(st * 977 + 13);
    x.fillStyle = 'rgba(255,255,255,.16)';
    for (let i = 0; i < 6; i++) { const cx = rnd() * W, cy = H * (0.08 + rnd() * 0.35), s = 30 + rnd() * 50; x.beginPath(); x.ellipse(cx, cy, s * 1.8, s * 0.45, 0, 0, 7); x.ellipse(cx + s * 0.6, cy - s * 0.25, s, s * 0.5, 0, 0, 7); x.fill(); }
    // три слоя города
    const layers = [[0.56, 0.32, 0.45], [0.66, 0.6, 0.7], [0.76, 1, 1]];
    for (const [base, dark, wn] of layers) {
      let bx = -10; const y0 = H * base + 40;
      while (bx < W + 10) {
        const bw = 26 + rnd() * 46, bh = (60 + rnd() * 150) * (0.6 + st * 0.06) * (1.1 - dark * 0.3);
        x.fillStyle = mix(P[3], P[1], 1 - dark); x.fillRect(bx, y0 - bh, bw, H);
        if (rnd() < 0.3) { x.fillRect(bx + bw * 0.4, y0 - bh - 14, 3, 14); }
        if (dark > 0.5) for (let wy = y0 - bh + 8; wy < y0 + 120; wy += 13) for (let wx = bx + 5; wx < bx + bw - 6; wx += 10) if (rnd() < 0.42 * wn) { x.fillStyle = P[4]; x.globalAlpha = 0.45 + rnd() * 0.5; x.fillRect(wx, wy, 5, 7); x.globalAlpha = 1; }
        bx += bw + 2 + rnd() * 8;
      }
    }
    // дымка снизу
    const fog = x.createLinearGradient(0, H * 0.7, 0, H); fog.addColorStop(0, 'rgba(0,0,0,0)'); fog.addColorStop(1, 'rgba(10,0,25,.55)');
    x.fillStyle = fog; x.fillRect(0, H * 0.7, W, H * 0.3);
    return c;
  }
  function mix(a, b, t) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; }
  // боке и искры
  const bokeh = Array.from({ length: lowFx ? 8 : 22 }, () => ({ x: Math.random(), y: Math.random(), r: 4 + Math.random() * 16, v: 0.004 + Math.random() * 0.01, ph: Math.random() * 7 }));
  const glowC = {};
  function glow(col) { if (glowC[col]) return glowC[col]; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return glowC[col] = c; }
  // ---- частицы монет на верхнем слое ----
  const parts = [];
  function coin(x, y, n, big) {
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, s = (big ? 380 : 260) * (0.5 + Math.random() * 0.7); parts.push({ k: 'coin', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.9 + Math.random() * 0.4, r: (big ? 9 : 7) * (0.7 + Math.random() * 0.5), sp: Math.random() * 7 }); }
    parts.push({ k: 'ring', x, y, t: 0, life: 0.45, r: big ? 90 : 55 });
    parts.push({ k: 'flash', x, y, t: 0, life: 0.3, r: big ? 140 : 80 });
    for (let i = 0; i < (big ? 10 : 4); i++) parts.push({ k: 'star', x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 80, t: 0, life: 0.6 + Math.random() * 0.3, r: 3 + Math.random() * 3 });
    if (parts.length > 220) parts.splice(0, parts.length - 220);
  }
  function drawCoin(x, y, r, spin) {
    const sx = Math.abs(Math.cos(spin)) * 0.75 + 0.25;
    f.save(); f.translate(x, y); f.scale(sx, 1);
    f.fillStyle = '#b86e00'; f.beginPath(); f.arc(0, 1.2, r, 0, 7); f.fill();
    const gr = f.createRadialGradient(-r * 0.35, -r * 0.4, 0, 0, 0, r); gr.addColorStop(0, '#fff8c0'); gr.addColorStop(0.45, '#ffd23f'); gr.addColorStop(1, '#e08f00');
    f.fillStyle = gr; f.beginPath(); f.arc(0, 0, r, 0, 7); f.fill();
    f.strokeStyle = 'rgba(160,90,0,.7)'; f.lineWidth = Math.max(1, r * 0.16); f.beginPath(); f.arc(0, 0, r * 0.66, 0, 7); f.stroke();
    f.fillStyle = 'rgba(150,80,0,.85)'; f.font = `900 ${r * 1.05}px system-ui`; f.textAlign = 'center'; f.textBaseline = 'middle'; f.fillText('₽', 0, r * 0.06);
    f.restore();
  }
  // ---- денежный дождь ----
  let rain = null, nextRain = Date.now() + 75e3 + Math.random() * 60e3;
  const billVal = () => Math.max(25, (typeof baseReward === 'function' ? baseReward() : 100) * 0.06);
  function startRain(sec = 9) {
    rain = { until: Date.now() + sec * 1000, items: [], spawnAcc: 0, got: 0, sum: 0 };
    toast('💸', 'Денежный дождь!', 'Лови купюры и монеты — тапай по ним!'); Sfx.levelup(); vibe([20, 30, 20]);
  }
  function rainStep(dt) {
    if (!rain) {
      if (Date.now() > nextRain && !document.hidden && !modalOpen && S.totalEarned >= 300) { nextRain = Date.now() + 110e3 + Math.random() * 90e3; startRain(); }
      return;
    }
    const live = Date.now() < rain.until;
    if (live) { rain.spawnAcc += dt * 5.5; while (rain.spawnAcc > 1) { rain.spawnAcc--; rain.items.push({ x: 20 + Math.random() * (W - 40), y: -30, vy: 90 + Math.random() * 70, sw: Math.random() * 7, bill: Math.random() < 0.55, rot: (Math.random() - 0.5) * 0.6 }); } }
    for (const it of rain.items) { it.y += it.vy * dt; it.sw += dt * 2.2; }
    rain.items = rain.items.filter(it => it.y < H + 40 && !it.dead);
    if (!live && !rain.items.length) { if (rain.got) toast('💸', `Поймано: ${rain.got}`, '+' + money(rain.sum)); S.stats.rainBest = Math.max(S.stats.rainBest || 0, rain.got); rain = null; }
  }
  function drawBill(it) {
    const x = it.x + Math.sin(it.sw) * 18, y = it.y;
    f.save(); f.translate(x, y); f.rotate(it.rot + Math.sin(it.sw) * 0.35);
    f.globalCompositeOperation = 'lighter'; f.globalAlpha = 0.55; f.drawImage(glow('rgba(140,255,170,1)'), -34, -34, 68, 68); f.globalAlpha = 1; f.globalCompositeOperation = 'source-over';
    if (it.bill) {
      f.scale(1, 0.62 + 0.38 * Math.abs(Math.cos(it.sw)));
      f.fillStyle = '#1f8a4c'; roundRect(f, -24, -13, 48, 26, 4); f.fill();
      const gr = f.createLinearGradient(-24, -13, 24, 13); gr.addColorStop(0, '#7dffb0'); gr.addColorStop(1, '#2fc46e'); f.fillStyle = gr; roundRect(f, -22, -11, 44, 22, 3); f.fill();
      f.strokeStyle = 'rgba(10,90,40,.6)'; f.lineWidth = 1.5; f.beginPath(); f.ellipse(0, 0, 7, 8, 0, 0, 7); f.stroke();
      f.fillStyle = '#0d5a2c'; f.font = '900 11px system-ui'; f.textAlign = 'center'; f.textBaseline = 'middle'; f.fillText('₽', 0, 0.5);
    } else drawCoin(0, 0, 12, it.sw * 2);
    f.restore();
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  document.addEventListener('pointerdown', e => {
    if (!rain) return;
    let best = null, bd = 46;
    for (const it of rain.items) { const d = Math.hypot(it.x + Math.sin(it.sw) * 18 - e.clientX, it.y - e.clientY); if (d < bd) { bd = d; best = it; } }
    if (!best) return;
    e.preventDefault(); e.stopPropagation(); best.dead = true;
    const v = billVal() * (best.bill ? 1.6 : 1); earn(v); rain.got++; rain.sum += v; S.stats.rain = (S.stats.rain || 0) + 1;
    floatText(e.clientX, e.clientY - 10, '+' + money(v)); coin(e.clientX, e.clientY, 6, false); Sfx.coin(); vibe(8);
  }, { capture: true });
  // ---- копилка ----
  const piggyCap = () => Math.max(2000, (typeof totalIps === 'function' ? totalIps() : 0) * 900 + tapValue() * 400);
  function piggyAdd(x) { if (!(x > 0)) return; S.piggy = Math.min(piggyCap(), (S.piggy || 0) + x * 0.04); }
  function piggyBreak() {
    const cap = piggyCap(), v = S.piggy || 0;
    if (v < cap * 0.999) { Sfx.error(); toast('🐷', 'Копилка ещё не полная', `${Math.floor(v / cap * 100)}% — тапай и зарабатывай`); return; }
    earn(v * 2); S.piggy = 0; S.stats.piggy = (S.stats.piggy || 0) + 1; save();
    const el = document.querySelector('#piggy'), r = el ? el.getBoundingClientRect() : { left: W / 2, top: H / 2, width: 0, height: 0 };
    coin(r.left + r.width / 2, r.top + r.height / 2, 30, true); confetti(160); Sfx.levelup(); vibe([30, 40, 60]);
    showModal({ em: '🐷', title: 'Копилка разбита!', html: `Накоплено <b class="price">${money(v)}</b> и удвоено:<br><b class="price" style="font-size:26px">+${money(v * 2)}</b>`, buttons: [{ label: '💰 Отлично!', cls: 'gold' }] });
    renderTab();
  }
  // ---- задания дня ----
  const QUESTS = [
    { id: 'taps', t: 'Сделай 300 тапов', ico: '👆', n: 300, v: () => S.taps },
    { id: 'biz', t: 'Купи 25 уровней бизнеса', ico: '🏪', n: 25, v: () => S.stats.bizBought || 0 },
    { id: 'gold', t: 'Поймай 2 золотых бонуса', ico: '🍾', n: 2, v: () => S.stats.golden },
    { id: 'rain', t: 'Поймай 12 купюр из дождя', ico: '💸', n: 12, v: () => S.stats.rain || 0 },
    { id: 'spin', t: 'Крутани слоты 5 раз', ico: '🎰', n: 5, v: () => S.stats.spins },
    { id: 'combo', t: 'Набери комбо x60', ico: '🔥', n: 60, v: () => S.stats.maxCombo, abs: true },
    { id: 'energy', t: 'Выпей Энергетик 2 раза', ico: '⚡', n: 2, v: () => S.stats.energy || 0 },
    { id: 'upg', t: 'Купи 2 улучшения', ico: '🚀', n: 2, v: () => Object.keys(S.upg).length },
  ];
  const day = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  function quests() {
    const Q = S.quests || (S.quests = { day: '', ids: [], base: {}, got: [] });
    if (Q.day !== day()) {
      let h = 7; for (const ch of day()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const pool = QUESTS.map(q => q.id); Q.ids = [];
      while (Q.ids.length < 3) { h = (h * 1103515245 + 12345) >>> 0; Q.ids.push(pool.splice(h % pool.length, 1)[0]); }
      Q.day = day(); Q.got = []; Q.base = {}; for (const id of Q.ids) { const q = QUESTS.find(x => x.id === id); Q.base[id] = q.abs ? 0 : q.v(); }
      S.stats.dayCombo = 0; save();
    }
    return Q.ids.map(id => { const q = QUESTS.find(x => x.id === id); if (!q) return null; let have = q.v() - (Q.base[id] || 0); if (q.abs) have = (S.stats.dayCombo || 0); have = Math.max(0, Math.min(q.n, have)); return Object.assign({}, q, { have, done: have >= q.n, got: Q.got.indexOf(id) >= 0 }); }).filter(Boolean);
  }
  const questReward = () => Math.max(1000, baseReward() * 12);
  const questsReady = () => { try { return quests().filter(q => q.done && !q.got).length; } catch (e) { return 0; } };
  function viewQuests() {
    const list = quests(), rw = questReward(), all = list.every(q => q.got);
    return `<div class="h2">📜 Задания дня</div><div class="sub" style="margin:-4px 2px 10px">Три новых задания каждый день. За все три — ⚡ Энергетик на минуту!</div>` +
      list.map(q => `<div class="card quest ${q.got ? 'got' : q.done ? 'done' : ''}"><div class="row"><div class="ico">${q.ico}</div><div class="grow"><div class="name">${q.t}</div><div class="qbar"><div style="width:${Math.round(q.have / q.n * 100)}%"></div></div><div class="sub">${Math.floor(q.have)} / ${q.n}</div></div>${q.got ? '<span class="owned-tag">✅</span>' : q.done ? `<button class="btn gold" data-act="quest" data-id="${q.id}">+${money(rw)}</button>` : `<span class="price" style="font-size:13px">${money(rw)}</span>`}</div></div>`).join('') +
      (all ? '<div class="card" style="text-align:center">🎉 Все задания выполнены! Новые — завтра.</div>' : '');
  }
  function claimQuest(id) {
    const Q = S.quests; const q = quests().find(x => x.id === id); if (!q || !q.done || q.got) return;
    Q.got.push(id); earn(questReward()); S.stats.quests = (S.stats.quests || 0) + 1;
    if (Q.got.length >= 3) { S.boostUntil = Math.max(S.boostUntil, now()) + 60e3; toast('⚡', 'Все задания выполнены!', 'Энергетик x3 на 60 секунд'); confetti(200); } else confetti(90);
    Sfx.levelup(); save(); renderTab();
  }
  // ---- цикл отрисовки ----
  let last = performance.now(), acc = 0;
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!document.hidden) {
      acc += dt;
      rainStep(dt);
      const busy = parts.length || rain;
      if (acc >= (busy ? 1 / 60 : 1 / 30)) { // фон 30 к/с, эффекты 60 к/с
        const k = acc; acc = 0;
        const key = S.stage + ':' + sky.width + 'x' + sky.height;
        if (key !== bgKey) { bgKey = key; bgCache = buildBg(S.stage); }
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bgCache, 0, 0);
        g.setTransform(DPR, 0, 0, DPR, 0, 0); g.globalCompositeOperation = 'lighter';
        const P = SKIES[S.stage] || SKIES[0];
        for (const b of bokeh) { b.y -= b.v * k * 3; b.ph += k; if (b.y < -0.1) { b.y = 1.05; b.x = Math.random(); } g.globalAlpha = 0.25 + 0.2 * Math.sin(b.ph * 1.7); g.drawImage(glow(b.r > 13 ? 'rgba(255,220,140,1)' : 'rgba(255,255,255,1)'), b.x * W - b.r * 2, b.y * H - b.r * 2, b.r * 4, b.r * 4); }
        if (P[5] === 'neon') { g.globalAlpha = 0.18 + 0.08 * Math.sin(t / 400); g.drawImage(glow('rgba(255,80,200,1)'), W * 0.1, H * 0.45, W * 0.8, H * 0.4); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, fxc.width, fxc.height); f.setTransform(DPR, 0, 0, DPR, 0, 0);
        for (const p of parts) { p.t += k; if (p.vx !== undefined) { p.vy += 900 * k; p.x += p.vx * k; p.y += p.vy * k; } }
        for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t >= parts[i].life) parts.splice(i, 1);
        for (const p of parts) {
          const a = 1 - p.t / p.life;
          if (p.k === 'coin') { f.globalAlpha = Math.min(1, a * 2); drawCoin(p.x, p.y, p.r, p.sp + p.t * 14); }
          else if (p.k === 'ring') { f.globalAlpha = a; f.strokeStyle = '#ffe680'; f.lineWidth = 4 * a + 1; f.beginPath(); f.arc(p.x, p.y, p.r * (0.3 + 0.7 * (1 - a)), 0, 7); f.stroke(); }
          else if (p.k === 'flash') { f.globalCompositeOperation = 'lighter'; f.globalAlpha = a * 0.8; f.drawImage(glow('rgba(255,230,140,1)'), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); f.globalCompositeOperation = 'source-over'; }
          else if (p.k === 'star') { f.globalCompositeOperation = 'lighter'; f.globalAlpha = a; f.fillStyle = '#fff6c0'; const r = p.r * (0.5 + a); f.beginPath(); f.moveTo(p.x, p.y - r * 2); f.quadraticCurveTo(p.x, p.y, p.x + r * 2, p.y); f.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 2); f.quadraticCurveTo(p.x, p.y, p.x - r * 2, p.y); f.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 2); f.fill(); f.globalCompositeOperation = 'source-over'; }
        }
        f.globalAlpha = 1;
        if (rain) for (const it of rain.items) drawBill(it);
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return { coin, piggyAdd, piggyBreak, piggyCap, quests, questsReady, viewQuests, claimQuest, startRain, get rain() { return rain; } };
})();
renderTab();
