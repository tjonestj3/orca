/**
 * Oscilloscope: a scope trace on a round graticule screen.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const OSCILLOSCOPE_ORB = String.raw`
const C_SCOPE = { idle: '#6c7086', listening: '#89b4fa', heard: '#cba6f7', thinking: '#f9e2af', speaking: '#94e2d5', error: '#f38ba8' };
function scopeTrace(c, s, F, o, alpha) {
  if (alpha < 0.01) return;
  const t = F.t, amp = F.amp, col = rgb(C_SCOPE[s]);
  c.beginPath();
  if (s === 'thinking') {
    const n = o.tiny ? 60 : 140, ph = F.acc('scope-liss', 1.7);
    for (let i = 0; i <= n; i++) {
      const a = i / n * TAU;
      const x = 50 + 30 * Math.sin(3 * a + ph), y = 50 + 22 * Math.sin(2 * a);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
  } else {
    const step = o.tiny ? 2.5 : 1.2;
    let first = true;
    for (let x = 8; x <= 92; x += step) {
      const u = (x - 50) / 42, win = 1 - u * u;
      let y = 0;
      if (s === 'idle') y = Math.sin(u * 30 + t * 4) * 0.5;
      else if (s === 'listening') y = 7 * Math.sin(u * 5 + t * 2.2) * (0.55 + 0.45 * Math.sin(t * 1.6)) * win;
      else if (s === 'heard') y = amp * 20 * (Math.sin(u * 13 + t * 10) * 0.6 + Math.sin(u * 29 - t * 15) * 0.4) * win;
      else if (s === 'speaking') y = amp * 24 * (Math.sin(u * 8 + t * 11) * 0.5 + Math.sin(u * 19 - t * 6) * 0.3 + Math.sin(u * 3 + t * 4) * 0.2) * win;
      else if (s === 'error') y = (Math.sin(u * 7 - t * 5) > 0 ? -10 : 10) * win;
      first ? c.moveTo(x, 50 - y) : c.lineTo(x, 50 - y);
      first = false;
    }
  }
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.lineWidth = Math.max(4, o.px * 3); c.strokeStyle = ca(col, 0.22 * alpha); c.stroke();
  c.lineWidth = Math.max(1.4, o.px * 1.1); c.strokeStyle = ca(mixArr(col, [255, 255, 255], 0.25), alpha); c.stroke();
}
function drawScope(c, F, o) {
  c.translate(F.shake, 0);
  c.fillStyle = '#181825'; disc(c, 50, 50, 48.5);
  c.lineWidth = Math.max(1, o.px); c.strokeStyle = '#45475a'; ring(c, 50, 50, 48);
  c.save();
  c.beginPath(); c.arc(50, 50, 43, 0, TAU); c.clip();
  c.fillStyle = '#0a0f14'; c.fillRect(0, 0, 100, 100);
  if (!o.tiny) {
    c.strokeStyle = 'rgba(205,214,244,.07)'; c.lineWidth = Math.max(0.5, o.px * 0.6);
    for (let i = 1; i < 7; i++) { const v = 7 + i * 86 / 7; c.beginPath(); c.moveTo(v, 0); c.lineTo(v, 100); c.moveTo(0, v); c.lineTo(100, v); c.stroke(); }
    c.strokeStyle = 'rgba(205,214,244,.14)';
    c.beginPath(); c.moveTo(50, 0); c.lineTo(50, 100); c.moveTo(0, 50); c.lineTo(100, 50); c.stroke();
  }
  if (F.prev === F.cur) scopeTrace(c, F.cur, F, o, 1);
  else { scopeTrace(c, F.prev, F, o, 1 - F.k); scopeTrace(c, F.cur, F, o, F.k); }
  const g = c.createRadialGradient(50, 50, 28, 50, 50, 44);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
  c.fillStyle = g; c.fillRect(0, 0, 100, 100);
  c.restore();
}
window.__orbDraw = drawScope;
`
