/**
 * Planet: a small planet with a moon on a tilted orbit.
 * Plain page source (the app's engine can't turn its functions back into text), drawn by the orb page's frame loop
 * in a 100 x 100 space: see orb-page-core for what `F` and `o` carry. Ported from the approved mockup.
 */
export const PLANET_ORB = String.raw`
const C_PLANET = { idle: '#9399b2', listening: '#89b4fa', heard: '#cba6f7', thinking: '#fab387', speaking: '#94e2d5', error: '#f38ba8' };
function drawPlanet(c, F, o) {
  const T = F.mix(C_PLANET), amp = F.amp;
  const a = F.acc('moon', F.num({ idle: 0.4, listening: 0.9, heard: 1.1, thinking: 4.2, speaking: 1, error: 0 }));
  const sc = 1 + F.w('listening') * 0.03 * Math.sin(F.t * 2.2) + F.w('speaking') * amp * 0.08;
  const R = 22 * sc, tilt = -0.32, rx = 41, ry = 12;
  const vo = F.w('heard') + F.w('speaking');
  c.translate(50 + F.shake, 50);
  const atm = 0.25 + F.w('listening') * 0.12 * (1 + Math.sin(F.t * 2.2)) + vo * amp * 0.55;
  let g = c.createRadialGradient(0, 0, R * 0.9, 0, 0, R + 10 + vo * amp * 8);
  g.addColorStop(0, ca(T, atm)); g.addColorStop(1, ca(T, 0));
  c.fillStyle = g; disc(c, 0, 0, R + 10 + vo * amp * 8);
  const mr = o.tiny ? 7 : 5.2;
  const tw = F.w('thinking');
  const moonAt = (ang) => [Math.cos(ang) * rx, Math.sin(ang) * ry];
  const drawMoonLayer = (front) => {
    if (tw > 0.01) {
      for (let i = 1; i <= 8; i++) {
        const aa = a - i * 0.13;
        if ((Math.sin(aa) > 0) !== front) continue;
        const [x, y] = moonAt(aa);
        c.fillStyle = ca(T, tw * (1 - i / 9) * 0.6); disc(c, x, y, mr * (1 - i / 12));
      }
    }
    if ((Math.sin(a) > 0) === front) {
      const [x, y] = moonAt(a), r = mr * (front ? 1.06 : 0.9);
      const mg = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
      mg.addColorStop(0, '#f5f5ff'); mg.addColorStop(1, '#7f849c');
      c.fillStyle = mg; disc(c, x, y, r);
    }
  };
  const lw = Math.max(0.8, o.px * 0.8);
  c.save(); c.rotate(tilt);
  c.lineWidth = lw; c.strokeStyle = ca(T, 0.35);
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, Math.PI, TAU); c.stroke();
  drawMoonLayer(false);
  c.restore();
  const light = mixArr(T, [255, 255, 255], 0.4), dark = mixArr(T, [17, 17, 27], 0.82);
  g = c.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R);
  g.addColorStop(0, ca(light, 1)); g.addColorStop(0.55, ca(T, 1)); g.addColorStop(1, ca(dark, 1));
  c.fillStyle = g; disc(c, 0, 0, R);
  c.save();
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
  c.rotate(tilt);
  c.fillStyle = 'rgba(17,17,27,.18)';
  c.beginPath(); c.ellipse(0, -R * 0.35, R * 1.2, R * 0.12, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(0, R * 0.2, R * 1.2, R * 0.18, 0, 0, TAU); c.fill();
  c.restore();
  c.save(); c.rotate(tilt);
  c.lineWidth = lw; c.strokeStyle = ca(T, 0.6);
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI); c.stroke();
  drawMoonLayer(true);
  c.restore();
}
window.__orbDraw = drawPlanet;
`
