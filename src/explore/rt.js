// Real-time front end for the film engine: one sample a frame, temporal accumulation with upsampling,
// half-resolution volumetrics, shadow maps refreshed in turn. 定格 (still) drops back to the film path.
import { m4, v3, clamp, halton } from '../core/math.js';
import { COMMON, RAY } from '../core/glsl.js'; import { fillRT, prepare } from './fill.js';

const TAAU = /* glsl */`
in vec2 vUv; out vec4 o; uniform sampler2D tCur,tHist,g3,tVolD; uniform mat4 uHVP; uniform vec4 uIn,uOut; uniform float uReset,uMaxN,uK,uLock;
vec3 toY(vec3 c){ return vec3(.25*c.r+.5*c.g+.25*c.b,.5*c.r-.5*c.b,-.25*c.r+.5*c.g-.25*c.b); }
vec3 toR(vec3 c){ float t=c.x-c.z; return vec3(t+c.y,c.x+c.z,t-c.y); }
vec3 tm(vec3 c){ c=max(c*uK,0.); return c/(1.+luma(c)); } vec3 itm(vec3 c){ return max(c,0.)/(uK*max(1.-luma(c),2e-3)); }
vec3 fetchC(ivec2 p){ return toY(tm(texelFetch(tCur,clamp(p,ivec2(0),ivec2(uIn.xy)-1),0).rgb)); }
vec4 hist(vec2 uv){ vec2 p=uv*uOut.xy,c=floor(p-.5)+.5,f=p-c; vec2 w0=f*(-.5+f*(1.-.5*f)),w1=1.+f*f*(-2.5+1.5*f),w2=f*(.5+f*(2.-1.5*f)),w3=f*f*(-.5+.5*f); vec2 w12=w1+w2,o12=w2/w12; vec2 t0=(c-1.)*uOut.zw,t3=(c+2.)*uOut.zw,t12=(c+o12)*uOut.zw;
 vec4 r=textureLod(tHist,vec2(t12.x,t0.y),0.)*w12.x*w0.y+textureLod(tHist,vec2(t0.x,t12.y),0.)*w0.x*w12.y+textureLod(tHist,t12,0.)*w12.x*w12.y+textureLod(tHist,vec2(t3.x,t12.y),0.)*w3.x*w12.y+textureLod(tHist,vec2(t12.x,t3.y),0.)*w12.x*w3.y; float w=w12.x*w0.y+w0.x*w12.y+w12.x*w12.y+w3.x*w12.y+w12.x*w3.y; return max(r/w,0.); }
void main(){
  vec2 jp=uJit.xy*.5*uIn.xy; vec2 P=vUv*uIn.xy; ivec2 b=ivec2(floor(P+jp)); float ratio=uOut.x*uIn.z; vec3 m1=vec3(0.),m2=vec3(0.),cur=vec3(0.); float ws=0.,wmx=0.,zn=1e9; ivec2 bz=b;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ ivec2 p=b+ivec2(x,y); vec3 c=fetchC(p); m1+=c; m2+=c*c; vec2 d=(vec2(p)+.5-jp-P)*ratio; float w=exp(-2.29*dot(d,d)); cur+=c*w; ws+=w; wmx=max(wmx,w); float z=texelFetch(g3,clamp(p,ivec2(0),ivec2(uIn.xy)-1),0).x; if(z>0.&&z<zn){ zn=z; bz=p; } }
  m1/=9.; m2/=9.; vec3 sg=sqrt(max(m2-m1*m1,0.)); if(ws>1e-3) cur/=ws; else cur=m1; float conf=clamp(wmx,.04,1.);
  // where was this point a frame ago: nearest surface, or cloud when the cloud is what we see
  vec2 uvz=(vec2(bz)+.5)*uIn.zw; vec3 rv=rayDir(uvz); float rl=length(rv); float z=zn<1e8?zn:2e5; vec4 vd=textureLod(tVolD,uvz,0.); if(vd.y<.5&&vd.x>0.) z=min(z,vd.x/rl); if(vd.w<.5&&vd.z>0.) z=min(z,vd.z/rl);
  vec4 pc=uHVP*vec4(uCamP.xyz+rv*z,1.); vec2 puv=pc.xy/max(pc.w,1e-4)*.5+.5; vec2 cuv=(vec2(bz)+.5-jp)*uIn.zw; vec2 vel=cuv-puv;
  if(uLock>0.&&zn<uLock){ float m=floor(g3dec(texelFetch(g3,clamp(bz,ivec2(0),ivec2(uIn.xy)-1),0)).w+.5); if(m==9.||m==14.||m==17.||m==22.||m==27.||m==28.||(m>=31.&&m<=33.)) vel=vec2(0.); } // whoever flies with us keeps still in the frame
  vec2 huv=vUv-vel; float mv=length(vel*uOut.xy);
  float ok=uReset>.5||pc.w<=0.||any(lessThan(huv,vec2(0.)))||any(greaterThan(huv,vec2(1.)))?0.:1.; vec4 hs=ok>.5?hist(huv):vec4(0.); float N=ok>.5?min(hs.a,uMaxN):0.; vec3 h=toY(tm(hs.rgb));
  float g=mix(1.9,1.05,clamp(mv*.35,0.,1.)); vec3 dl=h-m1; vec3 q=abs(dl/max(sg*g,vec3(6e-4))); float k=max(q.x,max(q.y,q.z)); if(k>1.){ h=m1+dl/k; N*=mix(1.,.45,clamp((k-1.)*.6,0.,1.)); }
  float nw=N+conf; vec3 c=mix(h,cur,ok>.5?clamp(conf/nw,.015,1.):1.); o=vec4(min(itm(toR(c)),vec3(400.)),nw);
}`;
const COMB = /* glsl */`
in vec2 vUv; out vec4 o; uniform sampler2D tLit,tVol,g3; uniform vec4 uV;
void main(){ vec3 c=textureLod(tLit,vUv,0.).rgb; float z=textureLod(g3,vUv,0.).x; z=z<=0.?1e6:z; vec2 p=vUv*uV.xy-.5,b=floor(p),f=p-b; vec4 a=vec4(0.); float ws=0.; for(int y=0;y<2;y++) for(int x=0;x<2;x++){ vec2 d=vec2(x,y); vec2 uv=(b+d+.5)*uV.zw; float q=textureLod(g3,uv,0.).x; q=q<=0.?1e6:q; vec2 bl=mix(1.-f,f,d); float w=bl.x*bl.y/(abs(q-z)/(z*.03+1.)+.03)+1e-5; a+=textureLod(tVol,uv,0.)*w; ws+=w; } a/=ws; o=vec4(min(c*a.a+a.rgb,vec3(400.)),1.); }`;
const PROBE = `in vec2 vUv; out vec4 o; uniform sampler2D g3; void main(){ float s=0.; for(int y=0;y<6;y++) for(int x=0;x<8;x++){ float z=textureLod(g3,(vec2(x,y)+.5)/vec2(8.,6.),0.).x; z=z<=0.?1e5:z; s+=1./(z*z); } float c=textureLod(g3,vec2(.5),0.).x; o=vec4(c<=0.?1e5:c,sqrt(48./s),0.,1.); }`;
// the film's bloom chain (fifteen passes) folded into two: one shrink, a mip chain, one pass that sums every level with the chain's own weights
const BSUM = /* glsl */`
in vec2 vUv; out vec4 o; uniform sampler2D t; uniform vec2 uT; uniform float uR,uMix;
vec3 tent(float l){ vec2 e=uT*exp2(l)*uR; vec3 s=textureLod(t,vUv,l).rgb*.25; for(int i=0;i<4;i++){ vec2 a=i==0?vec2(1,0):i==1?vec2(-1,0):i==2?vec2(0,1):vec2(0,-1); vec2 b=i==0?vec2(1,1):i==1?vec2(-1,1):i==2?vec2(1,-1):vec2(-1,-1); s+=textureLod(t,vUv+a*e,l).rgb*.125+textureLod(t,vUv+b*e,l).rgb*.0625; } return s; }
void main(){ float m=uMix,k=m*m; vec3 s=tent(0.)*(1.-k); for(int l=1;l<6;l++){ s+=tent(float(l))*(k*(1.-m)); k*=m; } s+=tent(6.)*k; o=vec4(s,1.); }`;
const MIX2 = `in vec2 vUv; out vec4 o; uniform sampler2D t; uniform float uK; void main(){ o=vec4(textureLod(t,vUv,0.).rgb*uK,1.); }`;

export class Realtime {
  constructor(E) {
    this.E = E; const G = E.G, d = E.env.decl; this.pT = G.prog('taau', G.FSQ, COMMON + d + RAY + TAAU); this.pC = G.prog('combRT', G.FSQ, COMMON + d + COMB); this.pM = G.prog('scale', G.FSQ, MIX2); this.pP = G.prog('probe', G.FSQ, PROBE); this.pB = G.prog('bsum', G.FSQ, BSUM); this.tP = G.tex2D(1, 1, 'rgba32f'); this.fP = G.fbo([this.tP]);
    prepare(E); this.n = 0; this.reset = true; this.L0 = this.L1 = null; this.q = { steps: 72, fog: 18, taps: 4, ao: 9, refl: true }; this.sunKey = ''; this.depth = 1e3; this.near = 1e3; this.pbo = null;
  }
  // out: canvas pixels; scale: internal / out
  size(ow, oh, scale) {
    const E = this.E, gl = E.gl, G = E.G; const cv = this.cv; const s = Math.min(1, Math.max(scale, 200 / Math.min(ow, oh))), iw = Math.round(ow * s / 2) * 2, ih = Math.round(oh * s / 2) * 2; if (cv.width !== ow || cv.height !== oh) { cv.width = ow; cv.height = oh; }
    if (E.W !== iw || E.H !== ih) E.resize(iw, ih);
    if (!this.h || this.h[0].w !== ow || this.h[0].h !== oh) { for (const t of this.h || []) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.f.fb); } this.h = [0, 1].map(() => { const t = G.tex2D(ow, oh, 'rgba16f'); t.f = G.fbo([t]); return t; }); }
    this.ow = ow; this.oh = oh; this.scale = scale; this.reset = true;
  }
  shadow(i) { const E = this.E, gl = E.gl; gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.GREATER); gl.clearDepth(0); gl.disable(gl.CULL_FACE); gl.colorMask(false, false, false, false); E.G.bind(E.sh[i].f); gl.clear(gl.DEPTH_BUFFER_BIT); E.P.gd.use({ uLVP: E.L[i].VP, uDepthOnly: 1, tPath: E.tPath, tW: E.noise.tW }); E.drawAll(E.P.gd, i ? 'sh1' : 'sh0'); gl.colorMask(true, true, true, true); gl.enable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST); }
  applyL(e) { const E = this.E, A = E.L[0], B = E.L[1], U = E.env; U.set('uSh0', A.VP); U.set('uSh1', B.VP); U.set('uShP', [1 / E.SZ, 1 / E.SZ, (A.tex * 1.2 + .03) / A.dist, (B.tex * 1.2 + .05) / B.dist]); U.set('uMap', [e.map, A.tex, B.tex, 0]); }
  frame(cam, e, t) {
    const E = this.E, gl = E.gl, G = E.G, P = E.P, q = this.q; const n = this.n++; const cb = E.camBasis(cam);
    const k = n % 32; const j = [(halton(k + 1, 2) - .5) * 2 / E.W, (halton(k + 1, 3) - .5) * 2 / E.H]; const seed = (n * .61803398875) % 1, si = n % 64;
    const sp = e.sun.pos; gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); E.setEnv(e, sp);
    const sk = sp.map(x => Math.round(x / 40)).join(); const moved = sk !== this.sunKey; this.sunKey = sk; const u0 = !this.L0 || n % q.sh0 === 0, u1 = !this.L1 || moved && n % 3 === 1 || n % q.sh1 === 1; if (u0) this.L0 = E.L[0]; if (u1) this.L1 = E.L[1]; E.L = [this.L0, this.L1]; this.applyL(e);
    const ry = e.reflect; const refl = q.refl && ry !== null && ry !== undefined && cam.pos[1] > ry && cam.pos[1] < ry + 900 && Math.abs(cam.pos[0]) < 5600 && Math.abs(cam.pos[2]) < 6400 ? 1 : 0, doR = refl && (n % q.reflEvery === 0 || this.reset || !this.hadR); this.hadR = refl;
    if (u0) this.sunL = sp; E.sunAt = this.sunL; fillRT(E, cb, { ref: doR ? ry : null, sh0: u0 ? this.L0 : null, sh1: u1 });
    E.setCam(cb, j[0], j[1], null, t, seed, si); E.env.upload(); if (u0) this.shadow(0); if (u1) this.shadow(1);
    if (u1 || n % q.cls === 2 || !this.cl0) { this.cl0 = true; G.bind(E.fClS); if (e.clouds) { const L = this.L1; P.clShadow.use({ uLR: v3.mul(L.r, L.t), uLU: v3.mul(L.u, L.t), uLF: L.f, ...E.nTex() }); G.fsq(); } else gl.clearBufferfv(gl.COLOR, 0, [0, 1e6, 1e6, 0]); }
    if (doR) { E.setCam(cb, j[0], j[1], null, t, seed, si, ry); E.env.upload(); E.gpass(E.gbR, 'ref', true, ry); const g = E.gbR.t; G.bind(E.fRefL); P.light.use({ g0: g[0], g1: g[1], g2: g[2], g3: g[3], tAO: E.white(), tRef: E.white(), tW: E.noise.tW, ...E.nTex(), uRefl: 0, uContact: 0, uDec: 1, uTaps: 2, uPenum: e.penum, uNPL: Math.min(16, e.lights.length) }); G.fsq(); G.bind(E.fRefV); P.vol.use({ g3: g[3], ...E.nTex(), uSteps: q.steps * .5, uStK: q.stK * 1.4, uFogSteps: 8, uClouds: e.clouds ? 1 : 0, uMir: [1, ry] }); G.fsq(); G.bind(E.fRef); P.comb.use({ tLit: E.tRefL, tVol: E.tRefV, g3: g[3] }); G.fsq(); gl.bindTexture(gl.TEXTURE_2D, E.tRef.tex); gl.generateMipmap(gl.TEXTURE_2D); E.setCam(cb, j[0], j[1], null, t, seed, si); E.env.upload(); }
    E.gpass(E.gb, 'cam', false); const g = E.gb.t; G.bind(E.fAO); P.ao.use({ g1: g[1], g3: g[3], uRad: e.ao.r, uN: q.ao }); G.fsq();
    G.bind(E.fLit); P.light.use({ g0: g[0], g1: g[1], g2: g[2], g3: g[3], tAO: E.tAO, tRef: refl ? E.tRef : E.white(), tW: E.noise.tW, ...E.nTex(), uRefl: refl, uReflY: ry ?? -1e6, uContact: e.contact, uDec: 1, uTaps: q.taps, uPenum: e.penum, uNPL: Math.min(16, e.lights.length) }); G.fsq();
    G.bind(E.fVol); P.vol.use({ g3: g[3], ...E.nTex(), uSteps: q.steps, uStK: q.stK, uFogSteps: q.fog, uClouds: e.clouds ? 1 : 0, uMir: [0, 0] }); G.fsq();
    G.bind(E.fSub); if (E.volScale < 1) this.pC.use({ tLit: E.tLit, tVol: E.tVol, g3: g[3], uV: [E.tVol.w, E.tVol.h, 1 / E.tVol.w, 1 / E.tVol.h] }); else P.comb.use({ tLit: E.tLit, tVol: E.tVol, g3: g[3] }); G.fsq(); E.forward();
    // temporal resolve at output resolution
    const VPu = this.unjit(cb); const src = this.h[n & 1], dst = this.h[(n + 1) & 1]; G.bind(dst.f); this.pT.use({ tCur: E.tSub, tHist: src, g3: g[3], tVolD: E.tVolD, uHVP: this.PVP || VPu, uIn: [E.W, E.H, 1 / E.W, 1 / E.H], uOut: [this.ow, this.oh, 1 / this.ow, 1 / this.oh], uReset: this.reset ? 1 : 0, uMaxN: q.maxN, uLock: this.lock || 0, uK: e.post.exp * 1.4 }); G.fsq(); this.PVP = VPu; this.reset = false; this.cur = dst;
    this.sunUV(cb, sp); this.post(dst, e.post, n % 977); this.probe(cb);
  }
  post(src, p, seed) {
    const E = this.E, G = E.G, gl = E.gl, P = E.P; gl.disable(gl.BLEND); const bw = Math.max(64, Math.round(src.w / 4)), bh = Math.max(64, Math.round(src.h / 4));
    if (!this.bl || this.bl.w !== bw || this.bl.h !== bh) { if (this.bl) for (const t of this.bl.t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.f.fb); } const mk = (o) => { const t = G.tex2D(bw, bh, 'rgba16f', o); t.f = G.fbo([t]); return t; }; this.bl = { w: bw, h: bh, t: [mk({ mips: true }), mk({}), mk({}), mk({})] }; }
    const [A, B, R0, R1] = this.bl.t; G.bind(A.f); P.down.use({ t: src, uT: [1 / src.w, 1 / src.h], uFirst: 1 }); G.fsq(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.tex); gl.generateMipmap(gl.TEXTURE_2D);
    G.bind(B.f); this.pB.use({ t: A, uT: [1 / bw, 1 / bh], uR: p.bloomR ?? 1, uMix: p.bloomMix ?? .72 }); G.fsq();
    let rays = 0, ry = null; if (p.rays && p.rays[0] > 0 && (p.raysUV || E.sunUV)) { const su = p.raysUV || E.sunUV; const [k, len, thr, dec] = p.rays; rays = k * su[2]; if (rays > 0) { const c = [su[0], su[1]]; G.bind(R0.f); P.rays.use({ t: A, uC: c, uLen: len ?? .7, uThr: thr ?? 1.5, uFirst: 1, uSeed2: seed % 91, uDec: dec ?? .965 }); G.fsq(); G.bind(R1.f); P.rays.use({ t: R0, uC: c, uLen: (len ?? .7) * .16, uThr: 0, uFirst: 0, uSeed2: seed % 91 + 7, uDec: 1 }); G.fsq(); G.bind(R0.f); P.rays.use({ t: R1, uC: c, uLen: (len ?? .7) * .035, uThr: 0, uFirst: 0, uSeed2: seed % 91 + 3, uDec: 1 }); G.fsq(); ry = R0; } }
    G.bind(null); gl.viewport(0, 0, E.canvas.width, E.canvas.height);
    P.post.use({ t: src, tBloom: B, tOver: E.over, tRays: ry || E.white(), uRays: rays, uSize: [E.W, E.H], uExp: p.exp, uBloom: p.bloom, uVig: p.vig, uGrain: p.grain, uCA: p.ca, uSeed: seed % 977, uFade: p.fade, uWhite: p.white, uBars: p.bars, uSat: p.sat, uCon: p.con, uLift: p.lift, uGain: p.gain, uTint: p.tint, uOverA: p.over, uTM: p.tm ?? 0 }); G.fsq();
  }
  unjit(cb) { const E = this.E; const P = m4.persp(cb.fov, E.W / E.H, cb.near ?? .5); const F = cb.f, pos = cb.pos; const V = new Float64Array(16); V[0] = cb.r[0]; V[4] = cb.r[1]; V[8] = cb.r[2]; V[1] = cb.u[0]; V[5] = cb.u[1]; V[9] = cb.u[2]; V[2] = -F[0]; V[6] = -F[1]; V[10] = -F[2]; V[12] = -v3.dot(cb.r, pos); V[13] = -v3.dot(cb.u, pos); V[14] = v3.dot(F, pos); V[15] = 1; return m4.mul(P, V); }
  sunUV(c, sp) { const E = this.E, d = v3.sub(sp, c.pos), z = v3.dot(d, c.f); if (z > 0) { const x = v3.dot(d, c.r) / (z * c.tx), y = v3.dot(d, c.u) / (z * c.ty); const off = Math.max(Math.abs(x), Math.abs(y)); E.sunUV = [x * .5 + .5, y * .5 + .5, off < 1 ? 1 : Math.max(0, 1 - (off - 1) / .8)]; } else E.sunUV = null; }
  // distance under the middle of the frame, and a mean over the frame that favours what is near (how close the world is); read back a few frames late (never stalls)
  probe() {
    const E = this.E, gl = E.gl; if (this.fence) { const s = gl.clientWaitSync(this.fence, 0, 0); if (s === gl.ALREADY_SIGNALED || s === gl.CONDITION_SATISFIED) { gl.deleteSync(this.fence); this.fence = null; gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.pbuf); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); this.depth = this.pbuf[0]; this.near = this.pbuf[1]; } return; }
    if (this.n % 4) return; if (!this.pbo) { this.pbo = gl.createBuffer(); this.pbuf = new Float32Array(4); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, 16, gl.STREAM_READ); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); }
    E.G.bind(this.fP); this.pP.use({ g3: E.gb.t[3] }); E.G.fsq(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.fP.fb); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, 0); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  }
  // depth under a point of the screen (uv, origin bottom left); stalls, so only on a click
  pick(u, v) { const E = this.E, gl = E.gl, b = new Float32Array(4); gl.bindFramebuffer(gl.FRAMEBUFFER, E.gb.f.fb); gl.readBuffer(gl.COLOR_ATTACHMENT3); gl.readPixels(clamp(Math.floor(u * E.W), 0, E.W - 1), clamp(Math.floor(v * E.H), 0, E.H - 1), 1, 1, gl.RGBA, gl.FLOAT, b); gl.readBuffer(gl.COLOR_ATTACHMENT0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return b[0]; }
  // still: progressive accumulation on the film path. begin -> step until done
  stillBegin(cam, e, t, N) { const E = this.E, gl = E.gl; E.env.set('uNz', [1, 0, 0, 0]); E.o.volScale = 1; E.resize(this.ow, this.oh); this.freeScale = this.scale; const cb = E.camBasis(cam); E.VP0 = null; E.fill(cb); E.G.bind(E.fAcc); gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]); this.st = { cb, e, t, N, s: 0 }; if (!this.tS || this.tS.w !== this.ow || this.tS.h !== this.oh) { if (this.tS) { gl.deleteTexture(this.tS.tex); gl.deleteFramebuffer(this.tS.f.fb); } this.tS = E.G.tex2D(this.ow, this.oh, 'rgba16f'); this.tS.f = E.G.fbo([this.tS]); } }
  stillStep() {
    const E = this.E, gl = E.gl, G = E.G, S = this.st; const { cb, e, t, N, s } = S; const jx = (halton(s + 1, 2) - .5) * 2 / E.W, jy = (halton(s + 1, 3) - .5) * 2 / E.H; let lens = null; if (cb.ap && cb.focus) { const r = Math.sqrt((s + .5) / N) * cb.ap, th = s * 2.399963; lens = [Math.cos(th) * r, Math.sin(th) * r]; }
    E.sub(e, cb, [jx, jy], lens, t, (s * .61803398875) % 1, s, e.sun.pos, { steps: 150, fog: 40, taps: 6, dec: 0, shadow: s === 0, clShadow: true });
    G.bind(E.fAcc); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); E.P.copy.use({ t: E.tSub, uK: [1, 1, 1, 1] }); G.fsq(); gl.disable(gl.BLEND); S.s++; this.stillShow(); return S.s >= N;
  }
  stillShow() { const E = this.E, G = E.G, S = this.st; G.bind(this.tS.f); this.pM.use({ t: E.tAcc, uK: 1 / Math.max(1, S.s) }); G.fsq(); this.sunUV(S.cb, S.e.sun.pos); E.post(this.tS, S.e.post, 1, null); }
  stillEnd() { const E = this.E; E.env.set('uNz', [0, 0, 0, 0]); this.st = null; E.o.volScale = this.volScale; this.L0 = this.L1 = null; this.size(this.ow, this.oh, this.freeScale); this.cl0 = false; }
}
