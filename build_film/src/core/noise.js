// GPU generated tileable noise volumes and weather map
import { COMMON } from './glsl.js';
const WN = /* glsl */`
vec3 hp(vec3 p,float f){ p=mod(p,f); return h33(p+vec3(11.7,3.1,7.9)); }
float worley(vec3 x,float f){ x*=f; vec3 i=floor(x),r=fract(x); float m=1e9; for(int a=-1;a<=1;a++)for(int b=-1;b<=1;b++)for(int c=-1;c<=1;c++){ vec3 o=vec3(a,b,c); vec3 d=o+hp(i+o,f)-r; m=min(m,dot(d,d)); } return 1.-clamp(sqrt(m),0.,1.); }
vec3 gd(vec3 p,float f){ vec3 h=hp(p,f)*2.-1.; return normalize(h+1e-5); }
float perlin(vec3 x,float f){ x*=f; vec3 i=floor(x),r=fract(x),u=r*r*r*(r*(r*6.-15.)+10.);
 float v=mix(mix(mix(dot(gd(i,f),r),dot(gd(i+vec3(1,0,0),f),r-vec3(1,0,0)),u.x),mix(dot(gd(i+vec3(0,1,0),f),r-vec3(0,1,0)),dot(gd(i+vec3(1,1,0),f),r-vec3(1,1,0)),u.x),u.y),
 mix(mix(dot(gd(i+vec3(0,0,1),f),r-vec3(0,0,1)),dot(gd(i+vec3(1,0,1),f),r-vec3(1,0,1)),u.x),mix(dot(gd(i+vec3(0,1,1),f),r-vec3(0,1,1)),dot(gd(i+vec3(1,1,1),f),r-vec3(1,1,1)),u.x),u.y),u.z); return v; }
float pfbm(vec3 x,float f,int o){ float s=0.,a=1.,n=0.; for(int i=0;i<o;i++){ s+=a*perlin(x,f); n+=a; a*=.55; f*=2.; } return s/n; }
float wfbm(vec3 x,float f){ return worley(x,f)*.625+worley(x,f*2.)*.25+worley(x,f*4.)*.125; }
float remap(float v,float a,float b,float c,float d){ return c+(v-a)/(b-a)*(d-c); }
`;
export function makeNoise(G) {
  const { gl } = G;
  const vs = G.FSQ;
  const pA = G.prog('noiseA', vs, COMMON + WN + `
in vec2 vUv; out vec4 o; uniform float uZ;
void main(){ vec3 p=vec3(vUv,uZ);
 float pf=sat(pfbm(p,4.,5)*.95+.5); float w0=wfbm(p,4.); float pw=sat(remap(pf,w0-1.,1.,0.,1.)*1.0);
 pw=sat(mix(w0,pw,.55)); 
 float w1=wfbm(p,6.),w2=wfbm(p,12.);
 o=vec4(smoothstep(.12,.92,pw),sat(w1*1.15-.05),sat(w2*1.1),sat(pfbm(p+.37,8.,3)*.9+.5)); }`);
  const pB = G.prog('noiseB', vs, COMMON + WN + `
in vec2 vUv; out vec4 o; uniform float uZ;
void main(){ vec3 p=vec3(vUv,uZ); vec3 w=vec3(pfbm(p,4.,2),pfbm(p+.3,4.,2),pfbm(p+.6,4.,2))*.06; p+=w;
 o=vec4(sat(wfbm(p,3.)*1.1),sat(wfbm(p,6.)*1.1),sat(wfbm(p,9.)*1.1),sat(pfbm(p,6.,3)+.5)); }`);
  const pW = G.prog('weather', vs, COMMON + WN + `
in vec2 vUv; out vec4 o;
void main(){ vec3 p=vec3(vUv,.13);
 float c=pfbm(p,4.,6)*.9+.5; float b=wfbm(vec3(vUv,.5),7.); float wx=pfbm(vec3(vUv,.71),5.,5)*.9+.5,wz=pfbm(vec3(vUv,.37),5.,5)*.9+.5;
 o=vec4(sat(c),sat(b*1.08),sat(wx),sat(wz)); }`);
  const render3 = (P, N) => {
    const t = G.tex3D(N, N, N, 'rgba16f', { mips: true }); const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, N, N); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); P.use();
    for (let z = 0; z < N; z++) { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, t.tex, 0, z); P.set({ uZ: (z + .5) / N }); G.fsq(); if (z % 16 === 15) gl.flush(); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
    gl.bindTexture(gl.TEXTURE_3D, t.tex); gl.generateMipmap(gl.TEXTURE_3D); return t;
  };
  const tA = render3(pA, 128), tB = render3(pB, 64);
  const tW = G.tex2D(1024, 1024, 'rgba16f', { mips: true, wrap: 'repeat' });
  const f = G.fbo([tW]); G.bind(f); pW.use(); G.fsq(); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, tW.tex); gl.generateMipmap(gl.TEXTURE_2D);
  return { tA, tB, tW };
}
