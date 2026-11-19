/**
 * Lava Lamp: soft blobs drifting in a round lamp.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const LAVA_LAMP_ORB = String.raw`
const C_LAVA = { idle: '#9399b2', listening: '#89b4fa', heard: '#cba6f7', thinking: '#fab387', speaking: '#f5c2e7', error: '#f38ba8' };
const LV = 44;
const lavaCv = document.createElement('canvas'); lavaCv.width = lavaCv.height = LV;
const lctx = lavaCv.getContext('2d');
const lImg = lctx.createImageData(LV, LV);
let lavaFrame = -1;
function lavaField(F) {
  if (lavaFrame === F.frame) return;
  lavaFrame = F.frame;
  const T = F.mix(C_LAVA), amp = F.amp;
  const ph = F.acc('lava', F.num({ idle: 0.12, listening: 0.35, heard: 0.5, thinking: 1.5, speaking: 0.55, error: 0.04 }));
  const ew = F.w('error');
  const grow = 1 + F.w('speaking') * amp * 0.28 + F.w('heard') * amp * 0.18;
  const base = [[0, 9.5], [1.7, 8], [3.1, 10.5], [4.4, 7], [5.3, 8.5]];
  const B = base.map(([p, r], i) => {
    const y = 50 + 30 * Math.sin(ph * (0.8 + i * 0.13) + p);
    const x = 50 + 18 * Math.sin(ph * (0.5 + i * 0.07) + p * 2.3);
    return [x, lerp(y, 72 + i * 3, ew), r * grow];
  });
  const d = lImg.data, cell = 100 / LV;
  for (let py = 0; py < LV; py++) for (let px = 0; px < LV; px++) {
    const X = (px + 0.5) * cell, Y = (py + 0.5) * cell;
    let f = 0;
    for (const b of B) { const dx = X - b[0], dy = Y - b[1]; f += (b[2] * b[2]) / (dx * dx + dy * dy + 1); }
    const a = sstep(0.85, 1.15, f), sh = 0.78 + 0.22 * clamp(f - 1);
    const i4 = (py * LV + px) * 4;
    d[i4] = T[0] * sh; d[i4 + 1] = T[1] * sh; d[i4 + 2] = T[2] * sh; d[i4 + 3] = a * 255;
  }
  lctx.putImageData(lImg, 0, 0);
}
function drawLava(c, F, o) {
  lavaField(F);
  const T = F.mix(C_LAVA);
  c.translate(F.shake, 0);
  c.fillStyle = '#11111b'; disc(c, 50, 50, 48);
  c.lineWidth = Math.max(1, o.px); c.strokeStyle = '#45475a'; ring(c, 50, 50, 48);
  c.save();
  c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.clip();
  c.fillStyle = '#181825'; c.fillRect(0, 0, 100, 100);
  let g = c.createLinearGradient(0, 6, 0, 94);
  g.addColorStop(0, ca(T, 0.08)); g.addColorStop(1, ca(T, 0.3));
  c.fillStyle = g; c.fillRect(0, 0, 100, 100);
  c.imageSmoothingEnabled = true;
  c.drawImage(lavaCv, 0, 0, 100, 100);
  g = c.createRadialGradient(50, 104, 2, 50, 104, 40);
  g.addColorStop(0, ca(T, 0.4)); g.addColorStop(1, ca(T, 0));
  c.fillStyle = g; c.fillRect(0, 0, 100, 100);
  c.fillStyle = 'rgba(255,255,255,.08)';
  c.beginPath(); c.ellipse(28, 46, 5, 26, 0.12, 0, TAU); c.fill();
  c.restore();
}
window.__orbDraw = drawLava;
`
