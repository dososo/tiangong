// Shared GLSL chunks
export const COMMON = /* glsl */`
#define PI 3.14159265359
#define sat(x) clamp(x,0.,1.)
float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float h21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec3 h33(vec3 p3){ p3=fract(p3*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yxz+33.33); return fract((p3.xxy+p3.yxx)*p3.zyx); }
float h31(vec3 p3){ p3=fract(p3*.1031); p3+=dot(p3,p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
float vn2(vec2 x){ vec2 i=floor(x),f=fract(x); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float vn3(vec3 x){ vec3 i=floor(x),f=fract(x); f=f*f*(3.-2.*f); return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm2(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*vn2(p); p=mat2(1.6,1.2,-1.2,1.6)*p+17.3; a*=.5;} return s; }
float fbm3(vec3 p){ float s=0.,a=.5; for(int i=0;i<4;i++){ s+=a*vn3(p); p=p*2.03+vec3(7.1,3.3,5.7); a*=.5;} return s; }
float hg(float mu,float g){ float g2=g*g; return (1.-g2)/(4.*PI*pow(max(1.+g2-2.*g*mu,1e-4),1.5)); }
float ign(vec2 p,float s){ p+=5.588238*s; return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715)))); }
vec2 r2(float n){ return fract(vec2(.7548776662,.5698402909)*n+.5); }
float luma(vec3 c){ return dot(c,vec3(.2126,.7152,.0722)); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
`;

// env fields for the UBO
export const ENV_FIELDS = [
  'uView:mat4', 'uProj:mat4', 'uVP:mat4', 'uPVP:mat4',
  'uCamP:vec4', 'uCamR:vec4', 'uCamU:vec4', 'uCamF:vec4', 'uCamZ:vec4', 'uRes:vec4', 'uJit:vec4',
  'uSunP:vec4', 'uSunC:vec4', 'uSunD:vec4', 'uL2P:vec4', 'uL2C:vec4',
  'uSkyZ:vec4', 'uSkyM:vec4', 'uSkyH:vec4', 'uSkyN:vec4', 'uGlowA:vec4', 'uGlowB:vec4', 'uBand:vec4', 'uStar:vec4', 'uHalo:vec4',
  'uAmbU:vec4', 'uAmbD:vec4', 'uAmbS:vec4',
  'uFog0:vec4', 'uFog1:vec4', 'uFog2:vec4', 'uFog3:vec4',
  'uCl0:vec4', 'uCl1:vec4', 'uCl2:vec4', 'uCl3:vec4', 'uCl4:vec4', 'uCl5:vec4', 'uCl6:vec4',
  'uSh0:mat4', 'uSh1:mat4', 'uShP:vec4', 'uMap:vec4', 'uPL[16]:vec4', 'uPC[16]:vec4', 'uMisc:vec4', 'uMisc2:vec4', 'uCl7:vec4', 'uCl8:vec4', 'uCl9:vec4', 'uCl10:vec4', 'uCl11:vec4', 'uCl12:vec4', 'uNz:vec4',
];

// blue noise; uNz.x: in use (many sub-frames), uNz.y: frame number
export const BNZ = /* glsl */`uniform sampler2D tBN; float bn(vec2 p){ return (texelFetch(tBN,ivec2(floor(p+128.*fract(uNz.y*vec2(.7548777,.5698403))))&127,0).r*255.+.5)/256.; }
`;
export const RAY = /* glsl */`
float sunFall(vec3 p){ if(uSunD.x<=0.) return 1.; vec3 d=p-uSunP.xyz; return 1./(1.+dot(d,d)/(uSunD.x*uSunD.x)); }
vec3 rayDir(vec2 uv){ vec2 n=uv*2.-1.-uJit.xy; return uCamF.xyz+uCamR.xyz*n.x+uCamU.xyz*n.y; } // not normalized, length along view axis = 1
`;

export const SKY = /* glsl */`
uniform sampler2D tW;
// analytic sky: smooth version (rough reflections) and full version
vec3 skyBase(vec3 d){
  float y=d.y;
  vec3 c=mix(uSkyH.rgb,uSkyM.rgb,smoothstep(0.,uSkyH.w,y));
  c=mix(c,uSkyZ.rgb,smoothstep(uSkyH.w*.5,uSkyZ.w,y));
  c=mix(c,uSkyN.rgb,smoothstep(uSkyN.w,-uSkyN.w*2.,y));
  return c;
}
vec3 skyGlow(vec3 d,float rough){
  vec3 sd=normalize(uSunP.xyz-uCamP.xyz); float mu=max(dot(d,sd),0.);
  vec3 c=uGlowA.rgb*pow(mu,uGlowA.w);
  float e=uGlowB.w/(1.+rough*rough*uGlowB.w*1.2);
  c+=uGlowB.rgb*pow(mu,e)*(e/uGlowB.w);
  float az=sat(dot(normalize(d.xz+1e-4),normalize(sd.xz+1e-4))*.5+.5);
  c+=uBand.rgb*exp(-abs(d.y-.0)*uBand.w)*pow(az,3.);
  return c;
}
vec3 envCol(vec3 d,float rough){ return skyBase(normalize(d))+skyGlow(normalize(d),rough); }
// --- stars -----------------------------------------------------------------
float starCell(vec3 d,float scale,float thr,out float tw){
  vec3 a=abs(d); vec2 uv; float face;
  if(a.x>a.y&&a.x>a.z){ uv=d.yz/a.x; face=d.x>0.?0.:1.; } else if(a.y>a.z){ uv=d.xz/a.y; face=d.y>0.?2.:3.; } else { uv=d.xy/a.z; face=d.z>0.?4.:5.; }
  uv*=scale; vec2 id=floor(uv); vec2 r=h22(id+face*71.7); tw=h21(id+face*13.1+3.7);
  if(tw<thr) return 0.;
  vec2 f=fract(uv)-(.2+.6*r); float px=uRes.w*length(uCamU.xyz)*2.*scale;
  float sz=max(px*.75,.018*(0.4+tw)); float dd=length(f);
  return smoothstep(sz,0.,dd)*pow(min(1.,.02/px+.35),1.);
}
vec3 stars(vec3 d){
  float tw; vec3 c=vec3(0.);
  float s1=starCell(d,55.,.72,tw); float m1=pow(fract(tw*47.),3.); c+=s1*mix(vec3(.75,.85,1.),vec3(1.,.86,.66),fract(tw*91.))*(.25+2.2*m1);
  float s2=starCell(d.yzx,130.,.55,tw); float m2=pow(fract(tw*57.),4.); c+=s2*mix(vec3(.8,.88,1.),vec3(1.,.9,.75),fract(tw*71.))*(.12+.9*m2);
  float s3=starCell(d.zxy,310.,.4,tw); c+=s3*vec3(.85,.9,1.)*.16;
  return c;
}
// the Heavenly River: a luminous, braided band
vec3 tianhe(vec3 d){
  vec3 ax=normalize(vec3(.52,.42,.18)); float lat=dot(d,ax); 
  vec3 t1=normalize(cross(ax,vec3(0,1,0))),t2=cross(ax,t1); float lon=atan(dot(d,t2),dot(d,t1));
  vec2 q=vec2(lon*3.,lat*6.);
  float n1=fbm2(q*1.3+3.), n2=fbm2(q*3.1+vec2(n1*2.,9.)), n3=fbm2(q*8.+n2*3.);
  float w=lat+ (n1-.5)*.16; float core=exp(-w*w*52.), wide=exp(-w*w*13.);
  float dust=smoothstep(.42,.75,n2*.65+n3*.4)*exp(-w*w*120.);
  vec3 c=mix(vec3(.20,.30,.46),vec3(.95,.80,.58),core*.75)*(wide*.28+core*(.35+1.1*n3));
  c*=1.-.82*dust; 
  return c;
}
vec3 dipper(vec3 d); 
// 22-degree halo, parhelia and upper tangent arc around the sun
vec3 halo(vec3 d){
  if(uHalo.x<=0.) return vec3(0.);
  vec3 sd=normalize(uSunP.xyz-uCamP.xyz); float mu=dot(d,sd); float ang=acos(clamp(mu,-1.,1.))*57.29578;
  float R=uHalo.y; vec3 c=vec3(0.);
  // ring: sharp red inner edge, soft outer blue
  vec3 off=vec3(0.,.35,.75)*uHalo.z;
  vec3 x=(vec3(ang)-R-off)/vec3(1.05,1.15,1.35);
  vec3 ring=exp(-x*x)*step(vec3(0.),x)+exp(-x*x*9.)*step(x,vec3(0.));
  ring+=.22*exp(-max(x,0.)*.42)*step(vec3(0.),x);
  c+=ring*vec3(1.,.95,.9);
  // second 46-degree ring, faint
  vec3 x2=(vec3(ang)-R*2.09-off*1.6)/vec3(1.6); c+=.18*exp(-x2*x2);
  // parhelia (sundogs) and parhelic circle
  vec3 rt=normalize(cross(sd,vec3(0,1,0))); vec3 up=cross(rt,sd);
  float lx=dot(d,rt)/max(mu,.05), ly=dot(d,up)/max(mu,.05); float tx=abs(lx);
  float dog=tan(radians(R+1.2)); vec3 dx=(vec3(tx)-dog-vec3(0.,.008,.02))/vec3(.016,.02,.045);
  float pw=1.-uHalo.w; c+=pw*2.2*exp(-dx*dx)*exp(-ly*ly*1400.)*step(0.,mu);
  c+=pw*.28*exp(-ly*ly*9000.)*smoothstep(0.02,.2,tx)*exp(-tx*1.1)*step(0.,mu);
  // light pillar
  c+=pw*.5*exp(-lx*lx*5200.)*exp(-abs(ly)*3.2)*step(0.,mu);
  // upper tangent arc
  float arc=ly-(tan(radians(R+.3))+lx*lx*1.15); c+=pw*1.1*exp(-arc*arc*3200.)*exp(-lx*lx*16.)*step(0.,mu);
  return c*uHalo.x*uSunC.rgb;
}
float cirrusT(vec3 d){
  if(d.y<.015) return 0.; vec2 q=d.xz/(d.y+.12)*1.1+uCl1.xy*2e-5; 
  vec2 w=textureLod(tW,q*.09,0.).ba-.5; q+=w*1.2;
  float n=textureLod(tW,q*vec2(.16,.045),0.).r*.6+textureLod(tW,q*vec2(.5,.12)+.3,0.).r*.4+(textureLod(tW,q*vec2(1.7,.5),0.).g-.5)*.18;
  return smoothstep(.46,.9,n)*smoothstep(.015,.25,d.y);
}
vec3 skyFull(vec3 d){
  vec3 c=skyBase(d); vec3 g=skyGlow(d,0.);
  float night=uStar.x;
  if(d.y>-.05||uStar.z<0.){
    float ext=mix(smoothstep(-.02,.28,d.y),1.,sat(-uStar.z*3.));
    if(night>0.) c+=stars(d)*night*ext;
    if(uStar.y>0.) c+=tianhe(d)*uStar.y*ext;
    c+=dipper(d)*uStar.w*ext;
    float ci=cirrusT(d)*max(uStar.z,0.); 
    vec3 sd=normalize(uSunP.xyz-uCamP.xyz); float mu=max(dot(d,sd),0.);
    vec3 cc=uGlowA.rgb*(.25+1.3*pow(mu,3.))+uSkyM.rgb*.8+uBand.rgb*.35*pow(mu,2.);
    c=mix(c,c*.55+cc,ci*.8);
  }
  return c+g+halo(d);
}
// Big Dipper, true proportions (RA/Dec of the seven stars), placed above the palace
vec3 dipper(vec3 d){
  if(uStar.w<=0.) return vec3(0.);
  vec3 c=vec3(0.); vec2 P[7]; P[0]=vec2(165.93,61.75);P[1]=vec2(165.46,56.38);P[2]=vec2(178.46,53.69);P[3]=vec2(183.86,57.03);P[4]=vec2(193.51,55.96);P[5]=vec2(200.98,54.93);P[6]=vec2(206.89,49.31);
  vec2 ctr=vec2(185.,55.5); 
  vec3 f=normalize(vec3(uMisc.x,uMisc.y,uMisc.z)); vec3 r=normalize(cross(f,vec3(0,1,0))),u=cross(r,f);
  for(int i=0;i<7;i++){ vec2 q=(P[i]-ctr)*vec2(-cos(radians(55.5)),1.)*uMisc.w; q=rot(.35)*q; vec3 sd=normalize(f+r*tan(radians(q.x))+u*tan(radians(q.y)));
    float a=acos(clamp(dot(d,sd),-1.,1.)); float s=.00075; c+=vec3(1.,.95,.82)*(exp(-a*a/(s*s))*9.+exp(-a/(s*3.4))*.5); }
  return c;
}
`;

export const CLOUD = /* glsl */`
uniform sampler3D tA; uniform sampler3D tB; uniform sampler2D tM;
// uCl7,uCl8: cloud belts round the hall (R,Y,a,b)  uCl9: gate, softness, drift
// uCl0: seaTop, topVariation, falloff, sigma   uCl1: windx, windz, scale, detail   uCl2: ambient, sunOD, powder, baseY
// uCl3: swirl cx, cz, radius, strength         uCl4: hole cx, cz, radius, depth    uCl5: moundScale, edge, silver, iridescence  uCl6: maxTop, time, evolve, -
vec2 swirl(vec2 p){
  if(uCl3.w==0.) return p; vec2 d=p-uCl3.xy; float r=length(d)/uCl3.z; float a=uCl3.w*exp(-r*1.1)*(1.+.35*sin(r*6.)); return uCl3.xy+rot(a)*d;
}
float seaTop(vec2 xz,out vec2 q){
  q=swirl(xz)+uCl1.xy; float sc=uCl1.z;
  vec4 W=textureLod(tW,q/(9300.*sc),0.); vec4 W2=textureLod(tW,q.yx/(3700.*sc)+.37,0.);
  q+=((W.ba-.5)*820.+(W2.ba-.5)*260.)*sc;
  float mound=textureLod(tM,xz/uMap.x+.5,0.).r;
  float top=uCl0.x+((W.r-.5)*1.5+(W2.g-.5)*.55)*uCl0.y+mound*uCl5.x;
  if(uCl4.z>0.){ float r=length(xz-uCl4.xy)/uCl4.z; top-=uCl4.w*exp(-r*r); top+=uCl4.w*.05*exp(-(r-1.5)*(r-1.5)*3.); }
  return top;
}
// signed profile: <0 outside. Units: fraction of falloff
float cloudProfile(vec3 p,out vec2 q){ float top=seaTop(p.xz,q); return (top-p.y)/uCl0.z; }
float cloudShape(vec3 p,vec2 q,float prof,float lod){
  float sc=uCl1.z; vec3 s=vec3(q.x,p.y*1.25+uCl6.y*uCl6.z,q.y)/sc;
  float n=textureLod(tA,s/2100.,lod).r; float n2=textureLod(tA,s.zxy/790.+.31,lod+1.).g;
  float k=(1.-n)*.95+(1.-n2)*.32;
  return min(prof,1.25)-k;
}
float cloudDetail(vec3 p,vec2 q,float d,float lod){
  float sc=uCl1.z; vec3 s=vec3(q.x,p.y*1.15+uCl6.y*uCl6.z*1.6,q.y)/sc;
  vec4 e=textureLod(tB,s/410.,lod+.5); float det=e.r*.55+e.g*.3+e.b*.15;
  float w=uCl1.w*(1.-smoothstep(.0,.55,d));
  d-=(1.-det)*w;
  if(lod<.9){ float e2=textureLod(tB,s.yzx/93.+e.rgb*.12,lod).g; d-=(1.-e2)*w*.30*(1.-sat(lod/.9)); }
  return d;
}
float baseFade(float y){ return smoothstep(uCl2.w,uCl2.w+140.,y); }
float cloudFull(vec3 p,float lod){ vec2 q; float pr=cloudProfile(p,q); if(pr<0.) return 0.; float d=cloudShape(p,q,pr,lod); if(d<-.02) return 0.; d=cloudDetail(p,q,d,lod); return smoothstep(0.,uCl5.y,d)*baseFade(p.y); }
float cloudCheap(vec3 p,float lod){ vec2 q; float pr=cloudProfile(p,q); if(pr<0.) return 0.; float d=cloudShape(p,q,pr,lod)-uCl1.w*.32; return smoothstep(0.,uCl5.y+.1,d)*baseFade(p.y); }
float cloudOD(vec3 p,vec3 l,float jit){
  float t=0.,od=0.,st=16.; 
  for(int i=0;i<6;i++){ vec3 x=p+l*(t+st*(.25+.6*jit)); if(x.y>uCl6.x||x.y<uCl2.w) break; od+=cloudCheap(x,1.+float(i)*.5)*st; t+=st; st*=2.05; }
  return od*uCl0.w;
}
`;

export const FOG = /* glsl */`
// uFog0: density, baseHeight, falloff, g   uFog1: ambient rgb, constDensity   uFog2: noiseAmt, vapourAmt, shadowContrast, maxDist  uFog3: vapour color, bandAmt
float fogDen(vec3 p){
  float h=max(p.y-uFog0.y,0.); float d=uFog0.x*exp(-h/uFog0.z)+uFog1.w;
  if(uFog2.x>0.){ float n=textureLod(tA,vec3(p.x,p.y*2.2,p.z)/5200.+vec3(uCl1.x,0.,uCl1.y)/9000.,1.).r; float n2=textureLod(tA,vec3(p.z,p.y*3.,p.x)/1500.+.5+vec3(uCl1.y,uCl6.y*.001,uCl1.x)/6000.,1.).r; 
    d*=mix(1.,smoothstep(.25,.95,n*.6+n2*.4)*2.1,uFog2.x); }
  return d;
}
// veils of cloud that belt the tiers of the great hall: uCl7,uCl8 = (R,Y,a,b), uCl9 = (gate, softness, drift, density)
float beltD(vec3 p,vec4 B){ if(B.w<=0.) return 0.; p.xz-=uCl11.xy; float r=length(p.xz); float a=atan(p.x,p.z); float yo=B.y+B.w*.5*sin(a*3.+B.x)+B.w*.4*sin(a*5.+2.+uCl9.z*.6); vec2 d=vec2((r-B.x)/B.z,(p.y-yo)/B.w); float v=exp(-dot(d,d)*1.6); if(v<.02) return 0.; float ca=cos(uCl9.z),sa=sin(uCl9.z); vec3 q=vec3(p.x*ca-p.z*sa,p.y*1.9,p.x*sa+p.z*ca); float n=textureLod(tA,q/1500.,0.).r*.62+textureLod(tA,q.zxy/430.+.3,0.).g*.30+(textureLod(tB,q/170.,0.).r-.5)*.22; return v*smoothstep(uCl9.x,uCl9.x+uCl9.y,n*(.75+.4*v)); }
float beltDen(vec3 p){ return (beltD(p,uCl7)+beltD(p,uCl8))*uCl9.w; }
// rising threads of auspicious vapour
float vapour(vec3 p){
  if(uFog2.y<=0.) return 0.;
  vec2 q=p.xz+ (textureLod(tW,vec2(p.y*.00022,p.x*.00004),0.).ba-.5)*220.; float y=p.y*.00035-uCl6.y*.004;
  float a=textureLod(tW,q/2600.+vec2(0.,y*.15),0.).r, b=textureLod(tW,q.yx/760.+.21+vec2(y*.2,0.),0.).g;
  float n=smoothstep(.5,.78,a)*pow(b,3.); float h=smoothstep(-60.,120.,p.y)*exp(-max(p.y,0.)/1400.);
  return n*h*uFog2.y;
}
`;

export const SHADOW = /* glsl */`
uniform sampler2D tS0; uniform sampler2D tS1; uniform sampler2D tClS;
float shTap(sampler2D s,vec2 uv,float z){ return step(textureLod(s,uv,0.).r,z); }
// soft shadow, rotated poisson; reversed depth: larger z = nearer to the light
float shadowAt(vec3 X,vec3 Nn,float rnd,float rad,int taps){
  vec3 wp=X+Nn*uMap.y*1.7; vec4 c=uSh0*vec4(wp,1.); vec3 q=c.xyz/c.w; vec2 uv=q.xy*.5+.5; 
  bool in0=c.w>0.&&all(greaterThan(uv,vec2(.004)))&&all(lessThan(uv,vec2(.996)));
  float s=0.; float a=rnd*6.2831853; 
  if(in0){ float z=q.z*(1.+uShP.z); for(int i=0;i<taps;i++){ float r=sqrt((float(i)+.5)/float(taps)); float th=a+float(i)*2.399963; s+=shTap(tS0,uv+vec2(cos(th),sin(th))*r*rad*uShP.x,z); } return s/float(taps); }
  wp=X+Nn*uMap.z*1.5; c=uSh1*vec4(wp,1.); q=c.xyz/c.w; uv=q.xy*.5+.5;
  if(c.w>0.&&all(greaterThan(uv,vec2(.002)))&&all(lessThan(uv,vec2(.998)))){ float z=q.z*(1.+uShP.w); for(int i=0;i<taps;i++){ float r=sqrt((float(i)+.5)/float(taps)); float th=a+float(i)*2.399963; s+=shTap(tS1,uv+vec2(cos(th),sin(th))*r*rad*uShP.y,z); } return s/float(taps); }
  return 1.;
}
float shadow1(vec3 wp){
  vec4 c=uSh0*vec4(wp,1.); vec3 q=c.xyz/c.w; vec2 uv=q.xy*.5+.5; 
  if(c.w>0.&&all(greaterThan(uv,vec2(.004)))&&all(lessThan(uv,vec2(.996)))) return shTap(tS0,uv,q.z*(1.+uShP.z));
  c=uSh1*vec4(wp,1.); q=c.xyz/c.w; uv=q.xy*.5+.5; if(c.w>0.&&all(greaterThan(uv,vec2(.002)))&&all(lessThan(uv,vec2(.998)))) return shTap(tS1,uv,q.z*(1.+uShP.w));
  return 1.;
}
// n taps spread over a disc of R texels, turned by a and shifted by u: a cloud gathers these into a soft edge over its march and over the sub-frames
float shadowD(vec3 wp,float a,float u,float R,int n){
  vec4 c=uSh0*vec4(wp,1.); vec3 q=c.xyz/c.w; vec2 uv=q.xy*.5+.5; bool nr=c.w>0.&&all(greaterThan(uv,vec2(.004)))&&all(lessThan(uv,vec2(.996)));
  if(!nr){ c=uSh1*vec4(wp,1.); q=c.xyz/c.w; uv=q.xy*.5+.5; if(c.w<=0.||any(lessThan(uv,vec2(.002)))||any(greaterThan(uv,vec2(.998)))) return 1.; }
  float px=nr?uShP.x:uShP.y,z=q.z*(1.+(nr?uShP.z:uShP.w)),s=0.; for(int k=0;k<n;k++){ float f=float(k),th=a+f*2.3999632; vec2 o=vec2(cos(th),sin(th))*R*sqrt((f+u)/float(n))*px; s+=nr?shTap(tS0,uv+o,z):shTap(tS1,uv+o,z); } return s/float(n);
}
// cloud optical depth between the light and a point
float cloudShadow(vec3 wp){
  vec4 c=uSh1*vec4(wp,1.); vec2 uv=c.xy/c.w*.5+.5; if(c.w<=0.) return 1.;
#ifdef FLIN
  vec4 m=textureLod(tClS,clamp(uv,vec2(.002),vec2(.998)),0.);
#else
  vec2 sz=vec2(textureSize(tClS,0)),p=clamp(uv,vec2(.002),vec2(.998))*sz-.5; ivec2 b=ivec2(floor(p)); vec2 fr=fract(p); vec4 m=mix(mix(texelFetch(tClS,b,0),texelFetch(tClS,b+ivec2(1,0),0),fr.x),mix(texelFetch(tClS,b+ivec2(0,1),0),texelFetch(tClS,b+ivec2(1,1),0),fr.x),fr.y);
#endif
  float d=distance(wp,uSunP.xyz);
  float f=smoothstep(m.y,max(m.z,m.y+1.),d); return exp(-m.x*f);
}
`;
