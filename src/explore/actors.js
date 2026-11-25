// Fliers that come round again, and the seats they offer.
import { v3, clamp, lerp, TAU, PI } from '../core/math.js';
import { bakePath } from '../life/dragons.js';
export function makeRides(W, E) {
  const L = W.life; const H = [0, 1, 0];
  // the five apsaras of the film keep to a wide ring over the long bridge
  const A0 = [-60, 300, 2500], h = v3.norm([1, 0, -.5]), n = [-h[2], 0, h[0]], R = 700, C = v3.mad(A0, n, R); const ring = (d) => { const a = d / R; return [C[0] + R * (h[0] * Math.sin(a) - n[0] * Math.cos(a)), 300 + 10 * Math.sin(2 * a + .4), C[2] + R * (h[2] * Math.sin(a) - n[2] * Math.cos(a))]; };
  const five = L.aps.slice(-5); for (const q of five) q.path = ring;
  // the dragons' loops are laid twice over, so that head and tail may cross the seam
  const loop2 = (R, y0, y1, n, dir, wob) => { const P = [], U = []; for (let i = 0; i < 2 * n; i++) { const t = i / n, a = dir * t * TAU, rr = R + wob * Math.sin(t * TAU * 5), y = lerp(y0, y1, .5 - .5 * Math.cos(t * TAU)) + wob * .5 * Math.sin(t * TAU * 7 + 1); P.push([Math.sin(a) * rr, y, Math.cos(a) * rr]); U.push(H); } return [P, U]; };
  const defs = [loop2(1290, 420, 640, 40, 1, 60), loop2(1180, 820, 1010, 36, -1, 50)]; const drg = L.dragons.slice(0, 2);
  drg.forEach((d, i) => { const b = bakePath(defs[i][0], defs[i][1], true); d.row = E.addPath(b); d.it.ext[0] = d.row; d.L = b.L; d.A = b.A; });
  const headS = (d, t) => d.len + (((d.ph + t * d.v) % (d.L / 2)) + d.L / 2) % (d.L / 2);
  const onPath = (d, s) => { const M = d.A.length / 4; const x = clamp((s / d.L) * (M - 1), 0, M - 1.001), i = Math.floor(x), f = x - i; return [0, 1, 2].map(k => lerp(d.A[i * 4 + k], d.A[i * 4 + 4 + k], f)); };
  const update = (t) => { L.update(t); for (const d of drg) d.it.ext[1] = headS(d, t); };
  const along = (q, t, k = 0) => q.path(q.ph + t * q.v + k);
  return { update,
    ride: {
      aps: (t) => { const q = five[0], p = along(q, t), f = v3.norm(v3.sub(along(q, t, 4), along(q, t, -4))), s = v3.norm([-f[2], 0, f[0]]); return { pos: v3.add(v3.mad(v3.mad(p, s, 35), f, 1), [0, 1, 0]), at: v3.add(v3.mad(p, f, -11), [0, 3.5, 0]), vel: v3.mul(f, q.v), fov: 38 }; },
      crane: (t) => { const q = L.cranes[0], p = along(q, t), f = v3.norm(v3.sub(along(q, t, 4), along(q, t, -4))), s = v3.norm([-f[2], 0, f[0]]); return { pos: v3.add(v3.mad(v3.mad(p, f, -26), s, 9), [0, 7, 0]), at: v3.add(v3.mad(p, f, 30), [0, -1, 0]), vel: v3.mul(f, q.v), fov: 48 }; },
      dragon: (t) => { const d = drg[0], s = headS(d, t), p = onPath(d, s - 128), q = onPath(d, s + 30), f = v3.norm(v3.sub(onPath(d, s + 8), onPath(d, s - 8))); const out = v3.norm([p[0], 0, p[2]]); return { pos: v3.add(v3.mad(p, out, 46), [0, 40, 0]), at: v3.add(v3.mad(q, out, -20), [0, 4, 0]), vel: v3.mul(f, d.v), fov: 56 }; },
    } };
}
