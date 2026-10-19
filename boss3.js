/* v3.0: титульный экран, «Бум-режим» и мини-игра «Небоскрёб». Без внешних ресурсов. */
const B3 = (() => {
  'use strict';
  S.b3 = Object.assign({tbest: 0, tlast: 0, booms: 0, tplays: 0}, S.b3 || {});
  const eco = () => !!(window.PlayKit && window.PlayKit.eco);
  const D = () => Math.min(devicePixelRatio || 1, eco() ? 1.25 : 2);

  /* ---------- Титульный экран ---------- */
  const title = document.createElement('div');
  title.id = 'b3title';
  title.innerHTML = `<canvas id="b3tfx"></canvas><div class="b3t-in">
    <div class="b3t-logo"><span class="l1">ОТ БОМЖА</span><span class="l2">ДО БОССА</span><span class="l3">кликер карьеры</span></div>
    <div class="b3t-card"><div class="b3t-em" id="b3tEm"></div><div><small>Твой статус</small><b id="b3tStage"></b><span id="b3tCash"></span></div></div>
    <button class="b3t-play" id="b3tPlay"><b>Играть</b><small id="b3tSub"></small></button>
    <div class="b3t-row"><span>🏢 Небоскрёб: <b id="b3tTower"></b></span><span>💥 Бум-режимов: <b id="b3tBooms"></b></span></div>
  </div>`;
  document.body.appendChild(title);
  function fillTitle() {
    const st = STAGES[S.stage];
    $('#b3tEm').textContent = st.emoji || '🧔';
    $('#b3tStage').textContent = st.name;
    $('#b3tCash').textContent = money(S.cash);
    $('#b3tSub').textContent = S.totalEarned > 0 ? 'Продолжить карьеру' : 'Начать путь с нуля';
    $('#b3tTower').textContent = S.b3.tbest + ' эт.';
    $('#b3tBooms').textContent = S.b3.booms;
  }
  let tRaf = 0, tt0 = performance.now();
  const towers = Array.from({length: 26}, (_, i) => ({x: i / 25, h: .18 + Math.random() * .42, w: .05 + Math.random() * .05, hue: Math.random()}));
  const coins = Array.from({length: 34}, () => ({x: Math.random(), y: Math.random(), v: .1 + Math.random() * .25, r: 5 + Math.random() * 7, s: Math.random() * 6}));
  function titleFx(now) {
    tRaf = 0; if (title.classList.contains('hide') || document.hidden) return;
    tRaf = requestAnimationFrame(titleFx);
    const cv = $('#b3tfx'), d = D(), w = innerWidth, h = innerHeight;
    if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
    const t = (now - tt0) / 1000;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a0b5e'); g.addColorStop(.45, '#a8327a'); g.addColorStop(.7, '#ff8a3a'); g.addColorStop(1, '#2a0b3a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // солнце
    const sy = h * .62; const sg = c.createRadialGradient(w / 2, sy, 10, w / 2, sy, w * .6); sg.addColorStop(0, '#fff3c0'); sg.addColorStop(.2, '#ffc23f'); sg.addColorStop(1, '#ff8a3a00'); c.fillStyle = sg; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2, sy); c.rotate(t * .08); c.globalAlpha = .12; c.fillStyle = '#fff6d0';
    for (let i = 0; i < 14; i++) { c.rotate(Math.PI / 7); c.beginPath(); c.moveTo(0, 0); c.lineTo(w, -40); c.lineTo(w, 40); c.closePath(); c.fill(); }
    c.restore(); c.globalAlpha = 1;
    // город
    towers.forEach((b, i) => {
      const bx = b.x * w - b.w * w / 2, bw = b.w * w, bh = b.h * h, by = h * .78 - bh;
      const bg = c.createLinearGradient(bx, by, bx + bw, by); bg.addColorStop(0, '#2a0b4a'); bg.addColorStop(1, '#4a1a6a'); c.fillStyle = bg; c.fillRect(bx, by, bw, bh + h);
      c.fillStyle = '#ffe08a';
      for (let yy = by + 8; yy < h * .78 - 6; yy += 11) for (let xx = bx + 4; xx < bx + bw - 5; xx += 8) { const on = Math.sin(xx * 13.7 + yy * 7.1 + Math.floor(t * .7 + i)) > .2; if (on) { c.globalAlpha = .55 + .4 * Math.sin(xx + yy + t); c.fillRect(xx, yy, 3.5, 5); } }
      c.globalAlpha = 1;
    });
    const gr = c.createLinearGradient(0, h * .78, 0, h); gr.addColorStop(0, '#1a0838'); gr.addColorStop(1, '#0a0420'); c.fillStyle = gr; c.fillRect(0, h * .78, w, h);
    // монеты
    coins.forEach(k => { k.y += k.v * .006; if (k.y > 1.05) { k.y = -.05; k.x = Math.random(); } const x = k.x * w + Math.sin(t + k.s) * 12, y = k.y * h, sx = Math.abs(Math.cos(t * 3 + k.s));
      c.save(); c.translate(x, y); c.scale(sx * .9 + .1, 1); const cg = c.createRadialGradient(-k.r * .3, -k.r * .3, 1, 0, 0, k.r); cg.addColorStop(0, '#fff8d0'); cg.addColorStop(.5, '#ffc93a'); cg.addColorStop(1, '#c07a0a'); c.fillStyle = cg; c.beginPath(); c.arc(0, 0, k.r, 0, 7); c.fill(); c.fillStyle = '#9a5a06'; c.font = `900 ${k.r}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('₽', 0, 1); c.restore(); });
  }
  function openTitle() { fillTitle(); title.classList.remove('hide'); title.hidden = false; if (!tRaf) tRaf = requestAnimationFrame(titleFx); }
  function closeTitle() { title.classList.add('hide'); setTimeout(() => { if (title.classList.contains('hide')) title.hidden = true; }, 500); }
  $('#b3tPlay').addEventListener('click', () => { Sfx.init(); Sfx.click && Sfx.click(); closeTitle(); });

  /* ---------- Бум-режим ---------- */
  let meter = 0, boomUntil = 0, lastT = performance.now();
  const BOOM_NEED = 50, BOOM_SEC = 8;
  const isBoom = () => performance.now() < boomUntil;
  const origTap = doTap;
  doTap = function (x, y) {
    origTap(x, y);
    if (isBoom()) {
      const extra = tapValue() * 4; earn(extra);
      floatText(x + rnd(-30, 30), y - 40, '💥 +' + money(extra), true);
      if (typeof SHINE !== 'undefined') SHINE.coin(x, y, eco() ? 4 : 9, true);
    } else {
      meter = Math.min(BOOM_NEED, meter + 1);
      if (meter >= BOOM_NEED) startBoom();
    }
    paintMeter();
  };
  function startBoom() {
    boomUntil = performance.now() + BOOM_SEC * 1000; meter = 0; S.b3.booms++;
    document.body.classList.add('b3boom');
    toast('💥', 'БУМ-РЕЖИМ!', 'Каждый тап ×5 на ' + BOOM_SEC + ' секунд');
    try { Sfx.crit(); } catch (e) {}
    vibe(60);
    if (typeof confetti === 'function') confetti(eco() ? 50 : 120);
    save();
  }
  function paintMeter() {
    const z = document.querySelector('.tap-zone'); if (!z) return;
    const p = isBoom() ? (boomUntil - performance.now()) / (BOOM_SEC * 1000) : meter / BOOM_NEED;
    z.style.setProperty('--boom', Math.max(0, p).toFixed(3));
    z.classList.toggle('booming', isBoom());
    let lbl = z.querySelector('.b3lbl');
    if (!lbl) { lbl = document.createElement('div'); lbl.className = 'b3lbl'; z.appendChild(lbl); }
    lbl.textContent = isBoom() ? '💥 БУМ ×5 · ' + Math.ceil((boomUntil - performance.now()) / 1000) + ' с' : meter > 0 ? 'Бум ' + Math.round(meter / BOOM_NEED * 100) + '%' : 'Тапай быстро — включи БУМ';
  }
  setInterval(() => {
    const n = performance.now(), dt = (n - lastT) / 1000; lastT = n;
    if (!isBoom()) { document.body.classList.remove('b3boom'); if (meter > 0) meter = Math.max(0, meter - dt * 2); }
    paintMeter();
  }, 200);

  /* ---------- Мини-игра «Небоскрёб» ---------- */
  const COOL = 120; // секунд между платными заходами
  const origMenu = moreMenu;
  moreMenu = function () {
    const ready = Date.now() / 1000 - (S.b3.tlast || 0) >= COOL;
    return origMenu().replace('<div class="grid">', `<div class="grid"><button class="tile t7" data-act="b3tower"><i>🏢</i>Небоскрёб<small>Рекорд: ${S.b3.tbest} эт.</small>${ready ? '<b class="dot"></b>' : ''}</button>`);
  };
  const ov = document.createElement('div'); ov.id = 'b3tower'; ov.hidden = true;
  ov.innerHTML = `<canvas id="b3tc"></canvas><div class="b3h"><button id="b3tx" aria-label="Закрыть">×</button><div><b id="b3fl">0</b><small>этажей</small></div><div><b id="b3rw">0 ₽</b><small id="b3rl">награда</small></div></div>
    <div class="b3msg" id="b3msg"><h3>🏢 Небоскрёб</h3><p>Тапай, чтобы опустить этаж. Ровная постановка — «Идеально!» и этаж не уменьшается. Чем выше — тем больше денег.</p><button id="b3go">Строить!</button></div>`;
  document.body.appendChild(ov);
  document.addEventListener('click', e => { if (e.target.closest('[data-act="b3tower"]')) openTower(); }, true);
  let G = null, tRafG = 0;
  function rewardNow(fl) { return Math.round(baseReward() * fl * .25); }
  function paid() { return Date.now() / 1000 - (S.b3.tlast || 0) >= COOL; }
  function openTower() { ov.hidden = false; G = null; msg(true); hud(0); Sfx.init(); }
  function msg(show, html) { const m = $('#b3msg'); m.hidden = !show; if (html) m.innerHTML = html; const b = $('#b3go'); if (b) b.onclick = startTower; }
  function hud(fl) { $('#b3fl').textContent = fl; $('#b3rw').textContent = paid() ? money(rewardNow(fl)) : '—'; $('#b3rl').textContent = paid() ? 'награда' : 'тренировка · ' + Math.ceil(COOL - (Date.now() / 1000 - S.b3.tlast)) + ' с'; }
  function startTower() {
    const w = innerWidth;
    G = {blocks: [{x: w / 2 - 80, w: 160}], cur: {x: 0, w: 160, dir: 1}, speed: 2.4, cam: 0, camT: 0, over: false, perfect: 0, fx: [], hue: 0};
    msg(false); hud(0); last = performance.now(); if (!tRafG) tRafG = requestAnimationFrame(loopT);
  }
  let last = 0;
  const BH = 34;
  function drop() {
    if (!G || G.over) return;
    const top = G.blocks[G.blocks.length - 1], c = G.cur;
    const l = Math.max(top.x, c.x), r = Math.min(top.x + top.w, c.x + c.w), ov2 = r - l;
    if (ov2 <= 0) return endTower();
    let nb;
    if (Math.abs(c.x - top.x) < 5) { nb = {x: top.x, w: top.w}; G.perfect++; floatText(innerWidth / 2, innerHeight * .35, G.perfect > 1 ? 'Идеально ×' + G.perfect + '!' : 'Идеально!', true); try { Sfx.crit(); } catch (e) {} if (G.perfect % 3 === 0) nb.w = Math.min(200, nb.w + 12); }
    else { nb = {x: l, w: ov2}; G.perfect = 0; G.fx.push({x: c.x < top.x ? c.x : r, w: c.w - ov2, y: G.blocks.length, vy: 0, life: 1.2}); try { Sfx.tap(); } catch (e) {} }
    G.blocks.push(nb); vibe(10);
    const n = G.blocks.length - 1; G.speed = Math.min(7, 2.4 + n * .17);
    G.cur = {x: n % 2 ? innerWidth - nb.w : 0, w: nb.w, dir: n % 2 ? -1 : 1};
    G.camT = Math.max(0, n - 6) * BH;
    hud(n);
  }
  function endTower() {
    G.over = true; const fl = G.blocks.length - 1; S.b3.tplays++;
    const rec = fl > S.b3.tbest; if (rec) S.b3.tbest = fl;
    let txt = '';
    if (paid() && fl > 0) { const r = rewardNow(fl) * (rec ? 2 : 1); earn(r); S.b3.tlast = Date.now() / 1000; txt = `<p class="b3big">+${money(r)}</p>${rec ? '<p>🏆 Новый рекорд — награда ×2!</p>' : ''}`; if (typeof confetti === 'function') confetti(80); }
    else txt = `<p>Тренировка: награда снова будет через ${Math.ceil(COOL - (Date.now() / 1000 - S.b3.tlast))} с.</p>`;
    save();
    setTimeout(() => msg(true, `<h3>${fl} ${fl % 10 === 1 && fl % 100 !== 11 ? 'этаж' : (fl % 10 >= 2 && fl % 10 <= 4 && (fl % 100 < 10 || fl % 100 >= 20)) ? 'этажа' : 'этажей'}</h3>${txt}<p>Рекорд: ${S.b3.tbest}</p><button id="b3go">Ещё раз</button>`), 700);
  }
  function loopT(now) {
    tRafG = 0; if (ov.hidden) return; tRafG = requestAnimationFrame(loopT);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const cv = $('#b3tc'), d = D(), w = innerWidth, h = innerHeight;
    if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
    if (G && !G.over) { const cu = G.cur; cu.x += cu.dir * G.speed * 60 * dt; if (cu.x < 0) { cu.x = 0; cu.dir = 1; } if (cu.x + cu.w > w) { cu.x = w - cu.w; cu.dir = -1; } }
    if (G) G.cam += (G.camT - G.cam) * Math.min(1, dt * 6);
    const n = G ? G.blocks.length : 0, alt = Math.min(1, n / 40);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, alt > .6 ? '#0a0428' : '#3a1a8a'); g.addColorStop(.6, alt > .6 ? '#3a1a8a' : '#ff8ad8'); g.addColorStop(1, alt > .6 ? '#a8327a' : '#ffc23f');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (alt > .3) { c.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { c.globalAlpha = (alt - .3) * Math.abs(Math.sin(i * 77 + now / 900)); c.fillRect((i * 97) % w, (i * 53) % (h * .6), 2, 2); } c.globalAlpha = 1; }
    const base = h - 120 + (G ? G.cam : 0);
    if (!G) return;
    c.fillStyle = '#2a0b3a'; c.fillRect(0, base, w, h);
    const drawB = (b, i, ghost) => {
      const y = base - i * BH - BH; if (y > h || y < -BH) return;
      const hue = (i * 9) % 360;
      const bg = c.createLinearGradient(b.x, 0, b.x + b.w, 0); bg.addColorStop(0, `hsl(${(hue + 260) % 360} 70% 38%)`); bg.addColorStop(.5, `hsl(${(hue + 280) % 360} 80% 58%)`); bg.addColorStop(1, `hsl(${(hue + 260) % 360} 70% 32%)`);
      c.globalAlpha = ghost ? .95 : 1; c.fillStyle = bg; c.fillRect(b.x, y, b.w, BH - 2);
      c.fillStyle = '#ffe08a'; for (let xx = b.x + 6; xx < b.x + b.w - 8; xx += 12) { c.globalAlpha = .55 + .35 * Math.sin(xx * 3 + i); c.fillRect(xx, y + 8, 6, 12); }
      c.globalAlpha = 1; c.fillStyle = '#ffffff55'; c.fillRect(b.x, y, b.w, 3);
    };
    G.blocks.forEach((b, i) => drawB(b, i));
    if (!G.over) { drawB(G.cur, G.blocks.length, true); c.strokeStyle = '#ffffffaa'; c.setLineDash([4, 6]); c.beginPath(); const t = G.blocks[G.blocks.length - 1]; c.moveTo(t.x, 0); c.lineTo(t.x, h); c.moveTo(t.x + t.w, 0); c.lineTo(t.x + t.w, h); c.globalAlpha = .18; c.stroke(); c.globalAlpha = 1; c.setLineDash([]); }
    G.fx.forEach(f => { f.vy += 900 * dt; f.life -= dt; f.dy = (f.dy || 0) + f.vy * dt; c.globalAlpha = Math.max(0, f.life); c.fillStyle = '#ff8ad8'; c.fillRect(f.x, base - f.y * BH - BH + f.dy, f.w, BH - 2); c.globalAlpha = 1; });
    G.fx = G.fx.filter(f => f.life > 0);
  }
  ov.addEventListener('pointerdown', e => { if (e.target.closest('button,.b3msg')) return; e.preventDefault(); drop(); });
  $('#b3tx').addEventListener('click', () => { ov.hidden = true; if (G && !G.over && G.blocks.length > 1) endTower(); G = null; renderTab(); });

  openTitle();
  return {openTitle, closeTitle, startBoom, isBoom, get meter() { return meter; }, openTower, drop, get game() { return G; }};
})();
