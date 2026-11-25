// The thirty-three heavens, one above another: every storey is a ring of lotus palaces wreathed in cloud.
import { m4, v3, lerp, TAU, PI, mulberry32 } from '../core/math.js';
export const STK = { n: 33, y0: 2500, dy: 1250 };
export const stkR = (k) => { const t = k / (STK.n - 1), a = Math.max(0, 1 - t / .25), b = Math.max(0, (t - .25) / .75); return 1050 + 850 * a * a + 6500 * Math.pow(b, 2.1); };
export function buildStack(W, E) {
  const g = W.G; const all = []; const rnd = mulberry32(33); const add = (n, m, dat) => { const i = E.add(g[n], m, dat || [rnd(), rnd(), 1, 0]); i.vis = false; all.push(i); return i; };
  // glaze of each storey: gold, azure, vermilion, celadon, malachite, ink, aubergine, teal
  const PALS = [1, 2, 5, 4, 6, 1, 7, 3, 2, 5, 1]; const LOT = [.1, .5, .75, .9, .1, .45, .7, .5, .92, .15, .4];
  for (let k = 0; k < STK.n; k++) { const y = STK.y0 + k * STK.dy; const R = stkR(k); const n = Math.max(16, Math.round(TAU * R / 560 / 4) * 4); const ph = k * .37; const pal = PALS[k % PALS.length], lt = LOT[k % LOT.length];
    for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU + ph; const yy = y + (i % 2 ? 60 : -30); const p = [Math.sin(a) * R, yy, Math.cos(a) * R]; const big = i % 4 === 0; const s = big ? 210 : 150; add('lotus', m4.trs(p, a, s), [rnd(), lt, 1, 0]);
      const M = m4.trs(p, a + PI); const P = (nm, x, z, ry, sc) => add(nm, m4.mul(M, m4.trs([x, .2, z], ry, sc)), [rnd(), rnd(), 1.6, pal]);
      if (big) { P('hallB', 0, 10, 0, 1.75); P('tower5', -118, -20, 0, 1.15); P('tower5', 118, -20, 0, 1.15); P('pagoda', 0, -95, 0, .8); } else if (i % 2) { P('tower5', 0, 0, 0, 2.2); P('hallX', -82, 10, PI / 4, .9); P('hallX', 82, 10, -PI / 4, .9); } else { P('hallB', 0, 0, 0, 1.35); P('tower3', -90, -6, 0, 1); P('tower3', 90, -6, 0, 1); }
      for (let q = 0; q < 4; q++) { const aa = rnd() * TAU, rr = s * (.62 + .26 * rnd()); add(rnd() < .4 ? 'pine' + (q & 1) : 'blos' + (q & 1), m4.trs([p[0] + Math.sin(aa) * rr, yy, p[2] + Math.cos(aa) * rr], rnd() * 6, 1.5 + rnd()), [rnd(), rnd(), 1, 0]); }
    }
    // the causeway that links the ring
    for (let i = 0; i < n; i++) { const a0 = (i + .5) / n * TAU + ph, a1 = (i + 1.5) / n * TAU + ph; const s0 = i % 4 === 0 ? 210 : 150, s1 = (i + 1) % n % 4 === 0 ? 210 : 150; const y0 = y + (i % 2 ? 60 : -30), y1 = y + ((i + 1) % n % 2 ? 60 : -30); const pa = [Math.sin(a0) * R, y0, Math.cos(a0) * R], pb = [Math.sin(a1) * R, y1, Math.cos(a1) * R]; const d = v3.norm(v3.sub(pb, pa)); const p0 = v3.mad(pa, d, s0 * .94), p1 = v3.mad(pb, d, -s1 * .94); const len = v3.dist(p0, p1); const zz = v3.norm(v3.sub(p1, p0)), xx = v3.norm(v3.cross([0, 1, 0], zz)), yy = v3.cross(zz, xx); const m = Math.max(1, Math.round(len / 110)); for (let q = 0; q < m; q++) add('sky', m4.basis(xx, yy, v3.mul(zz, len / m / 80), v3.add(p0, v3.mul(v3.sub(p1, p0), (q + .5) / m)))); }
  }
  W.stack = { all, show: (on) => { if (W.stack.on === on) return; W.stack.on = on; for (const i of all) i.vis = on; }, on: false }; return W.stack;
}
