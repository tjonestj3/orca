/**
 * Vinyl: a record on a turntable; the label carries the state colour.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const VINYL_ORB = String.raw`
const C_VINYL = { idle: '#7f849c', listening: '#89b4fa', heard: '#cba6f7', thinking: '#fab387', speaking: '#a6e3a1', error: '#f38ba8' };
function drawVinyl(c, F, o) {
  const T = F.mix(C_VINYL), amp = F.amp;
  const rot = F.acc('vinyl', F.num({ idle: 0.25, listening: 3.5, heard: 3.5, thinking: 9, speaking: 4.7, error: 0 }));
  c.translate(50 + F.shake, 50);
  let g = c.createRadialGradient(0, 0, 10, 0, 0, 46);
  g.addColorStop(0, '#26262f'); g.addColorStop(1, '#0c0c10');
  c.fillStyle = g; disc(c, 0, 0, 46);
  c.lineWidth = Math.max(0.5, o.px * 0.55);
  if (!o.tiny) {
    for (let r = 19; r < 45; r += 1.7) { c.strokeStyle = 'rgba(255,255,255,' + (0.035 + ((r * 7 | 0) % 3) * 0.012).toFixed(3) + ')'; ring(c, 0, 0, r); }
  } else {
    c.strokeStyle = 'rgba(255,255,255,.12)'; ring(c, 0, 0, 27); ring(c, 0, 0, 36);
  }
  const hw = F.w('heard'), sw = F.w('speaking');
  if (hw > 0.01) {
    c.lineWidth = Math.max(1.4, o.px * 1.1);
    for (let i = 0; i < 6; i++) { c.strokeStyle = ca(T, F.bar(i) * hw * 0.9); ring(c, 0, 0, 21 + i * 4.4); }
  }
  if (sw > 0.01) {
    c.lineWidth = Math.max(1.6, o.px * 1.2);
    for (let i = 0; i < 3; i++) { const p = (F.t * 0.6 + i / 3) % 1; c.strokeStyle = ca(T, (1 - p) * (0.15 + 0.75 * amp) * sw); ring(c, 0, 0, 19 + p * 26); }
  }
  c.fillStyle = 'rgba(255,255,255,.06)';
  for (const s of [-0.95, -0.95 + Math.PI]) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 46, s, s + 0.45); c.closePath(); c.fill(); }
  c.fillStyle = ca(T, 1); disc(c, 0, 0, 17);
  c.save(); c.rotate(rot);
  c.strokeStyle = 'rgba(17,17,27,.28)'; c.lineWidth = Math.max(0.6, o.px * 0.6); ring(c, 0, 0, 13.5);
  c.strokeStyle = 'rgba(17,17,27,.6)'; c.lineWidth = Math.max(2.4, o.px * 1.4); c.lineCap = 'butt';
  c.beginPath(); c.moveTo(5, 0); c.lineTo(15, 0); c.stroke();
  if (!o.tiny) { c.fillStyle = 'rgba(17,17,27,.35)'; c.fillRect(-12, -5, 7, 1.6); c.fillRect(-12, -1.5, 5, 1.6); c.fillRect(-12, 2, 6, 1.6); }
  c.restore();
  c.fillStyle = '#11111b'; disc(c, 0, 0, Math.max(2.2, o.px * 0.9));
  const ew = F.w('error');
  if (ew > 0.01) {
    c.strokeStyle = ca(rgb('#f5e0dc'), 0.85 * ew); c.lineWidth = Math.max(1.2, o.px * 0.9); c.lineJoin = 'miter';
    c.beginPath(); c.moveTo(-36, -18); c.lineTo(-29, -24); c.lineTo(-25, -15); c.lineTo(-18, -27); c.lineTo(-14, -19); c.lineTo(-8, -30); c.stroke();
  }
  if (!o.tiny) {
    const on = F.num({ idle: 0, listening: 1, heard: 1, thinking: 0.45, speaking: 1, error: 0 });
    const px = 40, py = -40;
    const nx = lerp(47, 25, on), ny = lerp(6, 18, on);
    c.strokeStyle = '#bac2de'; c.lineWidth = Math.max(2, o.px * 1.4); c.lineCap = 'round';
    c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
    const a = Math.atan2(ny - py, nx - px);
    c.save(); c.translate(nx, ny); c.rotate(a);
    c.fillStyle = '#bac2de'; c.fillRect(-2, -3, 7, 6);
    c.restore();
    c.fillStyle = '#585b70'; disc(c, px, py, 5);
    c.fillStyle = '#9399b2'; disc(c, px, py, 2.4);
  }
}
window.__orbDraw = drawVinyl;
`
