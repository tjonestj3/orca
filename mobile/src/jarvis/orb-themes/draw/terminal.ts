/**
 * Terminal: a green phosphor screen with a shell prompt and scanlines.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const TERMINAL_ORB = String.raw`
const C_TERM = { idle: '#2e8a3c', listening: '#57f26b', heard: '#57f26b', thinking: '#57f26b', speaking: '#57f26b', error: '#ff5c5c' };
const TYPE = "hey xeno, what's on my calendar today? ";
function drawTerm(c, F, o) {
  const P = F.mix(C_TERM), st = F.cur, tiny = o.tiny;
  c.translate(F.shake, 0);
  c.fillStyle = '#0d0d14'; disc(c, 50, 50, 48.5);
  c.lineWidth = Math.max(1, o.px); c.strokeStyle = '#45475a'; ring(c, 50, 50, 48);
  c.save();
  c.beginPath(); c.arc(50, 50, 44, 0, TAU); c.clip();
  c.fillStyle = '#050b06'; c.fillRect(0, 0, 100, 100);
  let g = c.createRadialGradient(50, 50, 4, 50, 50, 46);
  g.addColorStop(0, ca(P, 0.16)); g.addColorStop(1, ca(P, 0.02));
  c.fillStyle = g; c.fillRect(0, 0, 100, 100);

  const fs = tiny ? 38 : 22, cw = fs * 0.6, cells = tiny ? 1 : 3;
  const total = cw * (1.25 + cells + 1), x0 = 50 - total / 2, cy = 51;
  const cx = (i) => x0 + cw * (1.25 + i);
  const blink = (hz) => ((F.t * hz) % 1) < 0.55;
  c.fillStyle = ca(P, 1); c.strokeStyle = ca(P, 1);
  c.shadowColor = ca(P, 0.9); c.shadowBlur = 3.5 * o.dev;
  c.font = '700 ' + fs + 'px "JetBrains Mono", ui-monospace, Menlo, monospace';
  c.textBaseline = 'middle'; c.textAlign = 'left';
  const cursor = (i, a) => { c.globalAlpha = a; c.fillRect(cx(i) + cw * 0.06, cy - fs * 0.42, cw * 0.88, fs * 0.84); c.globalAlpha = 1; };
  const prompt = (a) => { c.globalAlpha = a; c.fillText('$', x0, cy); c.globalAlpha = 1; };
  switch (st) {
    case 'idle': prompt(0.55); if (blink(0.5)) cursor(0, 0.45); break;
    case 'listening': prompt(1); if (blink(1.2)) cursor(0, 1); break;
    case 'heard': {
      prompt(1);
      const n = Math.floor(F.acc('term-type', 3 + F.amp * 16));
      for (let i = 0; i < cells; i++) {
        const idx = ((n - (cells - 1 - i)) % TYPE.length + TYPE.length) % TYPE.length;
        c.fillText(TYPE[idx], cx(i), cy);
      }
      cursor(cells, 0.9);
      break;
    }
    case 'thinking': {
      prompt(1);
      const a = (Math.floor(F.t * 10) % 4) * Math.PI / 4 + Math.PI / 2;
      const sx = cx(0) + cw / 2, hl = fs * 0.38;
      c.lineWidth = fs * 0.13; c.lineCap = 'square';
      c.beginPath(); c.moveTo(sx - Math.cos(a) * hl, cy - Math.sin(a) * hl); c.lineTo(sx + Math.cos(a) * hl, cy + Math.sin(a) * hl); c.stroke();
      if (!tiny) { const nd = Math.floor(F.t * 3) % 4; for (let i = 0; i < nd; i++) c.fillRect(cx(1) + i * cw * 0.6 + cw * 0.2, cy + fs * 0.22, fs * 0.14, fs * 0.14); }
      break;
    }
    case 'speaking': {
      const nb = tiny ? 5 : 9, span = tiny ? 70 : 68, bw = span / nb, bh = tiny ? 8 : 5, maxB = tiny ? 3 : 4;
      const sx = 50 - span / 2;
      for (let i = 0; i < nb; i++) {
        const lvl = Math.round(F.bar(i) * maxB);
        for (let k = -lvl; k <= lvl; k++) {
          c.fillRect(sx + i * bw + bw * 0.14, cy + k * bh - bh * 0.38, bw * 0.72, bh * 0.76);
        }
      }
      break;
    }
    case 'error': prompt(1); c.fillText('!', cx(0), cy); if (blink(3)) cursor(1, 1); break;
  }
  c.shadowBlur = 0;
  const sp = Math.max(2.6, o.px * 2.2);
  c.fillStyle = 'rgba(0,0,0,.32)';
  for (let y = 0; y < 100; y += sp) c.fillRect(0, y, 100, sp * 0.45);
  const by = ((F.t * 18) % 130) - 15;
  g = c.createLinearGradient(0, by - 8, 0, by + 8);
  g.addColorStop(0, ca(P, 0)); g.addColorStop(0.5, ca(P, 0.07)); g.addColorStop(1, ca(P, 0));
  c.fillStyle = g; c.fillRect(0, by - 8, 100, 16);
  g = c.createRadialGradient(50, 50, 26, 50, 50, 45);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = g; c.fillRect(0, 0, 100, 100);
  c.fillStyle = 'rgba(255,255,255,.05)';
  c.beginPath(); c.ellipse(36, 28, 22, 10, -0.5, 0, TAU); c.fill();
  c.restore();
}
window.__orbDraw = drawTerm;
`
