// Captions: a few vertical lines of the book, set small, right to left; then the inscription and the seal.
import { clamp, lerp, ss, easeOut, mulberry32 } from '../core/math.js';
import { F_CAP, F_TITLE } from '../fonts/load.js';
// columns run right to left; a later column hangs lower, as in an inscription on a painting
const CAP = [
  { s: 'A', a: 4.2, b: 10.6, x: .885, y: .150, cols: ['初登上界', '乍入天堂'] },
  { s: 'B1', a: 1.0, b: 6.6, x: .930, y: .130, v: .62, cols: ['只见那南天门', '碧沉沉琉璃造就', '明幌幌宝玉妆成'] },
  { s: 'B2', a: .5, b: 4.7, x: .930, y: .140, v: .50, cols: ['柱上缠绕着', '金鳞耀日赤须龙'] },
  { s: 'C', a: 3.4, b: 9.6, x: .945, y: .140, v: .50, cols: ['金光万道滚红霓', '瑞气千条喷紫雾'] },
  { s: 'D', a: 6.2, b: 12.0, x: .930, y: .120, cols: ['这天上有', '三十三座天宫'] },
  { s: 'D', a: 14.2, b: 20.2, x: .070, y: .120, cols: ['又有', '七十二重宝殿'], left: true },
  { s: 'E1', a: .7, b: 5.2, x: .060, y: .130, v: .55, left: true, cols: ['复道回廊', '处处玲珑剔透'] },
  { s: 'E2', a: .6, b: 5.2, x: .935, y: .130, v: .42, cols: ['三檐四簇', '层层龙凤翱翔'] },
  { s: 'F1', a: 2.2, b: 8.2, x: .930, y: .130, cols: ['参圣金乌着底飞'] },
  { s: 'F2', a: 1.6, b: 7.0, x: .930, y: .130, cols: ['朝王玉兔坛边过'] },
  { s: 'G1', a: .6, b: 5.7, x: .955, y: .130, v: .40, cols: ['金钟撞动', '三曹神表进丹墀'] },
  { s: 'G2', a: .7, b: 6.6, x: .930, y: .130, cols: ['天鼓鸣时', '万圣朝王参玉帝'] },
  { s: 'J', a: 2.6, b: 14.6, x: .100, y: .150, cols: ['猴王有分来天境', '不堕人间点污泥'], left: true, hold: true },
];
const INK = [247, 236, 212];
function column(ctx, str, x, y, size, pitch, t, seed, alphaAll) { // one char after another
  ctx.font = `400 ${size}px ${F_CAP}, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const ch = [...str];
  ch.forEach((c, i) => { const q = clamp((t - i * .13) / .9); if (q <= 0) return; const e = easeOut(q, 2); const a = alphaAll * e; const yy = y + i * pitch - (1 - e) * size * .16;
    ctx.shadowColor = `rgba(10,8,12,${.62 * a})`; ctx.shadowBlur = size * .55; ctx.fillStyle = `rgba(${INK},${a})`; ctx.fillText(c, x, yy); ctx.shadowBlur = size * .12; ctx.shadowColor = `rgba(10,8,12,${.55 * a})`; ctx.fillText(c, x, yy); });
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  return ch.length;
}
// 天宮 in folded seal script, drawn on a 22 x 22 grid; white lines on cinnabar
const SEAL = [
  // 天: right half
  [[12.5, 3], [19.5, 3]], [[12.5, 6.2], [19.5, 6.2]], [[16, 3], [16, 10.2]], [[12.5, 19], [12.5, 10.2], [19.5, 10.2], [19.5, 19]], [[16, 10.2], [16, 13.6]], [[14.8, 19], [14.8, 13.6], [17.2, 13.6], [17.2, 19]],
  // 宮: left half
  [[6, 2.4], [6, 4.6]], [[2.5, 8.2], [2.5, 4.6], [9.5, 4.6], [9.5, 8.2]], [[4.2, 7.6], [7.8, 7.6], [7.8, 11.2], [4.2, 11.2], [4.2, 7.6]], [[6, 11.2], [6, 13.4]], [[3, 13.4], [9, 13.4], [9, 19], [3, 19], [3, 13.4]]];
let sealC = null, sealS = 0;
function seal(px) { // rough-edged, worn
  if (sealC && sealS === px) return sealC; sealS = px; const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d'); const rnd = mulberry32(18); const s = px / 22;
  x.fillStyle = 'rgb(168,44,30)'; x.beginPath(); const N = 120; for (let i = 0; i <= N; i++) { const k = i / N * 4, e = Math.floor(k) % 4, f = k - Math.floor(k); const j = .35 + rnd() * .42; const p = e === 0 ? [f * 22, j] : e === 1 ? [22 - j, f * 22] : e === 2 ? [22 - f * 22, 22 - j] : [j, 22 - f * 22]; i ? x.lineTo(p[0] * s, p[1] * s) : x.moveTo(p[0] * s, p[1] * s); } x.closePath(); x.fill();
  x.globalCompositeOperation = 'destination-out'; x.strokeStyle = '#000'; x.lineWidth = 1.18 * s; x.lineCap = 'butt'; x.lineJoin = 'miter'; for (const L of SEAL) { x.beginPath(); L.forEach((p, i) => i ? x.lineTo(p[0] * s, p[1] * s) : x.moveTo(p[0] * s, p[1] * s)); x.stroke(); }
  for (let i = 0; i < 260; i++) { x.globalAlpha = rnd() * .8; x.beginPath(); x.arc(rnd() * px, rnd() * px, rnd() * rnd() * .34 * s, 0, 7); x.fill(); } return sealC = c;
}
function title(ctx, w, h, u) {
  const size = h * .162, x = w * .905, y0 = h * .215, pitch = size * 1.16; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const out = 1 - ss(13.0, 14.6, u);
  [...'天宫'].forEach((c, i) => { const t0 = 6.0 + i * 1.1, q = clamp((u - t0) / 2.2); if (q <= 0) return; const e = easeOut(q, 2.2); const y = y0 + i * pitch; ctx.save(); // the light sweeps down the character
    const g = ctx.createLinearGradient(0, y - size * .56, 0, y + size * .56); const k = e * 1.5; const at = v => clamp(v); g.addColorStop(0, `rgba(255,246,222,${out * at(k * 1.4)})`); g.addColorStop(at(.45), `rgba(250,222,160,${out * at((k - .28) * 1.6)})`); g.addColorStop(1, `rgba(236,186,104,${out * at((k - .55) * 1.6)})`);
    ctx.font = `200 ${size}px ${F_TITLE}, serif`; ctx.shadowColor = `rgba(255,190,90,${.42 * out * at((q - .05) * 2) * (1 - .55 * ss(2, 5, u - t0))})`; ctx.shadowBlur = size * .34; ctx.fillStyle = g; ctx.fillText(c, x, y); ctx.shadowColor = `rgba(40,12,6,${.5 * out * e})`; ctx.shadowBlur = size * .05; ctx.fillText(c, x, y); ctx.restore(); });
  const xs = x - size * .80, ys = y0 + pitch * .30, s2 = h * .0205, p2 = s2 * 1.42; const sa = ss(10.0, 10.35, u) * out; if (sa > 0) { const px = Math.round(h * .046); ctx.globalAlpha = sa; ctx.drawImage(seal(px), Math.round(xs - px / 2), Math.round(ys + 6.9 * p2)); ctx.globalAlpha = 1; }
  const ca = ss(8.4, 9.8, u) * out; if (ca > 0) { ctx.font = `400 ${s2}px ${F_CAP}, serif`; ctx.fillStyle = `rgba(${INK},${.86 * ca})`; ctx.shadowColor = `rgba(30,10,6,${.6 * ca})`; ctx.shadowBlur = s2 * .5; [...'西游记第四回'].forEach((c, i) => ctx.fillText(c, xs, ys + i * p2 + (i > 2 ? s2 * .55 : 0))); ctx.shadowBlur = 0; }
}
export function drawOverlay(ctx, w, h, T, s, u) {
  const L = CAP.filter(c => c.s === s.id && u > c.a && u < c.b); const ti = s.id === 'J' && u > 5.9 && u < 14.7; if (!L.length && !ti) return false;
  ctx.clearRect(0, 0, w, h); const size = h * .0315, pitch = size * 1.36, gap = size * 2.05;
  for (const c of L) { const t = u - c.a; const out = c.hold ? 1 - ss(13.0, 14.4, u) : 1 - ss(c.b - .9, c.b, u); let k = 0; const n = c.cols.length; const x0 = c.left ? c.x * w + (n - 1) * gap : c.x * w; { const len = Math.max(...c.cols.map((q, i) => [...q].length + i * 1.15)); const cx = x0 - (n - 1) * gap / 2, cy = c.y * h + (len - 1) * pitch / 2; const a = (c.v ?? .22) * ss(0, 1.4, t) * out; ctx.save(); ctx.translate(cx, cy); ctx.scale(gap * (n * .5 + 1.5), pitch * (len * .5 + 2.2)); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(9,7,10,${a})`); g.addColorStop(.45, `rgba(9,7,10,${a * .72})`); g.addColorStop(.75, `rgba(9,7,10,${a * .25})`); g.addColorStop(1, 'rgba(9,7,10,0)'); ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore(); } c.cols.forEach((str, i) => { column(ctx, str, x0 - i * gap, c.y * h + i * pitch * 1.15, size, pitch, t - k * .13, i, out); k += [...str].length; }); }
  if (ti) title(ctx, w, h, u); return true;
}
