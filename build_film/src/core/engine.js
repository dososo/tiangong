import { createGL, makeUBO } from './gl.js';
import { m4, v3, clamp, lerp, halton, mulberry32, TAU, PI, DEG } from './math.js';
import { ENV_FIELDS } from './glsl.js';
import { makeNoise } from './noise.js'; import { BN } from './bn.js';
import { makePasses } from './passes.js';
import { GVS, GFS, GFS_DEPTH, GFS_FWD } from './gbuffer.js';
import { reliefCanvas, paintCanvas, latticeCanvas, plaqueAtlas, panelCanvas } from './ornament.js';

export const defaultEnv = () => ({
  sun: { pos: [0, 2000, -30000], radius: 900, col: [10, 7, 4.4], fog: 1 },
  l2: { pos: [0, 1e4, 0], col: [0, 0, 0], on: 0 },
  skyZ: [.02, .05, .12, .55], skyM: [.10, .20, .33, 0], skyH: [.55, .42, .34, .22], skyN: [.42, .36, .34, .04],
  glowA: [.9, .5, .25, 7], glowB: [5, 3.2, 1.8, 260], band: [.6, .3, .14, 9], star: [0, 0, .5, 0], halo: [0, 22, 1, 0],
  ambU: [.16, .24, .36, 0], ambD: [.42, .30, .22, 0], ambS: [.28, .18, .10, 0],
  fog0: [1.2e-4, 0, 320, .74], fog1: [.10, .13, .18, 4e-6], fog2: [.6, 0, 1, 26000], fog3: [1, .8, .85, 0],
  cl0: [60, 320, 260, .035], cl1: [0, 0, 1, .34], cl2: [1, 1, 1.2, -900], cl3: [0, 0, 1000, 0], cl4: [0, 0, 0, 0], cl5: [600, .16, 1, .25], cl6: [620, 0, 18, 0], cl7: [0, 0, 1, 0], cl8: [0, 0, 1, 0], cl9: [.40, .30, 0, .004], cl10: [0, 1000, 0, 0], cl11: [0, 0, 0, 0], cl12: [0, .24, 90, 0], lit: [1, 1, 0, 0],
  shadow: { near: { c: [0, 60, 0], r: 320 }, far: { c: [0, 200, 0], r: 5200 } },
  map: 24000, dip: [0, .8, -1, 1], lights: [],
  ao: { r: 5, n: 14, k: 1 }, contact: 3, penum: 2.2, clouds: true, reflect: null,
  post: { exp: 1, bloom: .07, bloomR: 1.15, vig: .5, grain: .035, ca: .0022, sat: 1.22, con: 1.10, lift: [0, 0, 0], gain: [1, 1, 1], tint: [1, 1, 1], fade: 1, white: 0, bars: 0, over: 0 },
});

export class Engine {
  constructor(canvas, W, H, o = {}) {
    this.canvas = canvas; this.o = o; const G = this.G = createGL(canvas, !!o.preserve); this.gl = G.gl; const gl = this.gl;
    this.env = makeUBO(gl, 'Env', ENV_FIELDS, 0); this.groups = []; this.stats = {};
    const decl = this.env.decl; this.P = makePasses(G, decl);
    this.P.g = G.prog('gbuffer', GVS(decl), GFS(decl)); this.P.gd = G.prog('gdepth', GVS(decl), GFS_DEPTH(decl)); this.P.fwd = G.prog('gfwd', GVS(decl), GFS_FWD(decl));
    this.noise = makeNoise(G); this.tBN = G.tex2D(128, 128, 'r8', { data: Uint8Array.from(atob(BN), c => c.charCodeAt(0)) });
    this.tRelief = G.tex2D(2048, 2048, 'rgba8', { source: reliefCanvas(), mips: true, wrap: 'repeat', aniso: 8, flip: true });
    this.tPaint = G.tex2D(2048, 512, 'rgba8', { source: paintCanvas(), mips: true, wrap: 'repeat', aniso: 8, flip: false });
    this.tLattice = G.tex2D(512, 1024, 'rgba8', { source: latticeCanvas(), mips: true, wrap: 'repeat', aniso: 8, flip: true });
    this.tPlaque = G.tex2D(1024, 1024, 'rgba8', { source: plaqueAtlas('"TG Kai","Kaiti SC","STKaiti",serif'), mips: true, aniso: 8, flip: true });
    this.tPanel = G.tex2D(1024, 2048, 'rgba8', { source: panelCanvas(), mips: true, aniso: 8, flip: true });
    const SZ = this.SZ = o.shadow ?? 4096; this.sh = [0, 1].map(() => { const d = G.tex2D(SZ, SZ, 'd32f', { filter: 'nearest' }); return { d, f: G.fbo([], d, SZ, SZ) }; });
    this.tClS = G.tex2D(o.clS ?? 768, o.clS ?? 768, 'rgba32f'); this.fClS = G.fbo([this.tClS]);
    this.tM = G.tex2D(1024, 1024, 'r16f'); this.setMound(null);
    this.pathRows = []; this.tPath = G.tex2D(512, 16, 'rgba32f', { filter: 'nearest', data: new Float32Array(512 * 16 * 4) });
    this.over = G.tex2D(4, 4, 'rgba8', { data: new Uint8Array(64) });
    this.resize(W, H);
  }
  // mound map from a Float32Array N*N
  setMound(a, N = 1024) { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tM.tex); if (!a) { a = new Float32Array(N * N); } gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, N, N, 0, gl.RED, gl.FLOAT, a); }
  // add a dragon path (two rows). returns row index
  addPath({ A, B }) { const gl = this.gl; const r = this.pathRows.length; gl.bindTexture(gl.TEXTURE_2D, this.tPath.tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, r, 512, 1, gl.RGBA, gl.FLOAT, A); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, r + 1, 512, 1, gl.RGBA, gl.FLOAT, B); this.pathRows.push(1, 1); return r; }
  resize(W, H) {
    this.W = W; this.H = H; const G = this.G; const gl = this.gl; this.canvas.width = W; this.canvas.height = H;
    const del = (t) => t && gl.deleteTexture(t.tex); const dfb = (f) => f && gl.deleteFramebuffer(f.fb);
    for (const k of ['tAO', 'tLit', 'tVol', 'tVolD', 'tSub', 'tAcc', 'tRef']) del(this[k]); if (this.mips) for (const m of this.mips) { del(m.a); del(m.b); }
    const mkG = (w, h) => { const t = [G.tex2D(w, h, 'rgba8', { filter: 'nearest' }), G.tex2D(w, h, 'rgba16f', { filter: 'nearest' }), G.tex2D(w, h, 'rgba16f', { filter: 'nearest' }), G.tex2D(w, h, 'rgba32f', { filter: 'nearest' })]; return { t, f: G.fbo(t, 'rb') }; };
    if (this.gb) { this.gb.t.forEach(del); dfb(this.gb.f); } this.gb = mkG(W, H);
    this.tAO = G.tex2D(W, H, 'r8'); this.fAO = G.fbo([this.tAO]); this.tLit = G.tex2D(W, H, 'rgba16f'); this.fLit = G.fbo([this.tLit]);
    const vs = this.volScale = this.o.volScale ?? 1; const vw = Math.round(W * vs), vh = Math.round(H * vs); this.tVol = G.tex2D(vw, vh, 'rgba16f'); this.tVolD = G.tex2D(vw, vh, 'rgba16f'); this.fVol = G.fbo([this.tVol, this.tVolD]);
    this.tSub = G.tex2D(W, H, 'rgba16f'); this.fSub = G.fbo([this.tSub]); this.tAcc = G.tex2D(W, H, 'rgba32f'); this.fAcc = G.fbo([this.tAcc]);
    const rw = Math.round(W * .75), rh = Math.round(H * .75); if (this.gbR) { this.gbR.t.forEach(del); dfb(this.gbR.f); } this.gbR = mkG(rw, rh); this.tRef = G.tex2D(rw, rh, 'rgba16f', { mips: true }); this.fRef = G.fbo([this.tRef]); this.tRefL = G.tex2D(rw, rh, 'rgba16f'); this.fRefL = G.fbo([this.tRefL]); this.tRefV = G.tex2D(rw >> 1, rh >> 1, 'rgba16f'); this.fRefV = G.fbo([this.tRefV]);
    this.mips = []; let w = W, h = H; for (const k of ['tRayA', 'tRayB']) del(this[k]); { const rw2 = Math.max(2, W >> 2), rh2 = Math.max(2, H >> 2); this.tRayA = G.tex2D(rw2, rh2, 'rgba16f'); this.fRayA = G.fbo([this.tRayA]); this.tRayB = G.tex2D(rw2, rh2, 'rgba16f'); this.fRayB = G.fbo([this.tRayB]); } for (let i = 0; i < 8; i++) { w = Math.max(2, w >> 1); h = Math.max(2, h >> 1); const a = G.tex2D(w, h, 'rgba16f'), b = G.tex2D(w, h, 'rgba16f'); this.mips.push({ w, h, a, b, fa: G.fbo([a]), fb: G.fbo([b]) }); }
  }
  // lods: array of built geometry; opts {anim, cast, lodPx:[..]}
  group(name, lods, o = {}) { const G = this.G; const g = { name, lods: lods.map(x => { const a = G.mesh(x); return { cam: a, all: G.view(a) }; }), inst: [], anim: o.anim || 0, cast: o.cast !== false, px: o.px || [420, 110], bounds: lods[0].bounds, o }; this.groups.push(g); return g; }
  add(g, m, dat = [0, 0, 1, 0], ext = [0, 0, 0, 0]) { const s = Math.hypot(m[0], m[1], m[2]), sy = Math.hypot(m[4], m[5], m[6]); const b = g.bounds; const i = { m, dat, ext, c: m4.pt(m, b.c), r: b.r * Math.max(s, sy, Math.hypot(m[8], m[9], m[10])), vis: true }; g.inst.push(i); return i; }
  fill(cam) {
    const pxk = this.H / (2 * Math.tan(cam.fov / 2)); let tris = 0, trisA = 0; const VP = this.VP0; const bias = cam.lodBias ?? 1;
    for (const g of this.groups) {
      const n = g.inst.length; if (!g.buf || g.buf[0].length < n * 20) { g.buf = g.lods.map(() => new Float32Array(Math.max(1, n) * 20)); g.bufA = g.lods.map(() => new Float32Array(Math.max(1, n) * 20)); }
      const c = g.lods.map(() => 0), cA = g.lods.map(() => 0);
      for (const it of g.inst) {
        if (!it.vis) continue; const d = v3.sub(it.c, cam.pos); const dist = Math.max(1, v3.len(d) - it.r * .6); const size = it.r * 2 * pxk / dist * bias;
        let lod = g.lods.length - 1; for (let k = 0; k < g.lods.length - 1; k++) if (size > g.px[k]) { lod = k; break; }
        if (size < (g.o.minPx ?? .6)) continue;
        const M = it.m; const put = (arr, o) => { arr[o] = M[0]; arr[o + 1] = M[4]; arr[o + 2] = M[8]; arr[o + 3] = M[12]; arr[o + 4] = M[1]; arr[o + 5] = M[5]; arr[o + 6] = M[9]; arr[o + 7] = M[13]; arr[o + 8] = M[2]; arr[o + 9] = M[6]; arr[o + 10] = M[10]; arr[o + 11] = M[14]; for (let k = 0; k < 4; k++) { arr[o + 12 + k] = it.dat[k]; arr[o + 16 + k] = it.ext[k]; } };
        const lA = Math.min(g.lods.length - 1, lod + (g.o.shBias ?? 1)); put(g.bufA[lA], cA[lA]++ * 20);
        // frustum test (sphere)
        const z = v3.dot(d, cam.f); if (z < -it.r) continue; const ha = cam.tx, va = cam.ty; const x = Math.abs(v3.dot(d, cam.r)), y = Math.abs(v3.dot(d, cam.u)); const m2 = it.r * 1.45 + 2; if (x > z * ha + m2 * Math.sqrt(1 + ha * ha) || y > z * va + m2 * Math.sqrt(1 + va * va)) continue;
        put(g.buf[lod], c[lod]++ * 20);
      }
      g.lods.forEach((L, k) => { this.G.setInstances(L.cam, g.buf[k], c[k]); this.G.setInstances(L.all, g.bufA[k], cA[k]); tris += c[k] * L.cam.tris; trisA += cA[k] * L.all.tris; });
    }
    this.stats.tris = tris; this.stats.trisShadow = trisA;
  }
  camBasis(c) { // c:{pos,at,fov,roll,focus,ap,near,shift}
    const f = v3.norm(v3.sub(c.at, c.pos)); let r = v3.norm(v3.cross(f, c.up || [0, 1, 0])); let u = v3.cross(r, f); if (c.roll) { const cr = Math.cos(c.roll), sr = Math.sin(c.roll); const r2 = v3.add(v3.mul(r, cr), v3.mul(u, sr)); u = v3.sub(v3.mul(u, cr), v3.mul(r, sr)); r = r2; }
    const ty = Math.tan(c.fov / 2), tx = ty * this.W / this.H; return { ...c, f, r, u, tx, ty };
  }
  setCam(cb, jx, jy, lens, time, seed, si, mirrorY = null) {
    const E = this.env; let pos = cb.pos, F = cb.f, Z = cb.f, R = v3.mul(cb.r, cb.tx), U = v3.mul(cb.u, cb.ty); const near = cb.near ?? .5; const P = m4.persp(cb.fov, this.W / this.H, near); let p8 = -jx, p9 = -jy; let Ff = F;
    const sx = cb.shiftX || 0, sy = cb.shiftY || 0; // lens shift in ndc (keeps verticals straight)
    if (sx || sy) { p8 += sx; p9 += sy; Ff = v3.add(v3.add(F, v3.mul(R, sx)), v3.mul(U, sy)); }
    if (lens && cb.focus) { const [dx, dy] = lens; pos = v3.add(v3.add(pos, v3.mul(cb.r, dx)), v3.mul(cb.u, dy)); Ff = v3.sub(Ff, v3.mul(v3.add(v3.mul(cb.r, dx), v3.mul(cb.u, dy)), 1 / cb.focus)); p8 -= P[0] * dx / cb.focus; p9 -= P[5] * dy / cb.focus; }
    P[8] = p8; P[9] = p9;
    const V = new Float64Array(16); V[0] = cb.r[0]; V[4] = cb.r[1]; V[8] = cb.r[2]; V[1] = cb.u[0]; V[5] = cb.u[1]; V[9] = cb.u[2]; V[2] = -F[0]; V[6] = -F[1]; V[10] = -F[2]; V[12] = -v3.dot(cb.r, pos); V[13] = -v3.dot(cb.u, pos); V[14] = v3.dot(F, pos); V[15] = 1;
    let VP = m4.mul(P, V);
    if (mirrorY !== null) { const Rm = m4.ident(); Rm[5] = -1; Rm[13] = 2 * mirrorY; VP = m4.mul(VP, Rm); pos = [pos[0], 2 * mirrorY - pos[1], pos[2]]; const fl = (a) => [a[0], -a[1], a[2]]; R = fl(R); U = fl(U); Ff = fl(Ff); Z = fl(Z); }
    E.set('uView', V); E.set('uProj', P); E.set('uVP', VP); E.set('uCamP', [...pos, time]); E.set('uCamR', R); E.set('uCamU', U); E.set('uCamF', [...Ff, near]); E.set('uCamZ', Z); E.set('uJit', [jx, jy, seed, si]); this.VP = VP;
  }
  setEnv(e, sunPos) {
    const E = this.env; E.set('uSunP', [...sunPos, e.sun.radius]); E.set('uSunC', [...e.sun.col, e.sun.fog]); E.set('uSunD', [e.sun.fall || 0, 0, 0, 0]); E.set('uL2P', [...e.l2.pos, 0]); E.set('uL2C', [...e.l2.col, e.l2.on]);
    const M = { uSkyZ: 'skyZ', uSkyM: 'skyM', uSkyH: 'skyH', uSkyN: 'skyN', uGlowA: 'glowA', uGlowB: 'glowB', uBand: 'band', uStar: 'star', uHalo: 'halo', uAmbU: 'ambU', uAmbD: 'ambD', uAmbS: 'ambS', uFog0: 'fog0', uFog1: 'fog1', uFog2: 'fog2', uFog3: 'fog3', uCl0: 'cl0', uCl1: 'cl1', uCl2: 'cl2', uCl3: 'cl3', uCl4: 'cl4', uCl5: 'cl5', uCl6: 'cl6', uCl7: 'cl7', uCl8: 'cl8', uCl9: 'cl9', uCl10: 'cl10', uCl11: 'cl11', uCl12: 'cl12', uMisc2: 'lit' };
    for (const k in M) E.set(k, e[M[k]]);
    // light cameras
    const mk = (c, r) => { const d = v3.sub(c, sunPos), dist = v3.len(d); const f = v3.norm(d); let rr = v3.cross(f, Math.abs(f[1]) > .95 ? [0, 0, 1] : [0, 1, 0]); rr = v3.norm(rr); const u = v3.cross(rr, f); const t = Math.min(2.2, r / Math.sqrt(Math.max(1, dist * dist - Math.min(r, dist * .9) ** 2))); const near = Math.max(2, dist * .015); const V = m4.lookAt(sunPos, c, u); return { VP: m4.mul(m4.perspAsym(-t, t, -t, t, near), V), t, f, r: rr, u, dist, tex: 2 * t * dist / this.SZ }; };
    const A = mk(e.shadow.near.c, e.shadow.near.r), B = mk(e.shadow.far.c, e.shadow.far.r); this.L = [A, B];
    E.set('uSh0', A.VP); E.set('uSh1', B.VP); E.set('uShP', [1 / this.SZ, 1 / this.SZ, (A.tex * 1.2 + .03) / A.dist, (B.tex * 1.2 + .05) / B.dist]); E.set('uMap', [e.map, A.tex, B.tex, 0]); E.set('uMisc', e.dip);
    E.set('uRes', [this.W, this.H, 1 / this.W, 1 / this.H]);
    const pl = new Array(64).fill(0), pc = new Array(64).fill(0); e.lights.slice(0, 16).forEach((l, i) => { pl[i * 4] = l.p[0]; pl[i * 4 + 1] = l.p[1]; pl[i * 4 + 2] = l.p[2]; pl[i * 4 + 3] = l.r; pc[i * 4] = l.c[0]; pc[i * 4 + 1] = l.c[1]; pc[i * 4 + 2] = l.c[2]; }); E.set('uPL', pl); E.set('uPC', pc);
  }
  drawAll(prog, view, flip = false) { const gl = this.gl; prog.use(this.gUni); for (const g of this.groups) { if (g.o.fwd || (view === 'sh' && !g.cast)) continue; prog.set({ uAnim: g.anim }); if (g.o.twoSided) gl.disable(gl.CULL_FACE); for (const L of g.lods) this.G.draw(view === 'cam' ? L.cam : L.all); if (g.o.twoSided) gl.enable(gl.CULL_FACE); } }
  shadows() {
    const gl = this.gl, G = this.G; gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.GREATER); gl.clearDepth(0); gl.disable(gl.CULL_FACE); gl.colorMask(false, false, false, false);
    for (let i = 0; i < 2; i++) { G.bind(this.sh[i].f); gl.clear(gl.DEPTH_BUFFER_BIT); this.P.gd.use({ uLVP: this.L[i].VP, uDepthOnly: 1, tPath: this.tPath, tW: this.noise.tW }); this.drawAll(this.P.gd, 'sh'); }
    gl.colorMask(true, true, true, true); gl.enable(gl.CULL_FACE);
  }
  gpass(target, view, flip, mir = null) {
    const gl = this.gl, G = this.G; G.bind(target.f); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.GREATER); gl.clearDepth(0); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(flip ? gl.CW : gl.CCW); gl.disable(gl.BLEND);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]); gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 0]); gl.clearBufferfv(gl.COLOR, 2, [0, 0, 0, 0]); gl.clearBufferfv(gl.COLOR, 3, [0, 0, 0, 0]); gl.clear(gl.DEPTH_BUFFER_BIT);
    this.P.g.use({ uDepthOnly: 0, uMir: mir === null ? [0, 0] : [1, mir], ...this.gTex() }); this.drawAll(this.P.g, view); gl.frontFace(gl.CCW); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  }
  gTex() { return { tBN: this.tBN, tA: this.noise.tA, tB: this.noise.tB, tW: this.noise.tW, tRelief: this.tRelief, tPaint: this.tPaint, tLattice: this.tLattice, tPlaque: this.tPlaque, tPanel: this.tPanel, tPath: this.tPath, tEyeM: (this.eyeTex && this.eyeTex.tEyeM) || this.white(), tEyeP: (this.eyeTex && this.eyeTex.tEyeP) || this.white() }; }
  nTex() { return { tBN: this.tBN, tA: this.noise.tA, tB: this.noise.tB, tW: this.noise.tW, tM: this.tM, tS0: this.sh[0].d, tS1: this.sh[1].d, tClS: this.tClS }; }
  // one sub-frame into tSub
  sub(e, cb, j, lens, time, seed, si, sunPos, q) {
    const gl = this.gl, G = this.G, P = this.P; this.setEnv(e, sunPos); this.setCam(cb, j[0], j[1], lens, time, seed, si); this.env.upload(); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    if (q.shadow) { this.shadows(); gl.disable(gl.DEPTH_TEST); }
    if (q.shadow || q.clShadow) { if (e.clouds) { G.bind(this.fClS); const L = this.L[1]; P.clShadow.use({ uLR: v3.mul(L.r, L.t), uLU: v3.mul(L.u, L.t), uLF: L.f, ...this.nTex() }); G.fsq(); } else { G.bind(this.fClS); gl.clearBufferfv(gl.COLOR, 0, [0, 1e6, 1e6, 0]); } }
    let refl = 0;
    if (e.reflect !== null && e.reflect !== undefined) {
      refl = 1; this.setCam(cb, j[0], j[1], lens, time, seed, si, e.reflect); this.env.upload(); this.gpass(this.gbR, 'all', true, e.reflect);
      const t = this.gbR.t; G.bind(this.fRefL); gl.activeTexture(gl.TEXTURE0); P.light.use({ g0: t[0], g1: t[1], g2: t[2], g3: t[3], tAO: this.white(), tRef: this.white(), tW: this.noise.tW, ...this.nTex(), uRefl: 0, uContact: 0, uDec: q.dec ?? 1, uTaps: 4, uPenum: e.penum, uNPL: Math.min(16, e.lights.length) }); G.fsq();
      G.bind(this.fRefV); P.vol.use({ g3: t[3], ...this.nTex(), uSteps: q.steps * .6, uStK: 1, uFogSteps: Math.max(12, q.fog * .5), uClouds: e.clouds ? 1 : 0, uMir: [1, e.reflect] }); G.fsq();
      G.bind(this.fRef); P.comb.use({ tLit: this.tRefL, tVol: this.tRefV, g3: t[3] }); G.fsq(); gl.bindTexture(gl.TEXTURE_2D, this.tRef.tex); gl.generateMipmap(gl.TEXTURE_2D);
      this.setCam(cb, j[0], j[1], lens, time, seed, si); this.env.upload();
    }
    this.gpass(this.gb, 'cam', false); const t = this.gb.t;
    G.bind(this.fAO); P.ao.use({ g1: t[1], g3: t[3], uRad: e.ao.r, uN: q.ao ?? e.ao.n }); G.fsq();
    G.bind(this.fLit); P.light.use({ g0: t[0], g1: t[1], g2: t[2], g3: t[3], tAO: this.tAO, tRef: refl ? this.tRef : this.white(), tW: this.noise.tW, ...this.nTex(), uRefl: refl, uReflY: e.reflect ?? -1e6, uContact: e.contact, uDec: q.dec ?? 1, uTaps: q.taps ?? 8, uPenum: e.penum, uNPL: Math.min(16, e.lights.length) }); G.fsq();
    G.bind(this.fVol); P.vol.use({ g3: t[3], ...this.nTex(), uSteps: q.steps, uStK: 1, uFogSteps: q.fog, uClouds: e.clouds ? 1 : 0, uMir: [0, 0] }); G.fsq();
    G.bind(this.fSub); P.comb.use({ tLit: this.tLit, tVol: this.tVol, g3: t[3] }); G.fsq(); this.forward();
  }
  // veils (falling water, vapour): blended over the composed sub-frame, sorted against depth, cloud and fog in the shader
  forward() {
    const gl = this.gl, G = this.G; if (!this.groups.some(g => g.o.fwd && g.lods.some(L => L.cam.count))) return;
    G.bind(this.fSub); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    this.P.fwd.use({ g3: this.gb.t[3], tVolD: this.tVolD, uDepthOnly: 0, tPath: this.tPath, ...this.nTex() }); for (const g of this.groups) if (g.o.fwd) { this.P.fwd.set({ uAnim: g.anim }); for (const L of g.lods) G.draw(L.cam); }
    gl.disable(gl.BLEND);
  }
  white() { if (!this._w) this._w = this.G.tex2D(1, 1, 'rgba8', { data: new Uint8Array([255, 255, 255, 255]) }); return this._w; }
  // full offline frame. frame(ts) -> {cam, env}; returns after post on canvas
  render(o) {
    const gl = this.gl, G = this.G; const spp = o.spp ?? 8; const q = { steps: 150, fog: 40, taps: 6, ...(o.q || {}) }; this.env.set('uNz', [1, (o.seed || 0) % 4096, 0, 0]); const f0 = o.frame(o.t + (o.shutter || 0) * .5); const cb0 = this.camBasis(f0.cam); this.VP0 = null; this.fill(cb0);
    G.bind(this.fAcc); gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
    for (let s = 0; s < spp; s++) {
      const ts = o.t + (o.shutter || 0) * ((s + .5) / spp); const fr = spp > 1 ? o.frame(ts) : f0; const cb = this.camBasis(fr.cam); if (fr.refill && s > 0) this.fill(cb); const e = fr.env; const jx = (halton(s + 1, 2) - .5) * 2 / this.W, jy = (halton(s + 1, 3) - .5) * 2 / this.H;
      let lens = null; if (cb.ap && cb.focus) { const r = Math.sqrt((s + .5) / spp) * cb.ap, th = s * 2.399963 + (o.seed || 0) * .0; lens = [Math.cos(th) * r, Math.sin(th) * r]; }
      let sp = e.sun.pos; if (e.sun.soft && spp > 1) { const r = Math.sqrt((((s * 7) % spp) + .5) / spp) * e.sun.radius * e.sun.soft, th = s * 2.399963 + 1.3; const d = v3.norm(v3.sub(cb.pos, sp)); const a = v3.norm(v3.cross(d, [0, 1, .01])), b = v3.cross(a, d); sp = v3.add(sp, v3.add(v3.mul(a, Math.cos(th) * r), v3.mul(b, Math.sin(th) * r))); }
      const seed = ((s * .61803398875 + (o.seed || 0) * .754877) % 1); this.sub(e, cb, [jx, jy], lens, ts, seed, s, sp, { dec: spp >= 16 ? 0 : 1, ...q, shadow: s === 0 || (e.sun.soft && spp > 1), clShadow: true });
      G.bind(this.fAcc); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); this.P.copy.use({ t: this.tSub, uK: [1 / spp, 1 / spp, 1 / spp, 1] }); G.fsq(); gl.disable(gl.BLEND); if (s % 2 === 1) gl.flush(); if (s % 6 === 5) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, this._px ??= new Float32Array(4)); // short waits: one long one can trip the browser's GPU watchdog
    }
    { const c = this.camBasis(f0.cam), d = v3.sub(f0.env.sun.pos, c.pos), z = v3.dot(d, c.f); if (z > 0) { const x = v3.dot(d, c.r) / (z * c.tx), y = v3.dot(d, c.u) / (z * c.ty); const off = Math.max(Math.abs(x), Math.abs(y)); this.sunUV = [x * .5 + .5, y * .5 + .5, off < 1 ? 1 : Math.max(0, 1 - (off - 1) / .8)]; } else this.sunUV = null; }
    if (o.noPost) return f0; this.post(this.tAcc, f0.env.post, o.seed || 0, null); return f0;
  }
  post(src, p, seed, target) {
    const gl = this.gl, G = this.G, P = this.P; gl.disable(gl.BLEND); let s = src, sw = this.W, sh = this.H;
    this.mips.forEach((m, i) => { G.bind(m.fa); P.down.use({ t: s, uT: [1 / sw, 1 / sh], uFirst: i === 0 ? 1 : 0 }); G.fsq(); s = m.a; sw = m.w; sh = m.h; });
    let prev = this.mips[this.mips.length - 1].a; for (let i = this.mips.length - 2; i >= 0; i--) { const m = this.mips[i], n = this.mips[i + 1]; G.bind(m.fb); P.up.use({ t: prev, tB: m.a, uT: [1 / n.w, 1 / n.h], uR: p.bloomR ?? 1, uMix: p.bloomMix ?? .72 }); G.fsq(); prev = m.b; }
    let rays = 0; if (p.rays && p.rays[0] > 0 && (p.raysUV || this.sunUV)) { const su = p.raysUV || this.sunUV; const [k, len, thr, dec] = p.rays; rays = k * su[2]; const c = [su[0], su[1]]; G.bind(this.fRayB); P.rays.use({ t: this.mips[1].a, uC: c, uLen: len ?? .7, uThr: thr ?? 1.5, uFirst: 1, uSeed2: seed % 91, uDec: dec ?? .965 }); G.fsq(); G.bind(this.fRayA); P.rays.use({ t: this.tRayB, uC: c, uLen: (len ?? .7) * .16, uThr: 0, uFirst: 0, uSeed2: seed % 91 + 7, uDec: 1 }); G.fsq(); G.bind(this.fRayB); P.rays.use({ t: this.tRayA, uC: c, uLen: (len ?? .7) * .035, uThr: 0, uFirst: 0, uSeed2: seed % 91 + 3, uDec: 1 }); G.fsq(); }
    G.bind(target); if (!target) gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    P.post.use({ t: src, tBloom: prev, tOver: this.over, tRays: rays ? this.tRayB : this.white(), uRays: rays, uSize: [this.W, this.H], uExp: p.exp, uBloom: p.bloom, uVig: p.vig, uGrain: p.grain, uCA: p.ca, uSeed: seed % 977, uFade: p.fade, uWhite: p.white, uBars: p.bars, uSat: p.sat, uCon: p.con, uLift: p.lift, uGain: p.gain, uTint: p.tint, uOverA: p.over, uTM: p.tm ?? 0 }); G.fsq();
  }
}
