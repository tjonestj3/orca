/**
 * Radar: a sweeping radar scope with blips.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const RADAR_ORB = String.raw`
const C_RADAR = { idle: '#7f849c', listening: '#89b4fa', heard: '#cba6f7', thinking: '#f9e2af', speaking: '#a6e3a1', error: '#f38ba8' };
const BLIPS = [[0.6, 28], [2.1, 18], [3.4, 36], [4.4, 24], [5.5, 33], [1.3, 38], [2.8, 10], [5.0, 14]];
function drawRadar(c, F, o) {
  const T = F.mix(C_RADAR), amp = F.amp;
  c.translate(50 + F.shake, 50);
  c.fillStyle = '#0c1311'; disc(c, 0, 0, 47);
  c.lineWidth = Math.max(1, o.px); c.strokeStyle = '#45475a'; ring(c, 0, 0, 47);
  c.save();
  c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.clip();
  let g = c.createRadialGradient(0, 0, 0, 0, 0, 44);
  g.addColorStop(0, ca(T, 0.1)); g.addColorStop(1, ca(T, 0.03));
  c.fillStyle = g; c.fillRect(-50, -50, 100, 100);
  c.lineWidth = Math.max(0.6, o.px * 0.6); c.strokeStyle = ca(T, 0.28);
  ring(c, 0, 0, 14.7); ring(c, 0, 0, 29.3); ring(c, 0, 0, 43.5);
  if (!o.tiny) { c.beginPath(); c.moveTo(-44, 0); c.lineTo(44, 0); c.moveTo(0, -44); c.lineTo(0, 44); c.stroke(); }
  const ang = F.acc('radar', F.num({ idle: 0.7, listening: 1.5, heard: 2, thinking: 5.5, speaking: 1.6, error: 0 }));
  const n = o.tiny ? 6 : 14, span = 1.1, trailA = F.num({ idle: 0.7, listening: 1, heard: 1, thinking: 1, speaking: 1, error: 0.5 });
  for (let i = 0; i < n; i++) {
    const a1 = ang - i * span / n, a0 = a1 - span / n;
    c.fillStyle = ca(T, 0.42 * Math.pow(1 - i / n, 2) * trailA);
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 44, a0, a1 + 0.01); c.closePath(); c.fill();
  }
  c.strokeStyle = ca(T, 0.95); c.lineWidth = Math.max(1.2, o.px);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang) * 44, Math.sin(ang) * 44); c.stroke();
  const hw = F.w('heard'), tw = F.w('thinking');
  const bw = hw * (0.35 + amp * 0.9) + tw * 0.9;
  if (bw > 0.02) {
    for (const b of BLIPS) {
      const d = (((ang - b[0]) % TAU) + TAU) % TAU;
      let f = Math.exp(-d * 1.1);
      if (tw > 0.01) f = Math.max(f, tw * 0.5 * (0.5 + 0.5 * Math.sin(F.t * 20 + b[0] * 7)));
      const r = Math.max(1.6 + amp * 3 * hw, o.px * 1.2) * (o.tiny ? 1.5 : 1);
      c.fillStyle = ca(mixArr(T, [255, 255, 255], 0.3), f * bw);
      disc(c, Math.cos(b[0]) * b[1], Math.sin(b[0]) * b[1], r);
    }
  }
  const sw = F.w('speaking');
  if (sw > 0.01) {
    c.lineWidth = Math.max(1.2, o.px);
    for (let i = 0; i < 3; i++) {
      const p = (F.t * 0.8 + i / 3) % 1;
      c.strokeStyle = ca(T, (1 - p) * (0.2 + 0.8 * amp) * sw); ring(c, 0, 0, 6 + p * 38);
    }
  }
  c.restore();
  const lw = F.w('listening');
  if (lw > 0.01) { c.lineWidth = Math.max(1, o.px * 0.8); c.strokeStyle = ca(T, 0.6 * lw); ring(c, 0, 0, 4 + 3 * (0.5 + 0.5 * Math.sin(F.t * 2.4))); }
  const blink = F.cur === 'error' ? (Math.floor(F.t * 3) % 2 ? 1 : 0.15) : 1;
  c.fillStyle = ca(T, blink); disc(c, 0, 0, Math.max(2.2, o.px * 1.2));
}
window.__orbDraw = drawRadar;
`
