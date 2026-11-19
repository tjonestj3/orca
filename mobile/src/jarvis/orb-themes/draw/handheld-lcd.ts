/**
 * Handheld LCD: a four-shade olive dot-matrix screen with a chunky pixel orb.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const HANDHELD_LCD_ORB = String.raw`
const LCD = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];
const LN = 16, lcdBuf = new Uint8Array(LN * LN);
let lcdFrame = -1;
function lcdScene(F) {
  if (lcdFrame === F.frame) return lcdBuf;
  lcdFrame = F.frame;
  const st = F.cur, t = F.t, amp = F.amp;
  let R = 4.6;
  const breathOn = Math.sin(t * 2.6) > 0;
  if (st === 'listening' && breathOn) R += 0.8;
  if (st === 'speaking') R += amp * 2.2;
  if (st === 'heard') R += amp * 0.6;
  const inv = st === 'error' && !F.reduce && Math.floor(F.ts * 2) % 2 === 0;
  const step = Math.floor(F.acc('lcd-think', 8));
  for (let y = 0; y < LN; y++) for (let x = 0; x < LN; x++) {
    const dx = x + 0.5 - 8, dy = y + 0.5 - 8, d = Math.hypot(dx, dy);
    let s = 0;
    if (d > 7.95) { lcdBuf[y * LN + x] = 255; continue; }
    if (d < R) {
      const hd = Math.hypot(dx + 1.7, dy + 1.7);
      s = d > R - 1.05 ? 3 : hd < 1.3 ? 1 : 2;
      if (st === 'error' && Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.8 && d < R - 1.2) s = 0;
    } else {
      if (st === 'listening' && breathOn && Math.abs(d - 6.9) < 0.5) s = 1;
      if (st === 'heard') { if (amp > 0.25 && Math.abs(d - 6.1) < 0.5) s = 2; if (amp > 0.6 && Math.abs(d - 7.3) < 0.45) s = 1; }
      if (st === 'speaking' && amp > 0.3 && Math.abs(d - (R + 1.5)) < 0.5) s = 1;
      if (st === 'thinking') {
        for (let k = 0; k < 3; k++) {
          const ang = (step - k) * TAU / 8 - Math.PI / 2;
          if (Math.hypot(dx - Math.cos(ang) * 6.3, dy - Math.sin(ang) * 6.3) < 1.05) s = Math.max(s, 3 - k);
        }
      }
    }
    if (inv) s = 3 - s;
    lcdBuf[y * LN + x] = s;
  }
  return lcdBuf;
}
function drawLCD(c, F, o) {
  const buf = lcdScene(F);
  c.translate(F.shake, 0);
  c.fillStyle = '#2b2d3a'; disc(c, 50, 50, 49);
  c.lineWidth = Math.max(1, o.px); c.strokeStyle = '#585b70'; ring(c, 50, 50, 48.5);
  c.save();
  c.beginPath(); c.arc(50, 50, 45, 0, TAU); c.clip();
  c.fillStyle = LCD[0]; c.fillRect(0, 0, 100, 100);
  const cell = 90 / LN, ox = 5, gap = o.tiny ? 0 : Math.max(0.45, o.px * 0.5);
  for (let y = 0; y < LN; y++) for (let x = 0; x < LN; x++) {
    const s = buf[y * LN + x];
    if (s === 255) continue;
    if (s === 0) {
      if (!o.tiny) { c.fillStyle = 'rgba(139,172,15,.6)'; c.fillRect(ox + x * cell + gap / 2, ox + y * cell + gap / 2, cell - gap, cell - gap); }
      continue;
    }
    c.fillStyle = LCD[s];
    c.fillRect(ox + x * cell + gap / 2, ox + y * cell + gap / 2, cell - gap + (o.tiny ? 0.2 : 0), cell - gap + (o.tiny ? 0.2 : 0));
  }
  const g = c.createRadialGradient(50, 50, 30, 50, 50, 46);
  g.addColorStop(0, 'rgba(15,56,15,0)'); g.addColorStop(1, 'rgba(15,56,15,.35)');
  c.fillStyle = g; c.fillRect(0, 0, 100, 100);
  c.fillStyle = 'rgba(255,255,255,.08)';
  c.beginPath(); c.ellipse(34, 26, 20, 8, -0.5, 0, TAU); c.fill();
  c.restore();
}
window.__orbDraw = drawLCD;
`
