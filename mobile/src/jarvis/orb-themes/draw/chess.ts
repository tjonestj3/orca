/**
 * Chess: a knight on a small round wooden board.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const CHESS_ORB = String.raw`
const C_CHESS = { idle: '#6c7086', listening: '#89b4fa', heard: '#cba6f7', thinking: '#fab387', speaking: '#cdd6f4', error: '#f38ba8' };
const KN_MOVES = [[1, -2], [2, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2]];
const KNIGHT = '♞︎';
function arrow(c, pts, w, col) {
  const n = pts.length, [x1, y1] = pts[n - 2], [x2, y2] = pts[n - 1];
  const a = Math.atan2(y2 - y1, x2 - x1), hl = w * 2.3;
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n - 1; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.lineTo(x2 - Math.cos(a) * hl * 0.9, y2 - Math.sin(a) * hl * 0.9); c.stroke();
  c.beginPath(); c.moveTo(x2, y2);
  c.lineTo(x2 - Math.cos(a - 0.5) * hl, y2 - Math.sin(a - 0.5) * hl);
  c.lineTo(x2 - Math.cos(a + 0.5) * hl, y2 - Math.sin(a + 0.5) * hl);
  c.closePath(); c.fill();
}
function drawChess(c, F, o) {
  const T = F.mix(C_CHESS), amp = F.amp, sq = 84 / 5, R = 42;
  c.translate(50 + F.shake, 50);
  const glow = 0.14 + F.w('listening') * (0.25 + 0.2 * Math.sin(F.t * 2.4)) + F.w('heard') * amp * 0.4;
  let g = c.createRadialGradient(0, 0, 36, 0, 0, 50);
  g.addColorStop(0, ca(T, glow)); g.addColorStop(1, ca(T, 0));
  c.fillStyle = g; disc(c, 0, 0, 50);
  const rimW = Math.max(4, o.px * 2.2), rr = R + rimW / 2;
  c.lineWidth = rimW; c.strokeStyle = ca(T, 1); ring(c, 0, 0, rr);
  const sw = F.w('speaking');
  if (sw > 0.01) {
    c.globalAlpha = sw;
    c.strokeStyle = '#181825'; ring(c, 0, 0, rr);
    const f = clamp(0.5 + (amp - 0.35) * 0.95, 0.07, 0.96);
    c.strokeStyle = '#eff1f5';
    c.beginPath(); c.arc(0, 0, rr, Math.PI / 2 - f * Math.PI, Math.PI / 2 + f * Math.PI); c.stroke();
    c.globalAlpha = 1;
  }
  c.save();
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    c.fillStyle = (i + j) % 2 ? '#8b6a4a' : '#d4bc94';
    c.fillRect(-R + i * sq, -R + j * sq, sq + 0.3, sq + 0.3);
  }
  const dim = F.num({ idle: 0.5, listening: 0.06, heard: 0.22, thinking: 0.28, speaking: 0.12, error: 0.3 });
  c.fillStyle = 'rgba(17,17,27,' + dim.toFixed(3) + ')'; c.fillRect(-R, -R, 2 * R, 2 * R);
  const lw = F.w('listening');
  if (lw > 0.01) {
    g = c.createRadialGradient(0, 0, 10, 0, 0, R);
    g.addColorStop(0, ca(T, 0)); g.addColorStop(1, ca(T, lw * (0.3 + 0.15 * Math.sin(F.t * 2.4))));
    c.fillStyle = g; c.fillRect(-R, -R, 2 * R, 2 * R);
  }
  const ew = F.w('error');
  if (ew > 0.01) { c.fillStyle = ca(rgb('#f38ba8'), 0.35 * ew); c.fillRect(-R, -R, 2 * R, 2 * R); }
  const hw = F.w('heard');
  if (hw > 0.01) {
    const M = rgb('#cba6f7');
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      if (i === 2 && j === 2) continue;
      const v = amp * (0.5 + 0.5 * Math.sin(F.t * 8 + i * 1.9 + j * 2.7 + ((i * j) % 3)));
      if (v > 0.22) { c.fillStyle = ca(M, v * 0.8 * hw); c.fillRect(-R + i * sq, -R + j * sq, sq + 0.3, sq + 0.3); }
    }
  }
  c.restore();
  c.save();
  c.translate(0, 16); c.rotate(-ew * 1.3); c.translate(ew * 6, -16 + ew * 4);
  const ks = 1 + sw * amp * 0.1; c.scale(ks, ks);
  c.font = (o.tiny ? 62 : 54) + 'px "Apple Symbols","Segoe UI Symbol","Noto Sans Symbols 2","DejaVu Sans",serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = Math.max(3, o.px * 1.8); c.strokeStyle = '#f5e0dc';
  c.strokeText(KNIGHT, 0, 3); c.fillStyle = '#11111b'; c.fillText(KNIGHT, 0, 3);
  c.restore();
  const tw = F.w('thinking');
  if (tw > 0.01) {
    const e = F.acc('chess', 3.2), idx = Math.floor(e);
    c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    for (let back = 2; back >= 0; back--) {
      const m = KN_MOVES[((idx - back) % 8 + 8) % 8];
      const a = (back === 0 ? 0.95 : back === 1 ? 0.45 : 0.2) * tw;
      if (back === 0) { c.fillStyle = ca(rgb('#f9e2af'), 0.5 * tw); c.fillRect(-sq / 2 + m[0] * sq, -sq / 2 + m[1] * sq, sq, sq); }
      const pts = Math.abs(m[0]) === 2
        ? [[0, 0], [m[0] * sq, 0], [m[0] * sq, m[1] * sq]]
        : [[0, 0], [0, m[1] * sq], [m[0] * sq, m[1] * sq]];
      arrow(c, pts, Math.max(4.6, o.px * 1.4), ca(rgb('#fab387'), a));
    }
    c.restore();
  }
}
window.__orbDraw = drawChess;
`
