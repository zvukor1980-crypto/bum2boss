'use strict';
// ===== Синтезированные звуки (WebAudio, без файлов) =====
const Sfx = {
  ctx: null, on: true, master: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
  },
  tone(f, d = 0.1, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d = 0.1, vol = 0.2, delay = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay, n = Math.floor(this.ctx.sampleRate * d), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2000; s.buffer = buf; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  tap() { this.tone(520 + Math.random() * 120, 0.07, 'triangle', 0.25, 300); },
  crit() { this.tone(880, 0.08, 'square', 0.15, 600); this.tone(1320, 0.15, 'triangle', 0.2, 400, 0.06); },
  coin() { this.tone(988, 0.07, 'square', 0.12); this.tone(1319, 0.18, 'square', 0.12, 0, 0.07); },
  buy() { this.tone(523, 0.08, 'triangle', 0.25); this.tone(659, 0.08, 'triangle', 0.25, 0, 0.07); this.tone(784, 0.16, 'triangle', 0.25, 0, 0.14); },
  error() { this.tone(200, 0.15, 'sawtooth', 0.15, -80); },
  click() { this.tone(700, 0.04, 'sine', 0.15); },
  levelup() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'square', 0.13, 0, i * 0.12));
    [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.18, 0, 0.5 + i * 0.02));
    this.noise(0.4, 0.08, 0.5);
  },
  win() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, 'square', 0.12, 0, i * 0.08)); },
  lose() { [400, 300, 200].forEach((f, i) => this.tone(f, 0.18, 'sawtooth', 0.1, -30, i * 0.14)); },
  tick() { this.tone(1200 + Math.random() * 400, 0.03, 'square', 0.06); },
  whoosh() { this.noise(0.25, 0.12); },
};
