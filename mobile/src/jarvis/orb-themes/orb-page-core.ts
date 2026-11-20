/**
 * The page a themed orb is drawn in (JarvisThemedOrb): a transparent canvas the size of the orb, the shared helpers
 * the themes draw with, and the frame loop. The app tells it the state and voice level through `window.__orb.set`;
 * a theme (draw/*) sets `window.__orbDraw(c, F, o)`, which draws one frame in a 100 x 100 space:
 *
 * - `F`: the frame. `cur`/`prev` and `k` the state and the blend into it, `w(state)` that blend's weight, `t`/`dt`
 *   time, `amp` the smoothed voice level, `mix(colours)`/`num(values)` per-state values blended, `bar(i)` a level
 *   bar, `acc(key, rate)` a running phase, `shake` the error shake, `reduce` slower motion.
 * - `o`: the size. `px` a CSS pixel in drawing units, `dev` device pixels per unit, `tiny` under 40 points.
 *
 * Plain page source, since the app's engine can't turn its own functions back into text.
 */
export const ORB_PAGE_CORE = String.raw`
'use strict';
const TAU = Math.PI * 2;
const STATES = ['idle', 'listening', 'heard', 'thinking', 'speaking', 'error'];

/* ---------- helpers ---------- */
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const _rgb = {};
function rgb(h) {
  if (_rgb[h]) return _rgb[h];
  const n = parseInt(h.slice(1), 16);
  return (_rgb[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
function ca(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + clamp(a).toFixed(3) + ')'; }
function mixArr(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
function disc(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill(); }
function ring(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.stroke(); }

/* Simulated voice envelope: syllables, grain and phrase pauses */
function voice(t, seed) {
  const phrase = 0.5 + 0.5 * sstep(-0.95, -0.6, Math.sin(t * 1.3 + seed));
  const syl = clamp(0.55 + 0.4 * Math.sin(t * 6.2 + seed) + 0.3 * Math.sin(t * 3.7 + seed * 1.7));
  const grain = 0.75 + 0.25 * Math.sin(t * 29 + seed * 3);
  return clamp(syl * grain * phrase * 1.5);
}

/* ---------- shared frame state ---------- */
const accs = {};
const F = {
  t: 0, dt: 0, frame: 0, cur: 'idle', prev: 'idle', k: 1, ts: 99, amp: 0, shake: 0, reduce: false,
  mix(map) { return mixArr(rgb(map[this.prev]), rgb(map[this.cur]), this.k); },
  num(map) { return lerp(map[this.prev], map[this.cur], this.k); },
  w(s) {
    if (this.prev === this.cur) return s === this.cur ? 1 : 0;
    return s === this.cur ? this.k : (s === this.prev ? 1 - this.k : 0);
  },
  bar(i) { return clamp(this.amp * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.t * (7.3 + i * 1.9) + i * 2.4))) * 1.15); },
  acc(key, rate) {
    let a = accs[key];
    if (!a) a = accs[key] = { f: -1, v: 0 };
    if (a.f !== this.frame) { a.f = this.frame; a.v += rate * this.dt; }
    return a.v;
  }
};

/* ---------- the page: one orb filling it, fed by the app ---------- */
const canvas = document.getElementById('orb');
const ctx = canvas.getContext('2d');
let o = null;
function fit() {
  const size = Math.max(1, Math.min(window.innerWidth, window.innerHeight));
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  if (o && o.size === size && o.dpr === dpr) return;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  o = { size: size, dpr: dpr, dev: canvas.width / 100, px: 100 / size, tiny: size < 40, small: size < 100 };
}
// What the app last said: the state, the voice level (0 to 1) and whether to slow down; 'demo' simulates a voice.
const want = { state: 'idle', level: 0, demo: false, reduce: false };
let changedAt = 0, real = 0, last = 0, ampV = 0;
function setState(s) {
  if (STATES.indexOf(s) < 0 || s === F.cur) return;
  F.prev = F.cur;
  F.cur = s;
  changedAt = real;
  F.k = 0; F.ts = 0;
}
window.__orb = {
  set: function (next) {
    if (typeof next.level === 'number') want.level = clamp(next.level);
    if (typeof next.demo === 'boolean') want.demo = next.demo;
    if (typeof next.reduce === 'boolean') { want.reduce = next.reduce; F.reduce = next.reduce; }
    if (typeof next.state === 'string') setState(next.state);
    // Asleep (no call), any change wakes it.
    if (window.__orb.asleep) { window.__orb.asleep = false; requestAnimationFrame(frame); }
  }
};
function step(nowMs) {
  real = nowMs / 1000;
  // Up to a quarter second between frames counts in full, so a resting orb's slow motion keeps its pace.
  const rdt = last ? Math.min(0.25, Math.max(0, (nowMs - last) / 1000)) : 0;
  last = nowMs;
  const speed = F.reduce ? 0.25 : 1;
  F.frame++;
  F.dt = rdt * speed;
  F.t += F.dt;
  const kk = clamp((real - changedAt) / (F.reduce ? 0.8 : 0.45));
  F.k = kk * kk * (3 - 2 * kk);
  if (F.k >= 1) F.prev = F.cur;
  F.ts = real - changedAt;
  const voiced = F.cur === 'speaking' || F.cur === 'heard';
  const target = !voiced ? 0 : want.demo ? voice(F.t * (F.cur === 'heard' ? 1.1 : 1), F.cur === 'heard' ? 2.7 : 0) : want.level;
  const rate = target > ampV ? 25 : 8;
  ampV += (target - ampV) * (1 - Math.exp(-rdt * rate * speed));
  F.amp = clamp(ampV);
  F.shake = (!F.reduce && F.cur === 'error') ? Math.exp(-F.ts * 4) * Math.sin(F.ts * 55) * 3 : 0;
}
// One frame at a time (the tests draw them on demand); a drawing that throws is noted, and the next frame tries again.
function paint(nowMs) {
  fit();
  step(nowMs);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(o.dev, 0, 0, o.dev, 0, 0);
  ctx.save();
  try { if (window.__orbDraw) window.__orbDraw(ctx, F, o); } catch (e) { window.__orb.failed = String(e); }
  ctx.restore();
}
window.__orb.paint = paint;
// How often a frame is drawn. A frame every screen refresh (up to 120 a second) on every orb all call long warmed
// the phone, so 30 a second while the orb moves with a voice or changes state, and 8 while it rests (idle,
// listening, an error once its shake has settled), enough for its slow turning and breathing. Each frame is asked
// for only when it's due, not every refresh.
const ACTIVE_FPS = 30, RESTING_FPS = 8;
function resting() {
  if (F.k < 1) return false;
  return F.cur === 'idle' || F.cur === 'listening' || (F.cur === 'error' && F.ts > 1.5);
}
// With no call (idle, settled) it holds still: one frame drawn, none more until the app says something changed.
// A still orb reads as off, and nothing is drawn while you just use the app.
function asleep() {
  return F.cur === 'idle' && F.k >= 1 && !want.demo;
}
function frame(nowMs) {
  paint(nowMs);
  if (asleep()) { window.__orb.asleep = true; return; }
  const due = 1000 / (resting() ? RESTING_FPS : ACTIVE_FPS);
  setTimeout(function () { requestAnimationFrame(frame); }, Math.max(0, due - (performance.now() - nowMs) - 4));
}

// Starts drawing once the theme has set window.__orbDraw; the app's first 'set' may come before or after.
function start() { requestAnimationFrame(frame); }
`
