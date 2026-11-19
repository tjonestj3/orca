/**
 * Nixie: one glowing nixie digit; the neon dot shows the state colour.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const NIXIE_ORB = String.raw`
const C_NIXIE = { idle: '#6c7086', listening: '#89b4fa', heard: '#cba6f7', thinking: '#f9e2af', speaking: '#a6e3a1', error: '#f38ba8' };
function drawNixie(c, F, o) {
  const st = F.cur, amp = F.amp, t = F.t;
  c.translate(50 + F.shake, 50);
  let g = c.createRadialGradient(-10, -14, 4, 0, 0, 46);
  g.addColorStop(0, '#2a211a'); g.addColorStop(1, '#0d0a08');
  c.fillStyle = g; disc(c, 0, 0, 46.5);
  c.lineWidth = Math.max(1, o.px); c.strokeStyle = '#585b70'; ring(c, 0, 0, 46.5);
  c.save();
  c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.clip();
  let ch = '0', I = 0;
  switch (st) {
    case 'idle': ch = '0'; I = 0; break;
    case 'listening': ch = '0'; I = 0.5 + 0.35 * Math.sin(t * 2.4); break;
    case 'heard': ch = String(Math.min(9, Math.floor(amp * 10))); I = 0.9; break;
    case 'thinking': ch = String(Math.floor(F.acc('nixie', 14)) % 10); I = 0.85; break;
    case 'speaking': ch = String(Math.min(9, Math.floor(amp * 10))); I = 0.75 + 0.25 * amp; break;
    case 'error': ch = 'E'; I = (Math.sin(t * 37) + Math.sin(t * 23)) > -0.4 ? 1 : 0.15; break;
  }
  const fs = o.tiny ? 76 : 66;
  c.font = '300 ' + fs + 'px "Space Grotesk", "Helvetica Neue", Arial, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = Math.max(0.6, o.px * 0.6);
  c.strokeStyle = 'rgba(166,173,200,.14)';
  if (!o.tiny) { c.strokeText('8', 0, 3); c.strokeText('3', 0, 3); }
  c.strokeText(ch === 'E' ? 'E' : '0', 0, 3);
  if (I > 0) {
    const col = rgb(st === 'error' ? '#ff6b57' : '#ff9b45');
    const halo = 0.3 * I + F.w('speaking') * amp * 0.35;
    g = c.createRadialGradient(0, 0, 0, 0, 0, 38);
    g.addColorStop(0, ca(col, halo)); g.addColorStop(1, ca(col, 0));
    c.fillStyle = g; disc(c, 0, 0, 40);
    c.shadowColor = ca(col, 1); c.shadowBlur = 8 * o.dev * I;
    c.fillStyle = ca(mixArr(col, [255, 220, 180], 0.45), I); c.fillText(ch, 0, 3);
    c.shadowBlur = 2 * o.dev;
    c.fillStyle = ca([255, 241, 220], I * 0.7); c.fillText(ch, 0, 3);
    c.shadowBlur = 0;
  }
  if (!o.tiny) {
    c.strokeStyle = 'rgba(20,14,10,.55)'; c.lineWidth = Math.max(0.4, o.px * 0.4);
    c.beginPath();
    for (let v = -60; v <= 60; v += 6) { c.moveTo(v - 40, -40); c.lineTo(v + 40, 40); c.moveTo(v + 40, -40); c.lineTo(v - 40, 40); }
    c.stroke();
  }
  c.restore();
  const T = F.mix(C_NIXIE);
  const ir = o.tiny ? 6 : Math.max(3.4, o.px * 1.6), ix = o.tiny ? 26 : 27, iy = o.tiny ? 26 : 29;
  g = c.createRadialGradient(ix, iy, 0, ix, iy, ir * 2.6);
  g.addColorStop(0, ca(T, 0.6)); g.addColorStop(1, ca(T, 0));
  c.fillStyle = g; disc(c, ix, iy, ir * 2.6);
  c.fillStyle = ca(T, 1); disc(c, ix, iy, ir);
  c.fillStyle = 'rgba(255,255,255,.07)';
  c.beginPath(); c.ellipse(-22, -12, 7, 20, 0.3, 0, TAU); c.fill();
}
window.__orbDraw = drawNixie;
`
