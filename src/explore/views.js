// Places to stand. Each borrows a shot of the film (camera, light, actors) and its line from the book.
import { SHOTS } from '../film/shots.js';
import { v3, clamp, lerp, ss, DEG, PI } from '../core/math.js';
export const VIEWS = [
  { id: 'A', name: '云海', shot: 'A', u: 9.6, hour: 0, R: 5200, cap: ['初登上界', '乍入天堂'] },
  { id: 'B3', name: '南天门', shot: 'B3', u: 6.8, hour: 6.4, R: 520, cap: ['只见那南天门', '碧沉沉琉璃造就', '明幌幌宝玉妆成'] },
  { id: 'B2', name: '龙柱', shot: 'B2', u: 4.2, hour: 6.3, R: 70, cap: ['柱上缠绕着', '金鳞耀日赤须龙'] },
  { id: 'C', name: '天门', shot: 'C', u: 7.2, hour: 9.5, R: 260, cap: ['金光万道滚红霓', '瑞气千条喷紫雾'] },
  { id: 'D', name: '长桥', shot: 'D', u: 14.5, hour: 14, R: 900, cap: ['这天上有三十三座天宫', '又有七十二重宝殿'] },
  { id: 'E1', name: '回廊', shot: 'E1', u: 4.2, hour: 8.2, R: 240, cap: ['复道回廊', '处处玲珑剔透'] },
  { id: 'E2', name: '丹墀', shot: 'E2', u: 3.4, hour: 10, R: 260, cap: ['三檐四簇', '层层龙凤翱翔'] },
  { id: 'E3', name: '飞天', shot: 'E3', u: 2.4, hour: 8.6, R: 500, ride: true, cap: ['飞天散花'] },
  { id: 'G1', name: '朝会', shot: 'G1', u: 3, hour: 18, R: 700, cap: ['金钟撞动', '三曹神表进丹墀'] },
  { id: 'G2', name: '凌霄', shot: 'G2', u: 6.2, hour: 18.1, R: 2600, cap: ['天鼓鸣时', '万圣朝王参玉帝'] },
  { id: 'F1', name: '日坛', shot: 'F1', u: 5, hour: 20.8, R: 1100, cap: ['参圣金乌着底飞'] },
  { id: 'F2', name: '月坛', shot: 'F2', u: 4.2, hour: 21.6, R: 420, cap: ['朝王玉兔坛边过'] },
  { id: 'H1', name: '仰观', shot: 'H', u: 8.1, hour: 18.2, R: 1e9, stack: true, up: true, cap: ['三十三座天宫'] },
  { id: 'H2', name: '俯观', shot: 'H', u: 23.2, hour: 18.2, R: 1e9, stack: true, cap: ['三十三座天宫'] },
  { id: 'J', name: '行者', shot: 'J', u: 8.2, hour: 18, R: 900, cap: ['猴王有分来天境', '不堕人间点污泥'] },
];
const byId = Object.fromEntries(SHOTS.map(s => [s.id, s]));
export const poseOf = (c) => { const d = v3.sub(c.at, c.pos), l = v3.len(d), f = v3.mul(d, 1 / l); let yaw = Math.atan2(f[0], f[2]), pitch = Math.asin(clamp(f[1], -1, 1)); if (c.up && Math.abs(f[1]) > .97) { const u = c.up; const s = f[1] > 0 ? -1 : 1; yaw = Math.atan2(u[0] * s, u[2] * s); } return { pos: c.pos.slice(), yaw, pitch, roll: c.roll || 0, fov: c.fov * DEG }; };
export function makeViews(W, E) {
  const T0 = {}; let t = 0; for (const s of SHOTS) { T0[s.id] = t; t += s.dur; }
  // shots time their actors to the film; here they come round again instead of leaving for ever
  const L = W.life; const wrap = (q, span) => { const path = q.path, off = q.ph; q.path = (d) => path(((d + span * .5) % span + span) % span - span * .5); };
  const nCr = 13 + 9 + 15 + 13; for (const q of L.cranes.slice(-nCr)) wrap(q, 5200); for (const q of L.aps.slice(-5)) wrap(q, 2600);
  const at = (v, T, wob = 0) => { const s = byId[v.shot]; return s.frame(v.u + wob, T0[v.shot] + v.u, W, E); };
  for (const v of VIEWS) { const st = at(v, 0); v.pose = poseOf(st.cam); v.cam = st.cam; }
  // the dragons of the thirty-three heavens: recover their path length from the shot
  let hd = null; { const st = byId.H.frame(8, T0.H + 8, W, E); st.pre(W, E); const yh = L.extra[0].ext[1]; const y = (() => { const e = st.env.lights[0].p[1] + 520; return e; })(); hd = L.extra.map(it => it.ext[1] / clamp((y - 300) / 29700)); for (const i of L.extra) i.vis = false; }
  return { list: VIEWS, frame: at, T0, helix: (T, on) => { L.extra.forEach((it, k) => { it.vis = on; if (on) { const yh = 900 + ((T * 420 + k * 14000) % 28500); it.ext[1] = clamp((yh - 300) / 29700) * hd[k]; } }); if (!on) return []; return L.extra.map((it, k) => { const yh = 900 + ((T * 420 + k * 14000) % 28500); const a = (yh / 4600) * Math.PI * 2 + k * PI + .4 * Math.sin(yh * .0011 + k); return [{ p: [Math.sin(a) * 250, yh - 520, Math.cos(a) * 250], r: 3000, c: [9, 6.6, 3.4] }, { p: [Math.sin(a - 1.6) * 250, yh - 1650, Math.cos(a - 1.6) * 250], r: 3000, c: [7, 5.2, 2.8] }]; }).flat(); } };
}
