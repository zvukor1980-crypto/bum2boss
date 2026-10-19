// e2e в headless Chrome 390×844: старт, тапы, бизнес, копилка, денежный дождь, задания, старое сохранение, офлайн
const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:5176/';
const OUT = __dirname + '/../shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const errs = [];
  const mk = async () => { const p = await browser.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); return p; };
  // 1. новая игра
  let page = await mk();
  await page.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('clr')) { sessionStorage.setItem('clr', 1); localStorage.clear(); } });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#modalCard .btn'); await page.tap('#modalCard .btn'); await sleep(400);
  const box = await (await page.$('#tapBtn')).boundingBox();
  for (let i = 0; i < 60; i++) { await page.touchscreen.tap(box.x + box.width / 2 + (i % 5) * 6, box.y + box.height / 2); await sleep(30); }
  let st = await page.evaluate(() => ({ cash: __game.S.cash, taps: __game.S.taps, piggy: __game.S.piggy }));
  ok(st.taps === 60 && st.cash > 60, 'тапы приносят деньги: ' + JSON.stringify(st));
  ok(st.piggy > 0, 'копилка наполняется');
  await page.screenshot({ path: '/tmp/b2b-tap.png' });
  await page.tap('[data-tab=biz]'); await sleep(300);
  await page.evaluate(() => { __game.S.cash += 1000; });
  await sleep(300); const bb = await page.$('[data-bb]'); await bb.tap(); await sleep(300);
  ok(await page.evaluate(() => Object.values(__game.S.biz).some(b => b.lvl > 0) && __game.S.stats.bizBought >= 1), 'бизнес куплен');
  await page.close();
  // 2. старое сохранение v1 (без новых полей) на поздней стадии
  page = await mk();
  await page.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('seed')) { sessionStorage.setItem('seed', 1); localStorage.setItem('b2b_save_v1', JSON.stringify({ cash: 4.2e9, totalEarned: 7e9, lifetime: 7e9, taps: 5000, stage: 7, biz: { b1: { lvl: 120, mgr: true, prog: 0, run: false }, b2: { lvl: 60, mgr: true, prog: 0, run: false } }, upg: { t1: 1 }, life: { h0: 1, v0: 1, w0: 1 }, prestige: 2, ach: { tap1: 1 }, daily: { last: '2026-1-1', streak: 3 }, stats: { golden: 4, spins: 2, maxCombo: 30 }, settings: { sound: false, vibe: false }, buyMult: 1, lastSave: Date.now() })); } });
  await page.goto(BASE, { waitUntil: 'networkidle0' }); await sleep(800);
  st = await page.evaluate(() => ({ stage: __game.S.stage, prestige: __game.S.prestige, q: !!__game.S.quests, biz: __game.S.biz.b1.lvl, rain: __game.S.stats.rain }));
  ok(st.stage >= 7 && st.prestige === 2 && st.q && st.biz === 120 && st.rain === 0, 'старое сохранение загружено и дополнено: ' + JSON.stringify(st));
  // копилка: заполним и разобьём
  await page.evaluate(() => { __game.S.piggy = SHINE.piggyCap(); }); await sleep(400);
  const c0 = await page.evaluate(() => __game.S.cash);
  await page.tap('#piggy'); await sleep(600);
  st = await page.evaluate(c0 => ({ gain: __game.S.cash - c0, piggy: __game.S.piggy, modal: !document.querySelector('#modal').classList.contains('hidden') }), c0);
  ok(st.gain > 0 && st.piggy < 1 && st.modal, 'копилка разбита с бонусом x2 ' + JSON.stringify(st)); await page.screenshot({ path: '/tmp/b2b-pig.png' });
  await page.tap('#modalCard .btn'); await sleep(300);
  // денежный дождь
  await page.evaluate(() => SHINE.startRain(6)); await sleep(1800);
  let caught = 0;
  for (let i = 0; i < 40 && caught < 4; i++) {
    const pos = await page.evaluate(() => { const r = SHINE.rain; if (!r) return null; const it = r.items.find(x => !x.dead && x.y > 80 && x.y < innerHeight - 120); return it ? { x: it.x + Math.sin(it.sw) * 18, y: it.y } : null; });
    if (pos) { await page.touchscreen.tap(pos.x, pos.y); caught++; }
    await sleep(120);
  }
  const rs = await page.evaluate(() => __game.S.stats.rain);
  ok(rs >= 2, 'купюры из денежного дождя ловятся: ' + rs);
  await sleep(200); await page.screenshot({ path: OUT + '/bum2boss-work.png' });
  // задания дня
  await page.evaluate(() => { const q = SHINE.quests(); q.forEach(x => { if (x.id === 'taps') __game.S.taps += 400; if (x.id === 'biz') __game.S.stats.bizBought += 30; if (x.id === 'gold') __game.S.stats.golden += 3; if (x.id === 'rain') __game.S.stats.rain += 20; if (x.id === 'spin') __game.S.stats.spins += 6; if (x.id === 'combo') __game.S.stats.dayCombo = 80; if (x.id === 'energy') __game.S.stats.energy += 3; if (x.id === 'upg') ['t2','t3','a1'].forEach(k => __game.S.upg[k] = 1); }); });
  await page.evaluate(() => document.querySelector('[data-act=openQuests]').click()); await sleep(500);
  const n = await page.$$eval('.quest', a => a.length); ok(n === 3, 'три задания дня');
  for (let i = 0; i < 3; i++) { await page.evaluate(() => { const b = document.querySelector('[data-act=quest]'); if (b) b.click(); }); await sleep(300); }
  st = await page.evaluate(() => ({ got: __game.S.quests.got.length, boost: __game.S.boostUntil > Date.now() }));
  ok(st.got === 3 && st.boost, 'награды за задания и энергетик: ' + JSON.stringify(st));
  await page.tap('[data-tab=more]'); await sleep(300); await page.tap('[data-tab=more]'); await sleep(400);
  await page.screenshot({ path: OUT + '/bum2boss-more.png' });
  await page.tap('[data-tab=biz]'); await sleep(500); await page.screenshot({ path: '/tmp/b2b-biz.png' });
  await page.tap('[data-tab=work]'); await sleep(300);
  // офлайн
  await page.evaluate(() => navigator.serviceWorker.ready); await page.reload({ waitUntil: 'networkidle0' });
  ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'страница под service worker');
  await page.setOfflineMode(true); await page.reload({ waitUntil: 'load' }); await sleep(800);
  ok(await page.evaluate(() => typeof SHINE !== 'undefined' && __game.S.stage >= 7), 'офлайн запуск работает, прогресс на месте');
  await page.setOfflineMode(false);
  ok(errs.length === 0, 'нет ошибок JS' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await browser.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
