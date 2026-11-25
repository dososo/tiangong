// Timeline runtime: pure function of the frame number.
import { Engine } from '../core/engine.js';
import { buildWorld } from '../world/world.js'; import { populate } from '../world/life.js'; import { buildStack } from '../world/stack.js';
import { m4, v3, DEG } from '../core/math.js'; import { SHOTS, FPS, TOTAL, setup } from './shots.js'; import { drawOverlay } from './overlay.js'; import { makeEye } from './eye.js'; import { loadFonts } from '../fonts/load.js';
// close shots of thin, bright detail take more sub-frames
const SPPK = { A: 1.5, B1: 3, B2: 3, E2: 2.5, E3: 3, H: 2, I: 2.5 };
export async function boot(canvas, w, h, o = {}) {
  await loadFonts();
  const E = new Engine(canvas, w, h, { preserve: true, ...o }); const W = buildWorld(E, o); populate(W, E, o); buildStack(W, E); setup(W, E); const eye = makeEye(E);
  const ov = document.createElement('canvas'); ov.width = w; ov.height = h; const ctx = ov.getContext('2d', { willReadFrequently: false }); const gl = E.gl; let ovTex = E.G.tex2D(w, h, 'rgba8', { data: new Uint8Array(w * h * 4) }); let ovOn = false;
  // the South Gate is shut until shot C opens it, and stays open afterwards
  let tC = 0; for (const s of SHOTS) { if (s.id === 'C') break; tC += s.dur; }
  const at = (T) => { let t0 = 0; for (const s of SHOTS) { if (T < t0 + s.dur || s === SHOTS[SHOTS.length - 1]) return { s, u: Math.min(T - t0, s.dur - 1e-6), t0 }; t0 += s.dur; } };
  const perch = (s, c) => { const f = v3.norm(v3.sub(c.at, c.pos)), r = v3.norm(v3.cross(f, c.up || [0, 1, 0])), u = v3.cross(r, f), d = v3.norm(v3.sub(s.perch, c.pos)), oc = v3.sub(c.pos, s.pos), b = v3.dot(oc, d), h = b * b - v3.dot(oc, oc) + s.radius * s.radius; const N = v3.mul(v3.sub(v3.mad(c.pos, d, -b - Math.sqrt(Math.max(h, 0))), s.pos), 1 / s.radius); s.cx = v3.dot(N, r) / .98; s.cy = v3.dot(N, u) / .98 + .500 * s.cs; }; // the crow's feet rest on a point of the world
  const place = (env, c) => { if (env.sun.perch && c) perch(env.sun, c); W.sun.m = m4.trs(env.sun.pos, 0, env.sun.radius); W.sun.c = env.sun.pos; W.sun.dat = [env.sun.cx ?? -.02, env.sun.cy ?? .02, env.sun.glow ?? 20, env.sun.crow ?? 1]; W.sun.ext = [env.sun.cs ?? 1.2, env.sun.open ?? 1, 0, 0]; W.sun.vis = env.sun.disc !== false; const mo = env.moon; W.moon.vis = !!mo && mo.on !== false; if (mo) { W.moon.m = m4.trs(mo.pos, mo.ry ?? 2.2, mo.r); W.moon.c = mo.pos; W.moon.dat = [mo.cx ?? 0, mo.cy ?? 0, mo.glow ?? 1, mo.ink ?? .62]; W.moon.ext = [mo.soft ?? .02, mo.scale ?? 1.02, 0, 0]; } };
  const palace = (q) => { const J = SHOTS.find(s => s.id === 'J'); let t0 = 0; for (const s of SHOTS) { if (s === J) break; t0 += s.dur; } const u = 6, T = t0 + u; const st = J.frame(u, T, W, E); const L = W.life; L.update(T); L.show(st.show || {}); W.stack.show(false); L.setMonkey([0, -9999, 0], 0, 1, false); for (const i of L.extra || []) i.vis = false; place(st.env, st.cam); E.render({ t: T, spp: 4, q, seed: 1, shutter: 0, noPost: true, frame: () => ({ cam: { ...st.cam, ap: 0, fov: st.cam.fov * DEG }, env: st.env }) }); restore && restore(); }; let restore = null;
  const renderAt = (T, { spp = 8, q = {}, frame = Math.round(T * FPS), shutter = .5 / FPS } = {}) => {
    const { s, u, t0 } = at(T); for (const i of W.G.lotus.inst) if (i.dat0) { i.dat = i.dat0; i.dat0 = null; } spp = Math.round(spp * (SPPK[s.id] || 1)); const st = s.frame(u, T, W, E); const L = W.life;
    W.armA.vis = W.armB.vis = true; for (const i of W.G.falls.inst) i.vis = true; for (const i of L.extra || []) i.vis = false; L.update(T); L.show(st.show || {}); W.stack.show(!!st.stack); W.setDoors(st.doors ?? (T < tC ? 0 : 1.35)); const state = () => { L.update(T); L.show(st.show || {}); W.stack.show(!!st.stack); if (st.monkey) L.setMonkey(...st.monkey); place(st.env, st.cam); }; restore = state; if (st.monkey) L.setMonkey(...st.monkey); else L.setMonkey([0, -9999, 0], 0, 1, false); if (st.petal) { L.petal.ext = st.petal; L.petal.dat[1] = st.petalPal || 0; L.petal.vis = true; } if (st.dust) { L.dust.ext = st.dust; L.dust.dat[0] = st.cam.ap ? 5.1 * st.cam.ap / Math.sqrt(spp) : 0; L.dust.dat[1] = st.cam.focus || 0; L.dust.vis = true; } st.pre?.(W, E); place(st.env, st.cam);
    // captions
    const any = drawOverlay(ctx, w, h, T, s, u); if (any || ovOn) { gl.bindTexture(gl.TEXTURE_2D, ovTex.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, ov); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); ovOn = any; } E.over = ovTex;
    const fr = (ts) => { const uu = Math.min(ts - t0, s.dur); const f = ts === T ? st : s.frame(uu, ts, W, E); if (st.refill && f.monkey) L.setMonkey(...f.monkey); f.env.post.over = any ? 1 : 0; return { cam: { ...f.cam, fov: f.cam.fov * DEG }, env: f.env, refill: st.refill }; };
    st.env.post.over = any ? 1 : 0; if (st.eye) eye.render(st.eye, st.env.post, T, frame, { spp, q }, () => E.render({ t: T, spp: st.eye.rm < 1.2 ? Math.max(4, spp >> 1) : spp, q, seed: frame, shutter: st.shutter ?? shutter, frame: fr, noPost: true }), () => palace(q)); else E.render({ t: T, spp, q, seed: frame, shutter: st.shutter ?? shutter, frame: fr, env: st.env });
    return { shot: s.id, u };
  };
  const api = { E, W, SHOTS, FPS, TOTAL, renderAt, at, eye }; window.film = api; return api;
}
