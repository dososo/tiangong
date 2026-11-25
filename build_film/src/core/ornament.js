// Hand-drawn ornament atlases (Canvas2D): cloud-scroll relief, beam painting, lattice doors, plaques.
import { mulberry32, TAU, PI } from './math.js';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; };
function spiral(ctx, cx, cy, r0, r1, a0, turns, dir) { const n = 40; ctx.beginPath(); for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + dir * t * turns * TAU, r = r0 + (r1 - r0) * Math.pow(t, .8); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
function ruyi(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineWidth = s * .105; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const d of [1, -1]) { spiral(ctx, d * s * .34, -s * .02, s * .05, s * .30, d > 0 ? PI * .1 : PI * .9, 1.45, d); ctx.beginPath(); ctx.moveTo(d * s * .60, s * .12); ctx.bezierCurveTo(d * s * .62, -s * .55, d * s * .12, -s * .62, 0, -s * .40); ctx.stroke(); ctx.beginPath(); ctx.moveTo(d * s * .58, s * .12); ctx.bezierCurveTo(d * s * .5, s * .45, d * s * .15, s * .40, 0, s * .22); ctx.stroke(); }
  // tail
  ctx.lineWidth = s * .085; ctx.beginPath(); ctx.moveTo(0, s * .25); ctx.bezierCurveTo(-s * .1, s * .6, -s * .6, s * .55, -s * .95, s * .82); ctx.stroke();
  ctx.lineWidth = s * .06; ctx.beginPath(); ctx.moveTo(s * .12, s * .34); ctx.bezierCurveTo(s * .1, s * .7, -s * .35, s * .8, -s * .7, s * 1.02); ctx.stroke();
  ctx.restore();
}
// scrolling lotus (chan-zhi lian): waves of vine with a full-face flower in every pocket; tiles on a torus
export function reliefCanvas(N = 2048) {
  const [c, x] = mk(N, N); x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.lineCap = 'round'; x.lineJoin = 'round'; const S = N / 2048; const g = v => `rgb(${v},${v},${v})`;
  const wrap = (px, py, r, fn) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { const X = px + dx, Y = py + dy; if (X < -r || X > N + r || Y < -r || Y > N + r) continue; x.save(); x.translate(X, Y); fn(); x.restore(); } };
  const petal = (r0, r1, w, kind) => { x.beginPath(); x.moveTo(0, -r0); if (kind) { x.bezierCurveTo(w * 1.25, -r0 * 1.05, w * 1.35, -r1 * .80, w * .42, -r1 * .90); x.quadraticCurveTo(w * .12, -r1 * .93, 0, -r1); x.quadraticCurveTo(-w * .12, -r1 * .93, -w * .42, -r1 * .90); x.bezierCurveTo(-w * 1.35, -r1 * .80, -w * 1.25, -r0 * 1.05, 0, -r0); } else { x.bezierCurveTo(w * 1.3, -lerp2(r0, r1, .25), w * .9, -lerp2(r0, r1, .75), 0, -r1); x.bezierCurveTo(-w * .9, -lerp2(r0, r1, .75), -w * 1.3, -lerp2(r0, r1, .25), 0, -r0); } x.closePath(); };
  const lerp2 = (a, b2, t) => a + (b2 - a) * t;
  const flower = (R, rot) => { x.rotate(rot); x.fillStyle = '#000'; x.beginPath(); x.arc(0, 0, R * 1.06, 0, TAU); x.fill();
    const ring = (n, r0, r1, w, off, top, kind) => { for (let i = 0; i < n; i++) { x.save(); x.rotate((i + off) / n * TAU); petal(r0, r1, w, kind); x.lineWidth = R * .05; x.strokeStyle = '#000'; x.stroke(); x.fillStyle = g(top); x.fill(); petal(lerp2(r0, r1, .18), lerp2(r0, r1, .80), w * .62, kind); x.lineWidth = R * .026; x.strokeStyle = g(top * .45 | 0); x.stroke(); x.beginPath(); x.moveTo(0, -lerp2(r0, r1, .22)); x.lineTo(0, -lerp2(r0, r1, .68)); x.lineWidth = R * .022; x.stroke(); x.restore(); } };
    ring(12, R * .55, R, R * .215, 0, 170, 1); ring(10, R * .34, R * .76, R * .20, .5, 205, 1); ring(8, R * .18, R * .50, R * .155, 0, 235, 0); x.fillStyle = '#000'; x.beginPath(); x.arc(0, 0, R * .235, 0, TAU); x.fill(); x.fillStyle = g(225); x.beginPath(); x.arc(0, 0, R * .205, 0, TAU); x.fill(); x.fillStyle = g(70); for (let i = 0; i < 7; i++) { const a = i / 6 * TAU, r = i === 6 ? 0 : R * .125; x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, R * .036, 0, TAU); x.fill(); } };
  // tendril: an Euler spiral with leaves
  const tend = (px, py, ang, len, curl, w, leaves) => wrap(px, py, len * 1.3, () => { let X = 0, Y = 0, a = ang; const n = 60; const P = [[0, 0, a]]; for (let i = 1; i <= n; i++) { const t = i / n; a += curl * t * t * 3 / n; X += Math.cos(a) * len / n; Y += Math.sin(a) * len / n; P.push([X, Y, a]); }
    for (const [m, col] of [[1.75, '#000'], [1, g(190)]]) { x.strokeStyle = col; for (let i = 0; i < n; i++) { x.lineWidth = w * m * (1 - .62 * i / n) + (m > 1 ? 4 * S : 0); x.beginPath(); x.moveTo(P[i][0], P[i][1]); x.lineTo(P[i + 1][0], P[i + 1][1]); x.stroke(); } } x.fillStyle = g(215); x.beginPath(); x.arc(X, Y, w * .62, 0, TAU); x.fill();
    const leaf = (q, side, sz) => { const [lx, ly, la] = P[q]; x.save(); x.translate(lx, ly); x.rotate(la + side * .95); for (const [m, col] of [[1.12, '#000'], [1, g(200)]]) { x.fillStyle = col; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(sz * .25 * m, -sz * .50 * m * side, sz * .75 * m, -sz * .42 * m * side, sz * 1.08 * m, sz * .10 * side); x.bezierCurveTo(sz * .86 * m, sz * .02 * side, sz * .78 * m, sz * .14 * side, sz * .70 * m, sz * .24 * m * side); x.bezierCurveTo(sz * .5 * m, sz * .12 * side, sz * .3 * m, sz * .30 * m * side, 0, 0); x.fill(); } x.strokeStyle = g(90); x.lineWidth = sz * .05; x.beginPath(); x.moveTo(sz * .1, -sz * .03 * side); x.quadraticCurveTo(sz * .5, -sz * .22 * side, sz * .92, sz * .02 * side); x.stroke(); x.restore(); };
    leaves.forEach(([q, sd, sz]) => leaf(Math.round(q * n), sd, sz * S)); });
  const ROWS = 6, lam = N / 2, rowH = N / ROWS, A = N * .078, R = N * .073; const phs = r => (r % 2) * lam * .25; const vy = (X, r) => (r + .5) * rowH + A * Math.sin(TAU * (X - phs(r)) / lam); const dvy = (X, r) => A * TAU / lam * Math.cos(TAU * (X - phs(r)) / lam);
  const F = []; for (let r = 0; r < ROWS; r++) for (let k = 0; k < 4; k++) F.push([phs(r) + lam * (.25 + k * .5), (r + .5) * rowH + (k % 2 ? 1 : -1) * A * .28]);
  const near = (px, py) => Math.min(...F.map(([fx, fy]) => { let dx = Math.abs(px - fx) % N, dy = Math.abs(py - fy) % N; dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy); return Math.hypot(dx, dy); }));
  for (const [m, col] of [[1.9, '#000'], [1, g(185)]]) for (let r = 0; r < ROWS; r++) for (const dy of [-N, 0, N]) { x.strokeStyle = col; x.lineWidth = 15 * S * m; x.beginPath(); for (let i = 0; i <= 400; i++) { const X = i / 400 * (N + 80) - 40; const Y = vy(X, r) + dy; i ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke(); }
  // curled acanthus leaf with three lobes
  const acan = (px, py, ang, sd, sz) => wrap(px, py, sz * 1.5, () => { x.rotate(ang); x.scale(1, sd); for (const [m, col] of [[1, '#000'], [0, g(205)]]) { x.fillStyle = col; x.strokeStyle = col; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(sz * .10, -sz * .42, sz * .52, -sz * .66, sz * .92, -sz * .40); x.bezierCurveTo(sz * 1.10, -sz * .26, sz * 1.06, -sz * .02, sz * .86, sz * .04); x.bezierCurveTo(sz * .90, -sz * .10, sz * .84, -sz * .20, sz * .72, -sz * .18); x.bezierCurveTo(sz * .74, -sz * .04, sz * .64, sz * .08, sz * .50, sz * .06); x.bezierCurveTo(sz * .54, -sz * .02, sz * .50, -sz * .12, sz * .40, -sz * .10); x.bezierCurveTo(sz * .36, sz * .02, sz * .20, sz * .08, 0, 0); if (m) { x.lineWidth = 11 * S; x.stroke(); } else x.fill(); } x.strokeStyle = g(95); x.lineWidth = sz * .045; x.beginPath(); x.moveTo(sz * .06, -sz * .06); x.bezierCurveTo(sz * .2, -sz * .32, sz * .55, -sz * .46, sz * .86, -sz * .28); x.stroke(); });
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < 2; q++) for (const [t, sd, off, sz, type] of [[.03, 1, .8, 92, 0], [.07, -1, .8, 84, 0], [.15, 1, .7, 96, 0], [.25, 1, .0, 88, 2], [.34, 1, 2.45, 96, 0], [.43, -1, 2.35, 84, 0], [.46, 1, 2.35, 92, 0], [.53, -1, .8, 92, 0], [.57, 1, .8, 84, 0], [.65, -1, .7, 96, 0], [.75, -1, .0, 88, 2], [.84, -1, 2.45, 96, 0], [.93, 1, 2.35, 84, 0], [.96, -1, 2.35, 92, 0]]) { const X = phs(r) + lam * (q + t), Y = vy(X, r), a = Math.atan2(dvy(X, r), 1); const sgn = sd; // +1: grow downwards
      if (type === 0) { const lx = X + Math.cos(a + sgn * off) * sz * .6 * S, ly = Y + Math.sin(a + sgn * off) * sz * .6 * S; if (near(lx, ly) < R + 22 * S) continue; acan(X, Y, a + sgn * off + sgn * .35, off < 1.5 ? sgn : -sgn, sz * S); }
      else for (const [da, s2, z] of [[-.75, 1, 78], [.75, -1, 78], [0, 1, 70]]) { if (da) acan(X, Y, a + sgn * PI / 2 + da, s2, z * S); else wrap(X, Y, 120 * S, () => { x.rotate(a + sgn * PI / 2 - PI / 2 + PI); for (const [m, col] of [[1, '#000'], [0, g(225)]]) { x.fillStyle = col; x.strokeStyle = col; petal(8 * S, 74 * S, 20 * S, 0); if (m) { x.lineWidth = 10 * S; x.stroke(); } else x.fill(); } }); } }
  F.forEach(([fx, fy], i) => wrap(fx, fy, R * 1.3, () => flower(R, i * .37)));
  const [c2, y] = mk(N, N); y.fillStyle = '#000'; y.fillRect(0, 0, N, N);
  const blurDraw = (b, a) => { y.globalAlpha = a; y.filter = `blur(${b}px)`; for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) y.drawImage(c, dx, dy); };
  blurDraw(8 * S, .75); y.globalCompositeOperation = 'lighter'; blurDraw(2.2 * S, .42); y.filter = 'none'; y.globalAlpha = 1; y.globalCompositeOperation = 'source-over';
  return c2;
}
export function paintCanvas() {
  const W = 2048, H = 512; const [c, x] = mk(W, H);
  const BL = '#1f4f80', BL2 = '#2f6c9a', GR = '#2f7d62', GR2 = '#58a583', GD = '#e0b04a', WH = '#efe6d2', RD = '#9c2a20', DK = '#132c46';
  x.fillStyle = GR; x.fillRect(0, 0, W, H);
  const seg = (x0, x1, col) => { x.fillStyle = col; x.fillRect(x0, 0, x1 - x0, H); };
  // symmetric layout
  const half = (dir) => {
    x.save(); if (dir < 0) { x.translate(W, 0); x.scale(-1, 1); }
    seg(0, 60, BL); seg(60, 150, GR); seg(150, 170, GD);
    x.fillStyle = BL; x.fillRect(170, 0, 470, H);
    // xuanzi rosettes
    const ros = (cx, cy, R, a, b) => { for (let k = 3; k >= 0; k--) { const rr = R * (1 - k * 0); } const rings = [[1, 14, a], [.74, 12, b], [.48, 9, a]]; for (const [f, n, col] of rings) { for (let i = 0; i < n; i++) { const t = (i + (f === .74 ? .5 : 0)) / n * TAU; const px = cx + Math.cos(t) * R * f * .80, py = cy + Math.sin(t) * R * f * .80; const pr = R * f * .235; x.fillStyle = WH; x.beginPath(); x.arc(px, py, pr * 1.0, 0, TAU); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(px, py, pr * .84, 0, TAU); x.fill(); x.strokeStyle = GD; x.lineWidth = 3; x.beginPath(); x.arc(px, py, pr * .52, 0, TAU); x.stroke(); } x.fillStyle = col; x.beginPath(); x.arc(cx, cy, R * f * .74, 0, TAU); x.fill(); } x.fillStyle = GD; x.beginPath(); x.arc(cx, cy, R * .22, 0, TAU); x.fill(); x.fillStyle = RD; x.beginPath(); x.arc(cx, cy, R * .12, 0, TAU); x.fill(); };
    ros(405, H * .5, 170, GR, BL2); ros(170, -10, 120, GR2, BL); ros(170, H + 10, 120, GR2, BL); ros(640, -10, 120, GR2, BL); ros(640, H + 10, 120, GR2, BL);
    // zigzag bands
    const zig = (x0, w, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(x0, 0); x.lineTo(x0 + 70, H / 2); x.lineTo(x0, H); x.lineTo(x0 + w, H); x.lineTo(x0 + w + 70, H / 2); x.lineTo(x0 + w, 0); x.closePath(); x.fill(); };
    zig(612, 90, GR); zig(600, 12, GD); zig(700, 10, WH); zig(716, 12, GD);
    x.restore();
  };
  half(1); half(-1);
  // centre field
  x.fillStyle = DK; x.beginPath(); x.moveTo(740, 0); x.lineTo(812, H / 2); x.lineTo(740, H); x.lineTo(W - 740, H); x.lineTo(W - 812, H / 2); x.lineTo(W - 740, 0); x.closePath(); x.fill(); x.save(); x.clip();
  x.strokeStyle = GD; for (let i = 0; i < 9; i++) { ruyi(x, 830 + i * 50, H * (.5 + .22 * Math.sin(i * 2.1)), 74 + 22 * (i % 2), i * 1.3); }
  x.lineWidth = 16; x.beginPath(); for (let i = 0; i <= 60; i++) { const t = i / 60; const px = 800 + t * 450, py = H * .5 + Math.sin(t * 9.5) * H * .24; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); x.restore();
  x.fillStyle = GD; x.fillRect(0, 0, W, 14); x.fillRect(0, H - 14, W, 14); x.fillStyle = WH; x.fillRect(0, 14, W, 5); x.fillRect(0, H - 19, W, 5);
  // alpha = gold mask
  const im = x.getImageData(0, 0, W, H), d = im.data; for (let i = 0; i < d.length; i += 4) { const g = d[i] > 190 && d[i + 1] > 140 && d[i + 2] < 120 ? 255 : 0; d[i + 3] = g ? 255 : 128; } x.putImageData(im, 0, 0); return c;
}
// R: wood mask, G: gold (nails, knobs), B: relief height
export function latticeCanvas() {
  const W = 512, H = 1024; const [c, x] = mk(W, H); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'lighter';
  const R = '#f00', G = '#0f0', B = '#00f';
  // frame stiles
  x.fillStyle = '#f00'; x.fillRect(0, 0, 44, H); x.fillRect(W - 44, 0, 44, H); for (const [y0, y1] of [[0, 40], [560, 600], [660, 700], [H - 44, H]]) x.fillRect(0, y0, W, y1 - y0);
  x.fillRect(44, 700, W - 88, H - 744); x.fillRect(44, 600, W - 88, 60);
  // three-way lattice with flowers
  x.save(); x.beginPath(); x.rect(44, 40, W - 88, 520); x.clip(); x.strokeStyle = R; x.lineWidth = 9; const p = 70, hgt = p * .866;
  for (let k = -20; k < 30; k++) { x.beginPath(); x.moveTo(0, 40 + k * hgt); x.lineTo(W, 40 + k * hgt); x.stroke(); for (const s of [1, -1]) { x.beginPath(); const X = k * p; x.moveTo(X, 40); x.lineTo(X + s * 520 / Math.tan(PI / 3), 560); x.stroke(); } }
  for (let j = -1; j < 10; j++) for (let i = -2; i < 10; i++) { const px = i * p + (j % 2 ? p / 2 : 0), py = 40 + j * hgt; x.fillStyle = R; for (let q = 0; q < 6; q++) { const a = q / 6 * TAU; x.beginPath(); x.ellipse(px + Math.cos(a) * 12, py + Math.sin(a) * 12, 11, 6.5, a, 0, TAU); x.fill(); } x.fillStyle = G; x.beginPath(); x.arc(px, py, 6, 0, TAU); x.fill(); }
  x.restore();
  // skirt panel gold ruyi
  x.strokeStyle = G; ruyi(x, W / 2, 840, 120, 0); ruyi(x, W / 2 - 100, 930, 60, .5); ruyi(x, W / 2 + 100, 930, 60, -.5); x.lineWidth = 6; x.strokeRect(62, 716, W - 124, H - 776); x.strokeRect(62, 612, W - 124, 36);
  // corner plates
  x.fillStyle = G; for (const px of [8, W - 36]) for (const py of [6, 566, 666, H - 36]) x.fillRect(px, py, 28, 28);
  x.globalCompositeOperation = 'source-over'; return c;
}
export function textCanvas(str, font, w, h, size, o = {}) { const [c, x] = mk(w, h); x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = `${o.weight || ''} ${size}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle'; const ch = [...str]; if (o.vertical) ch.forEach((s, i) => x.fillText(s, w / 2, h / 2 + (i - (ch.length - 1) / 2) * size * (o.gap || 1.12))); else ch.forEach((s, i) => x.fillText(s, w / 2 + (i - (ch.length - 1) / 2) * size * (o.gap || 1.12), h / 2)); return c; }

// top half: the gate plaque; lower half: the twenty-eight lodges, 8 x 4 cells
export const LODGES = '角亢氐房心尾箕斗牛女虛危室壁奎婁胃昴畢觜參井鬼柳星張翼軫';
export function plaqueAtlas(font) { const [c, x] = mk(1024, 1024); x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 1024); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.strokeStyle = '#fff'; x.lineJoin = 'round'; const put = (ch, px, py, lw) => { x.lineWidth = lw; x.strokeText(ch, px, py); x.fillText(ch, px, py); }; x.font = `290px ${font}`; [...'門天南'].forEach((ch, i) => put(ch, 512 + (i - 1) * 290 * 1.02, 256, 13)); /* a plaque reads from right to left */ x.font = `112px ${font}`; [...LODGES].forEach((ch, i) => put(ch, (i % 8) * 128 + 64, 512 + (i >> 3) * 128 + 66, 4)); return c; }
// cloud scrolls above sea-waves and cliffs. R height, G material id (0 ground, 60 cloud, 120 sea, 180 cliff, 255 frame). 1024 x 2048
export function panelCanvas() {
  const W = 1024, H = 2048; const [c, x] = mk(W, H); x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.lineCap = 'round'; x.lineJoin = 'round'; let id = 0; const g = v => `rgb(${Math.round(v)},${id},0)`;
  x.strokeStyle = g(22); x.lineWidth = 5; for (let k = -40; k < 60; k++) for (const s of [1, -1]) { x.beginPath(); x.moveTo(k * 64, 0); x.lineTo(k * 64 + s * H * .5, H); x.stroke(); }
  x.fillStyle = g(40); for (let j = 0; j < 34; j++) for (let i = 0; i < 18; i++) { x.beginPath(); x.arc(i * 64 + (j % 2) * 32, j * 64, 11, 0, TAU); x.fill(); }
  id = 60; const spiral = (cx, cy, r, dir, rot, w, lum) => { x.strokeStyle = g(lum); x.lineWidth = w; x.beginPath(); for (let i = 0; i <= 70; i++) { const t = i / 70; const a = rot + dir * t * 10; const q = r * Math.pow(1 - t, .9); const px = cx + Math.cos(a) * q, py = cy + Math.sin(a) * q; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); };
  const cloud = (cx, cy, s, flip) => { const L = [[-1.0, .22, .60, -1], [.98, .25, .56, 1], [-.38, -.42, .66, -1], [.42, -.36, .62, 1], [0, .22, .60, 1]]; for (const [m, l] of [[1.20, 10], [1.04, 190], [.94, 70]]) { x.fillStyle = g(l); for (const [dx, dy, r] of L) { x.beginPath(); x.arc(cx + dx * s * flip, cy + dy * s, r * s * m, 0, TAU); x.fill(); } } for (const [dx, dy, r, d] of L) spiral(cx + dx * s * flip, cy + dy * s, r * s * .84, d * flip, d * flip > 0 ? PI * .75 : PI * .25, s * .12, 235);
    for (const [k, w] of [[0, .15], [1, .11], [2, .08]]) { x.strokeStyle = g(210); x.lineWidth = s * w; x.beginPath(); x.moveTo(cx - flip * s * .9, cy + s * (.72 + k * .16)); x.bezierCurveTo(cx - flip * s * 1.9, cy + s * (1.0 + k * .2), cx - flip * s * 2.2, cy + s * (.4 + k * .25), cx - flip * s * (3.3 + k * .3), cy + s * (.75 + k * .22)); x.stroke(); } };
  const rnd = mulberry32(31); for (let j = 0; j < 9; j++) for (let i = 0; i < 3; i++) cloud(150 + i * 350 + (j % 2) * 150 + (rnd() - .5) * 70, 120 + j * 176 + (rnd() - .5) * 46, 54 + rnd() * 24, rnd() < .5 ? 1 : -1);
  id = 120; for (let j = 0; j < 7; j++) for (let i = -1; i < 11; i++) { const cx = i * 108 + (j % 2) * 54, cy = H - 360 + j * 62; for (let k = 5; k > 0; k--) { x.fillStyle = g(k % 2 ? 200 - j * 6 : 30); x.beginPath(); x.arc(cx, cy, k * 12.4, PI, TAU); x.fill(); } }
  // breaking crests along the top of the sea
  for (let i = 0; i < 9; i++) { const cx = 60 + i * 115, cy = H - 420 + 26 * Math.sin(i * 2.1); for (let q = 0; q < 5; q++) { x.strokeStyle = g(225); x.lineWidth = 11; x.beginPath(); x.moveTo(cx - 40 + q * 20, cy + 70); x.bezierCurveTo(cx - 30 + q * 20, cy - 10, cx + 20 + q * 12, cy - 40, cx + 34 + q * 10, cy - 6 - q * 6); x.stroke(); } spiral(cx + 30, cy - 10, 30, 1, PI, 10, 235); }
  id = 180; for (const [px, w, h] of [[512, 170, 560], [350, 110, 380], [674, 120, 400], [210, 80, 250], [820, 84, 260]]) for (const [m, l] of [[1.10, 8], [1, 225], [.86, 90], [.74, 200], [.5, 120]]) { x.fillStyle = g(l); x.beginPath(); x.moveTo(px - w * m, H); x.quadraticCurveTo(px - w * .78 * m, H - h * .55 * m, px - w * .34 * m, H - h * .78 * m); x.quadraticCurveTo(px - w * .1 * m, H - h * m, px, H - h * m); x.quadraticCurveTo(px + w * .16 * m, H - h * m, px + w * .34 * m, H - h * .74 * m); x.quadraticCurveTo(px + w * .80 * m, H - h * .5 * m, px + w * m, H); x.fill(); }
  id = 255; x.strokeStyle = g(235); x.lineWidth = 22; x.strokeRect(14, 14, W - 28, H - 28); x.lineWidth = 8; x.strokeRect(44, 44, W - 88, H - 88);
  // soften so that the relief has rounded shoulders
  const [c2, y] = mk(W, H); y.filter = 'blur(2.2px)'; y.drawImage(c, 0, 0); return c2;
}
