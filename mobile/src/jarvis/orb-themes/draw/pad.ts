/**
 * 8-bit Pad: a round game pad with a d-pad, two red buttons and a status light.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const PAD_ORB = String.raw`
const C_PAD = { idle: '#585b70', listening: '#89b4fa', heard: '#cba6f7', thinking: '#fab387', speaking: '#a6e3a1', error: '#f38ba8' };
function drawPad(c, F, o) {
  const T = F.mix(C_PAD), amp = F.amp, st = F.cur;
  c.translate(50 + F.shake, 50);
  let g = c.createLinearGradient(0, -47, 0, 47);
  g.addColorStop(0, '#d6d6d6'); g.addColorStop(1, '#9c9c9c');
  c.fillStyle = g; disc(c, 0, 0, 47);
  c.lineWidth = Math.max(1, o.px); c.strokeStyle = '#5c5c5c'; ring(c, 0, 0, 46.5);
  c.save();
  c.beginPath(); c.arc(0, 0, 46, 0, TAU); c.clip();
  c.fillStyle = '#1f1f1f'; c.fillRect(-50, -14, 100, 38);
  c.fillStyle = '#3d3d3d'; c.fillRect(-50, -14, 100, Math.max(1, o.px));
  if (!o.tiny) { c.fillStyle = '#8a8a8a'; c.fillRect(-50, 28, 100, 2); c.fillRect(-50, 32.5, 100, 2); }
  c.restore();
  // status LED
  let led = F.num({ idle: 0.3, listening: 0.75, heard: 1, thinking: 1, speaking: 1, error: 1 });
  if (st === 'listening') led *= 0.7 + 0.3 * Math.sin(F.t * 2.5);
  if (st === 'error') led *= (Math.floor(F.t * 4) % 2) ? 1 : 0.2;
  const ly = -28, lr = o.tiny ? 8 : 5.5;
  g = c.createRadialGradient(0, ly, 0, 0, ly, lr * 3);
  g.addColorStop(0, ca(T, 0.6 * led)); g.addColorStop(1, ca(T, 0));
  c.fillStyle = g; disc(c, 0, ly, lr * 3);
  c.fillStyle = '#3a3a3a'; disc(c, 0, ly, lr + Math.max(0.8, o.px * 0.6));
  c.fillStyle = ca(mixArr([60, 60, 70], T, 0.25 + 0.75 * led), 1); disc(c, 0, ly, lr);
  c.fillStyle = 'rgba(255,255,255,' + (0.35 * led).toFixed(3) + ')'; disc(c, -lr * 0.3, ly - lr * 0.3, lr * 0.35);
  // d-pad
  const dx = -23, dy = 5, L = 13, W = 4.8;
  c.fillStyle = '#0d0d0d';
  c.fillRect(dx - W, dy - L, 2 * W, 2 * L); c.fillRect(dx - L, dy - W, 2 * L, 2 * W);
  const arms = [0, 0, 0, 0];
  const tw = F.w('thinking'), hw = F.w('heard');
  if (tw > 0.01) { const i = Math.floor(F.acc('pad', 7)) % 4; arms[i] = tw; arms[(i + 3) % 4] = Math.max(arms[(i + 3) % 4], 0.35 * tw); }
  if (hw > 0.01) for (let i = 0; i < 4; i++) arms[i] = Math.max(arms[i], clamp(F.bar(i) * 1.4) * hw);
  const armRect = [[dx - W, dy - L, 2 * W, L - W], [dx + W, dy - W, L - W, 2 * W], [dx - W, dy + W, 2 * W, L - W], [dx - L, dy - W, L - W, 2 * W]];
  for (let i = 0; i < 4; i++) if (arms[i] > 0.02) { c.fillStyle = ca(T, arms[i]); const r = armRect[i]; c.fillRect(r[0] + 0.8, r[1] + 0.8, r[2] - 1.6, r[3] - 1.6); }
  const lsw = F.w('listening');
  c.fillStyle = lsw > 0.01 ? ca(T, lsw * (0.55 + 0.4 * Math.sin(F.t * 2.5))) : '#262626';
  disc(c, dx, dy, 2.6);
  // A / B buttons
  const sw = F.w('speaking');
  const pressA = sw > 0.5 && F.bar(0) > 0.5, pressB = sw > 0.5 && F.bar(3) > 0.5;
  const errDim = F.w('error');
  const btn = (x, y, pressed) => {
    const r = 7.2;
    c.fillStyle = '#c9c9c9'; disc(c, x, y, r + 2);
    const base = pressed ? [150, 30, 38] : [220, 53, 64];
    const col = mixArr(base, [90, 40, 44], errDim * ((Math.floor(F.t * 4) % 2) ? 0.9 : 0.4));
    const rr = pressed ? r * 0.9 : r, oy = pressed ? 0.9 : 0;
    c.fillStyle = ca(col, 1); disc(c, x, y + oy, rr);
    if (!pressed) { c.fillStyle = 'rgba(255,255,255,.3)'; disc(c, x - rr * 0.3, y - rr * 0.35, rr * 0.35); }
  };
  btn(13, 10, pressB);
  btn(31, 2, pressA);
  void amp;
}
window.__orbDraw = drawPad;
`
