import { COMMON, RAY, SKY, CLOUD, FOG, SHADOW, BNZ } from './glsl.js';
export const makePasses = (G, env) => {
  const vs = G.FSQ; const H = COMMON + env + RAY;
  const P = {};
  P.ao = G.prog('ao', vs, H + /* glsl */`
in vec2 vUv; out vec4 o; uniform sampler2D g1,g3; uniform float uRad,uN;
void main(){ vec4 d=textureLod(g3,vUv,0.); if(d.x<=0.){ o=vec4(1.); return; } vec3 N=textureLod(g1,vUv,0.).xyz; vec3 X=uCamP.xyz+rayDir(vUv)*d.x; 
 float px=.5/(length(uCamU.xyz)*d.x); float rn=ign(gl_FragCoord.xy,uJit.z*37.+uJit.w); float a0=rn*6.2831853; float s=0.,w=0.; float rj=h21(gl_FragCoord.xy+uJit.zw*71.);
 for(float i=0.;i<uN;i+=1.){ float u=(i+rj)/uN; float r=uRad*mix(.05,1.,u*u); float rp=clamp(r*px,1.5*uRes.w,.22); float th=a0+i*2.399963; vec2 uv=vUv+vec2(cos(th)*uRes.y/uRes.x,sin(th))*rp; if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))) continue; float z=textureLod(g3,uv,0.).x; w+=1.; if(z<=0.) continue; vec3 v=uCamP.xyz+rayDir(uv)*z-X; float vv=dot(v,v); float vn=dot(v,N); float ro=max(r*1.35,.02); float f=max(0.,1.-vv/(ro*ro*4.)); s+=max(0.,vn/sqrt(vv+1e-6)-.04-.0006*d.x/max(r,.5)*.0)*f; }
 float ao=w>0.?1.-1.55*s/w:1.; o=vec4(sat(ao)); }`);

  const LIGHT = /* glsl */`
vec3 envBRDF(vec3 f0,float r,float nv){ vec4 c0=vec4(-1.,-.0275,-.572,.022),c1=vec4(1.,.0425,1.04,-.04); vec4 q=r*c0+c1; float a004=min(q.x*q.x,exp2(-9.28*nv))*q.x+q.y; vec2 ab=vec2(-1.04,1.04)*a004+q.zw; return f0*ab.x+ab.y; }
float dGGX(float nh,float a){ float a2=a*a; float f=(nh*a2-nh)*nh+1.; return a2/(PI*f*f+1e-7); }
float vSmith(float nv,float nl,float a){ float k=a*.5; return .25/((nv*(1.-k)+k)*(nl*(1.-k)+k)+1e-5); }
vec3 ambient(vec3 n){ float u=n.y*.5+.5; vec3 c=mix(uAmbD.rgb,uAmbU.rgb,smoothstep(.05,.95,u)); vec3 az=normalize(vec3(uSunP.x-uCamP.x,0.,uSunP.z-uCamP.z)+1e-4); float s=dot(n,az)*.5+.5; c+=uAmbS.rgb*s*s; return c; }
float gF0=.045;
vec3 brdf(vec3 N,vec3 V,vec3 L,vec3 alb,float met,float rg,float sss,float sh,float thick,vec3 lc){
  float nl=dot(N,L); float nv=max(dot(N,V),.02); vec3 H=normalize(L+V); float nh=max(dot(N,H),0.),vh=max(dot(V,H),0.); float a=max(rg*rg,.004); vec3 f0=mix(vec3(gF0),alb,met); vec3 dif=alb*(1.-met); float wr=sss*.45; float d=sat((nl+wr)/((1.+wr)*(1.+wr))); vec3 F=f0+(1.-f0)*pow(1.-vh,5.); vec3 sp=F*dGGX(nh,a)*vSmith(nv,max(nl,0.),a)*PI*max(nl,0.); sp=min(sp,vec3(5.));
  float tr=sss*(.30*pow(sat(dot(V,-L)),3.)+.22*sat(-nl))*thick; return lc*((dif*d+sp)*sh+dif*tr*mix(sh,1.,.25)); }
`;
  P.light = G.prog('light', vs, H + SKY + SHADOW + LIGHT + /* glsl */`
in vec2 vUv; out vec4 o; uniform sampler2D g0,g1,g2,g3,tAO,tRef; uniform float uRefl,uReflY,uContact,uTaps,uPenum,uDec; uniform int uNPL; uniform vec4 uGround;
float contact(vec3 X,vec3 L,float z){ if(uContact<=0.) return 1.; float len=uContact*(1.+z*.012); float j=ign(gl_FragCoord.xy,uJit.z*53.+uJit.w); float occ=0.; for(int i=0;i<9;i++){ vec3 q=X+L*len*pow((float(i)+j)/9.,1.5); vec4 c=uVP*vec4(q,1.); if(c.w<=0.) break; vec2 uv=c.xy/c.w*.5+.5; if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))) break; float zs=textureLod(g3,uv,0.).x; float dz=c.w-zs; if(zs>0.&&dz>.02+z*.0012&&dz<len*.55+.1){ occ=1.; break; } } return 1.-occ; }
void main(){
  vec4 d=g3dec(textureLod(g3,vUv,0.)); vec3 rdv=rayDir(vUv); vec3 rd=normalize(rdv);
  if(d.x<=0.){ o=vec4(skyFull(rd),0.); return; }
  vec4 a=textureLod(g0,vUv,0.),b=textureLod(g1,vUv,0.),e=textureLod(g2,vUv,0.); vec3 alb=a.rgb*a.rgb; float met=a.a; vec3 N=normalize(b.xyz); float rg=b.w; float gao=e.a; float sss=d.y; float flag=d.z;
  vec3 X=uCamP.xyz+rdv*d.x; vec3 V=-rd; float ssao=textureLod(tAO,vUv,0.).r; float ao=gao*ssao; if(flag>2.5){ ao=1.; } int mid=int(d.w+.5); if(mid==1||mid==20) gF0=.12;
  if(flag>2.5){ vec3 c=e.rgb; if(int(d.w+.5)==13){ vec3 L=normalize(uSunP.xyz-X); c=alb*(uSunC.rgb*sat(dot(N,L))*.9+uAmbU.rgb*.15)+e.rgb; } o=vec4(c,d.x); return; }
  vec3 L=uSunP.xyz-X; float Ld=length(L); L/=Ld; float nl=dot(N,L);
  float bias=.06+d.x*.0011; float rn=uDec>.5?ign(gl_FragCoord.xy,uJit.z*91.+uJit.w):fract(uJit.w*.61803399+uJit.z+ign(gl_FragCoord.xy,0.)*.04); float sh=0.; // many sub-frames: one turn for all pixels, so nothing is left to pattern
  if(nl>-.5*sss||sss>.0){ sh=shadowAt(X+L*bias*.2,nl<0.?-N:N,rn,uPenum,int(uTaps)); sh*=cloudShadow(X); if(nl>0.&&sh>.0) sh*=contact(X+N*bias*.35,L,d.x); }
  vec3 c=brdf(N,V,L,alb,met,flag>.5&&flag<1.5?max(rg,uMisc2.z):rg,sss,sh,mix(.5,1.,gao),uSunC.rgb*sunFall(X)); // uMisc2.z widens the sun's glint on polished floors
  // second light, unshadowed except by geometry ao
  if(uL2C.w>0.){ vec3 L2=normalize(uL2P.xyz-X); c+=brdf(N,V,L2,alb,met,max(rg,.3),sss,ao,.4,uL2C.rgb); }
  for(int i=0;i<uNPL;i++){ vec3 l=uPL[i].xyz-X; float dd=dot(l,l); float R=uPL[i].w; if(dd>R*R) continue; float w=1.-dd/(R*R); float at=w*w/(dd+R*R*.004); c+=brdf(N,V,normalize(l),alb,met,max(rg,.25),sss,mix(1.,ao,.6),.3,uPC[i].rgb*at*R*R*.02); }
  // ambient
  vec3 dif=alb*(1.-met); vec3 mb=max(vec3(ao),((ao*2.0404*alb-.3324)+(-4.7951*alb+.6417))*0.+vec3(ao)); vec3 aoC=pow(vec3(ao),vec3(1.)-.35*alb); c+=dif*ambient(N)*aoC;
  vec3 f0=mix(vec3(gF0),alb,met); float nv=max(dot(N,V),.02); vec3 R=reflect(-V,N); float so=sat(pow(nv+ao,exp2(-16.*rg-1.))-1.+ao); vec3 ev=envCol(R,rg); ev=mix(ev,ambient(R)*1.2,smoothstep(.25,.9,rg)*.7); ev*=mix(1.,mix(.30,1.15,smoothstep(.0,.42,abs(R.y+.05))),met*.85); 
  ev=mix(ev,vec3(luma(ev))*vec3(1.10,1.0,.84),met*.62); vec3 eb=envBRDF(f0,rg,nv);
  if(uRefl>.5&&flag>.5&&abs(X.y-uReflY)<3.){ vec2 uv=vUv+N.xz*vec2(.06,.10)*(flag>1.5?1.:.35); float lo=flag>1.5?0.:2.2; vec3 rf=textureLod(tRef,clamp(uv,vec2(.002),vec2(.998)),lo).rgb; if(uMisc2.w>0.) rf=min(rf,vec3(uMisc2.w)); ev=rf; so=mix(so,1.,.85); if(flag>1.5){ float fr=.02+.98*pow(1.-nv,5.); eb=vec3(fr*.92+.06); c*=.6; } else { eb=max(eb,vec3(.05+.5*pow(1.-nv,4.))); } }
  c+=ev*eb*so;
  c+=e.rgb;
  o=vec4(c,d.x);
}`);

  P.clShadow = G.prog('clShadow', vs, H + `uniform sampler2D tW;` + CLOUD + /* glsl */`
in vec2 vUv; out vec4 o; uniform vec3 uLR,uLU,uLF; 
void main(){ vec2 n=vUv*2.-1.; vec3 rd=normalize(uLF+uLR*n.x+uLU*n.y); vec3 ro=uSunP.xyz; float lo=uCl2.w,hi=uCl6.x; float ta=(lo-ro.y)/rd.y,tb=(hi-ro.y)/rd.y; float t0=max(min(ta,tb),0.),t1=max(ta,tb); if(abs(rd.y)<1e-4){ t0=0.; t1=30000.; } t1=min(t1,t0+9000.); if(t1<=t0){ o=vec4(0.,1e6,1e6,0.); return; }
 float j=ign(gl_FragCoord.xy,uJit.z*13.+uJit.w); float N=44.; float dt=(t1-t0)/N; float od=0.; float f=-1.,b=t1; float run[1]; for(float i=0.;i<N;i+=1.){ float t=t0+(i+j)*dt; float den=cloudCheap(ro+rd*t,1.5); if(den>.02){ if(f<0.) f=t; b=t; } od+=den*dt; }
 if(f<0.){ o=vec4(0.,1e6,1e6,0.); return; } o=vec4(od*uCl0.w*uCl2.y,f,b,0.); }`);

  P.vol = G.prog('vol', vs, H + BNZ + SKY + CLOUD + FOG + SHADOW + /* glsl */`
in vec2 vUv; layout(location=0) out vec4 o; layout(location=1) out vec4 oD; uniform sampler2D g3; uniform float uSteps,uFogSteps,uClouds,uStK; uniform vec2 uMir;
float stkR(float k,float n){ float t=k/(n-1.); float a=max(0.,1.-t/.25),b=max(0.,(t-.25)/.75); return 1050.+850.*a*a+6500.*pow(b,2.1); }
vec3 stkTint(float k){ float m=mod(k,5.); return m<.5?vec3(1.08,.99,.86):m<1.5?vec3(1.06,.86,.88):m<2.5?vec3(.82,1.0,.98):m<3.5?vec3(1.02,1.0,.98):vec3(.88,.92,1.10); }
vec3 ambCloud(float up){ return mix(uAmbD.rgb,uAmbU.rgb,up); }
void main(){
  vec3 rdv=rayDir(vUv); float rl=length(rdv); vec3 rd=rdv/rl; vec3 ro=uCamP.xyz; float dz=textureLod(g3,vUv,0.).x; bool sky=dz<=0.; float tS=sky?uFog2.w:min(dz*rl,uFog2.w);
  float jit,jit2,ja0,jr0; if(uNz.x<.5){ jit=ign(gl_FragCoord.xy,uJit.z*61.+uJit.w); jit2=h21(gl_FragCoord.xy*1.37+uJit.zw*117.); ja0=jit; jr0=jit2; }
  else { vec2 g=gl_FragCoord.xy; float k=uJit.w; jit=fract(bn(g)+k*.85667488); jit2=fract(bn(g+vec2(37.,91.))+k*.73389186); ja0=fract(bn(g+vec2(83.,29.))+k*.62870672); jr0=fract(bn(g+vec2(13.,61.))+k*.53859726); } // a rank-1 lattice over the sub-frames, shifted per pixel by blue noise
  float T=1.; vec3 C=vec3(0.); float wd=0.,ws=0.; float tPl=uMir.x>.5&&rd.y>1e-4?max(0.,(uMir.y-ro.y)/rd.y):0.; // a mirrored ray begins at the mirror
  if(uClouds>.5){
    float lo=uCl2.w,hi=uCl6.x; float t0=0.,t1=tS; if(abs(rd.y)>1e-5){ float ta=(lo-ro.y)/rd.y,tb=(hi-ro.y)/rd.y; t0=max(0.,min(ta,tb)); t1=min(tS,max(ta,tb)); } else if(ro.y>hi||ro.y<lo) t1=-1.; t0=max(t0,tPl);
    if(t1>t0){
      float pix=2.*length(uCamU.xyz)*uRes.w; float t=t0+jit*max(3.,t0*.006); vec3 sunC=uSunC.rgb; 
      for(float i=0.;i<uSteps;i+=1.){
        if(t>t1||T<.012) break; float jk=.55+.9*fract(jit+i*.6180340); vec3 p=ro+rd*t; float fp=t*pix; float mn=max(2.5,t*.0062)*uStK*jk; vec2 q; float pr=cloudProfile(p,q);
        if(pr<0.){ t+=max(mn,-pr*uCl0.z*(.75+min(t*.00012,.9))); continue; }
        float lod=log2(max(fp*128./2100./uCl1.z,1.)); float d=cloudShape(p,q,pr,lod);
        if(d<0.){ t+=max(mn,-d*uCl0.z*.5); continue; }
        float ld=log2(max(fp*64./410./uCl1.z,1.)); d=cloudDetail(p,q,d,ld); float st=mn; 
        float den=smoothstep(0.,uCl5.y,d)*baseFade(p.y);
        if(den>.002){
          st=max(3.2,t*.0085)*uStK*jk; float sg=den*uCl0.w; vec3 Lv=uSunP.xyz-p; vec3 L=normalize(Lv); float mu=dot(rd,L); float od=cloudOD(p,L,jit2)*uCl2.y;
          float sh=shadowD(p,6.2831853*fract(ja0+i*.7548777),fract(jr0+i*.5698403),5.5/uStK,uStK>1.?1:6);
          // multiple scattering octaves
          float s=0.,A=1.,B=1.,g=1.; for(int k=0;k<4;k++){ float ph=mix(hg(mu,.82*g),hg(mu,-.22*g),.28); s+=A*exp(-od*B)*ph; A*=.62; B*=.32; g*=.55; }
          float pow1=1.-exp(-(pr*2.4+den*.6)*uCl2.z); s*=mix(1.,pow1*1.6,.55*sat(1.-mu*.5-.2));
          float ou=cloudCheap(p+vec3(0.,38.,0.),1.2)*34.+cloudCheap(p+vec3(11.,115.,-9.),2.)*80.; float up=exp(-ou*uCl0.w*.42)*exp(-max(pr-.3,0.)*.9); vec3 Lh=normalize(vec3(Lv.x,length(Lv.xz)*.22,Lv.z)); float sdw=exp(-(cloudCheap(p+Lh*30.,1.)*30.+cloudCheap(p+Lh*95.,2.)*70.)*uCl0.w*.5); vec3 am=(uAmbU.rgb*(.14+.86*up)+uAmbD.rgb*.22*(1.-up)+uAmbS.rgb*(1.1*sdw))*uCl2.x;
          vec3 ir=vec3(1.); if(uCl5.w>0.){ float th=od*.8+pr*2.; ir=1.+uCl5.w*pow(max(mu,0.),10.)*exp(-od*.7)*cos(6.283*(vec3(0.,.33,.67)+th*.55+acos(clamp(mu,-1.,1.))*3.2)); }
          vec3 Ls=sunC*sunFall(p)*s*4.*PI*.30*uCl5.z*sh*ir+am;
          float tr=exp(-sg*st); vec3 S=Ls*(1.-tr); C+=T*S; wd+=T*(1.-tr)*t; ws+=T*(1.-tr); T*=tr;
        }
        t+=st;
      }
    }
  }
  float Dc=ws>0.?wd/ws:tS;
  // fog and light shafts
  float Tf=1.; vec3 F=vec3(0.),Fc=vec3(0.); float Tfc=1.; bool got=false; vec3 Lm=normalize(uSunP.xyz-ro);
  float N=uFogSteps; float tp=0.;
  for(float i=0.;i<N;i+=1.){ float u=(i+1.)/N; float te=tS*u*u; float dt=te-tp; float t=tp+dt*jit; vec3 p=ro+rd*t; 
    float ds=fogDen(p); float vp=vapour(p)*uFog0.x; float s=ds+vp;
    if(s>1e-8&&t>=tPl){ vec3 L=normalize(uSunP.xyz-p); float mu=dot(rd,L); float vis=shadow1(p)*cloudShadow(p); vis=mix(1.,vis,uFog2.z); float ph=mix(hg(mu,uFog0.w),.0796,.22)*4.*PI*.25; vec3 in_=uSunC.rgb*sunFall(p)*uSunC.w*ph*vis+uFog1.rgb; in_=mix(in_,in_*uFog3.rgb,sat(vp/max(s,1e-8))); 
      if(uL2C.w>0.){ in_+=uL2C.rgb*uL2C.w*.2; }
      float tr=exp(-s*dt); F+=Tf*in_*(1.-tr); Tf*=tr; }
    tp=te; if(!got&&te>=Dc){ Fc=F; Tfc=Tf; got=true; } }
  if(!got){ Fc=F; Tfc=Tf; }
  vec3 R3=Fc+Tfc*C+T*(F-Fc); float A3=T*Tf; oD=vec4(ws>0.?min(Dc,6e4):6e4,T,6e4,1.);
  if(uCl7.w>0.&&uCl9.w>0.){ // belts: march only where the ray crosses their cylinder
    float Rm=max(uCl7.x+uCl7.z,uCl8.x+uCl8.z)*1.35; float ym=min(uCl7.y-uCl7.w*2.4,uCl8.w>0.?uCl8.y-uCl8.w*2.4:1e6),yM=max(uCl7.y+uCl7.w*2.4,uCl8.y+uCl8.w*2.4); vec2 rc=ro.xz-uCl11.xy; float qa=dot(rd.xz,rd.xz),qb=dot(rc,rd.xz),qc=dot(rc,rc)-Rm*Rm,qd=qb*qb-qa*qc;
    if(qd>0.){ float sq=sqrt(qd); float a0=max((-qb-sq)/qa,0.),a1=min((-qb+sq)/qa,tS); float ta=(ym-ro.y)/rd.y,tb=(yM-ro.y)/rd.y; a0=max(max(a0,tPl),min(ta,tb)); a1=min(a1,max(ta,tb));
      if(a1>a0){ float NB=clamp((a1-a0)/34.,14.,56.); float dt=(a1-a0)/NB; float Tb=1.,wb=0.,wbs=0.; vec3 Bc=vec3(0.); for(float i=0.;i<NB;i+=1.){ float t=a0+(i+fract(jit+i*.6180340))*dt; vec3 p=ro+rd*t; float s=beltDen(p); if(s>1e-6){ vec3 L=normalize(uSunP.xyz-p); float mu=dot(rd,L); float ol=(beltDen(p+L*60.)*70.+beltDen(p+L*180.)*140.); float vis=shadow1(p)*cloudShadow(p)*exp(-ol*.8); float ph=mix(hg(mu,.55),.0796,.45)*4.*PI*.30; vec3 in_=uSunC.rgb*sunFall(p)*ph*vis*.55+(uAmbU.rgb*.8+uAmbS.rgb*.7+uAmbD.rgb*.2)*uCl2.x*1.1; float tr=exp(-s*dt); Bc+=Tb*in_*(1.-tr); wb+=Tb*(1.-tr)*t; wbs+=Tb*(1.-tr); Tb*=tr; if(Tb<.02) break; } } if(wbs>0.) oD.zw=vec2(min(wb/wbs,6e4),Tb);
        float tf=pow(max(Tf,1e-3),sat(a0/max(tS,1.))); R3=R3*Tb+Bc*tf; A3*=Tb; } } }
  if(uCl10.w>0.&&abs(rd.y)>1e-3){ // cloud wreaths of the stacked heavens: thin sheets, one per storey  (y0, spacing, count, density) (R, width, thickness, taper)
    float Tb=1.; vec3 Bc=vec3(0.); float tG=sky?1e9:dz*rl; for(float i=0.;i<uCl10.z;i+=1.){ float k=rd.y>0.?i:uCl10.z-1.-i; float y=uCl10.x+k*uCl10.y+(rd.y>0.?uCl12.w:0.); float t=(y-ro.y)/rd.y; if(t<=2.||t>tG) continue; vec3 p=ro+rd*t; float r=length(p.xz); float Rk=stkR(k,uCl10.z); float w=(r-Rk)/(uCl12.x+Rk*uCl12.y); float v=exp(-w*w*1.6); if(v<.012) continue;
      vec2 qq=rot(k*1.7+uCl9.z)*p.xz; float nz=textureLod(tA,vec3(qq,k*377.)/1500.,0.).r*.62+textureLod(tA,vec3(qq.y,k*91.,qq.x)/520.+.3,0.).g*.30+(textureLod(tB,vec3(qq,k*53.)/190.,0.).r-.5)*.26; float d=v*smoothstep(uCl9.x-.06,uCl9.x+.20,nz*(.74+.42*v)); if(d<.004) continue; float od=d*uCl12.z*uCl10.w/max(abs(rd.y),.16)*smoothstep(2.,160.,t);
      vec3 L=normalize(uSunP.xyz-p); float mu=dot(rd,L); vec2 q2=qq+rot(k*1.7+uCl9.z)*L.xz*90.; float n2=textureLod(tA,vec3(q2,k*377.)/1500.,0.).r*.62+textureLod(tA,vec3(q2.y,k*91.,q2.x)/520.+.3,0.).g*.30; float sh=exp(-max(n2*(.74+.42*v)-uCl9.x,0.)*5.5); float ph=mix(hg(mu,.55),.0796,.45)*4.*PI*.34; float und=rd.y>0.?.17:1.; vec3 in_=uSunC.rgb*ph*(.35+.65*sh)*und+(uAmbU.rgb*(rd.y>0.?.45:.9)+uAmbS.rgb*.7+uAmbD.rgb*(rd.y>0.?.9:.2))*uCl2.x*1.1; in_*=mix(vec3(1.),stkTint(k),.9); float tr=exp(-od); Bc+=Tb*in_*(1.-tr); Tb*=tr; if(Tb<.02) break; }
    R3=R3*Tb+Bc; A3*=Tb; }
  o=vec4(R3,A3);
}`);

  P.comb = G.prog('comb', vs, H + /* glsl */`
in vec2 vUv; out vec4 o; uniform sampler2D tLit,tVol; uniform float uBil; uniform sampler2D g3;
void main(){ vec3 c=textureLod(tLit,vUv,0.).rgb; vec4 v=textureLod(tVol,vUv,0.); o=vec4(min(c*v.a+v.rgb,vec3(400.)),1.); }`);
  P.copy = G.prog('copy', vs, `in vec2 vUv; out vec4 o; uniform sampler2D t; uniform vec4 uK; void main(){ o=textureLod(t,vUv,0.)*uK; }`);
  P.down = G.prog('down', vs, /* glsl */`in vec2 vUv; out vec4 o; uniform sampler2D t; uniform vec2 uT; uniform float uFirst;
vec3 s(vec2 d){ vec3 c=textureLod(t,vUv+d*uT,0.).rgb; return c; }
void main(){ vec3 a=s(vec2(-2,2)),b=s(vec2(0,2)),c=s(vec2(2,2)),d=s(vec2(-2,0)),e=s(vec2(0)),f=s(vec2(2,0)),g=s(vec2(-2,-2)),h=s(vec2(0,-2)),i=s(vec2(2,-2)),j=s(vec2(-1,1)),k=s(vec2(1,1)),l=s(vec2(-1,-1)),m=s(vec2(1,-1)); vec3 r=e*.125+(a+c+g+i)*.03125+(b+d+f+h)*.0625+(j+k+l+m)*.125; if(uFirst>.5){ r=min(r,vec3(60.)); } o=vec4(r,1.); }`);
  P.up = G.prog('up', vs, /* glsl */`in vec2 vUv; out vec4 o; uniform sampler2D t,tB; uniform vec2 uT; uniform float uR,uMix;
void main(){ vec3 r=vec3(0.); for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){ float w=(x==0?2.:1.)*(y==0?2.:1.)/16.; r+=w*textureLod(t,vUv+vec2(x,y)*uT*uR,0.).rgb; } o=vec4(mix(textureLod(tB,vUv,0.).rgb,r,uMix),1.); }`);

  // light shafts: radial smear of everything brighter than the threshold, away from the light's place on screen
  P.rays = G.prog('rays', vs, COMMON + /* glsl */`
in vec2 vUv; out vec4 o; uniform sampler2D t; uniform vec2 uC; uniform float uLen,uThr,uFirst,uSeed2,uDec;
void main(){ vec2 d=(uC-vUv)*uLen; vec3 s=vec3(0.); float w=0.,k=1.; const int N=40; float j=h21(gl_FragCoord.xy+uSeed2); for(int i=0;i<N;i++){ vec2 uv=vUv+d*(float(i)+j)/float(N); vec3 c=textureLod(t,uv,0.).rgb; if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))) c=vec3(0.); if(uFirst>.5){ float l=luma(c); c*=smoothstep(uThr,uThr*2.5,l); c=min(c,vec3(uThr*9.)); } s+=c*k; w+=1.; k*=uDec; } o=vec4(s/w,1.); }`);
  P.post = G.prog('post', vs, COMMON + /* glsl */`
in vec2 vUv; out vec4 o; uniform sampler2D t,tBloom,tOver,tRays; uniform float uRays; uniform vec2 uSize; uniform float uExp,uBloom,uVig,uGrain,uCA,uSeed,uFade,uWhite,uBars,uSat,uCon,uOverA,uHDR; uniform vec3 uLift,uGain,uTint; uniform float uTM,uPiv;
vec3 aces(vec3 c){ mat3 a=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777),b=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602); vec3 v=a*c; v=(v*(v+.0245786)-.000090537)/(v*(.983729*v+.4329510)+.238081); return clamp(b*v,0.,1.); }
vec3 agxEotf(vec3 v){ mat3 m=mat3(1.19687900512017,-.0980208811401368,-.0990297440797205,-.0528968517574562,1.15190312990417,-.0989611768448433,-.0529716355144438,-.0980434501171241,1.15107367264116); v=m*v; return pow(max(v,0.),vec3(2.2)); }
vec3 agxC(vec3 x){ vec3 x2=x*x,x4=x2*x2; return 15.5*x4*x2-40.14*x4*x+31.96*x4-6.868*x2*x+.4298*x2+.1191*x-.00232; }
vec3 agx(vec3 c){ mat3 m=mat3(.842479062253094,.0423282422610123,.0423756549057051,.0784335999999992,.878468636469772,.0784336,.0792237451477643,.0791661274605434,.879142973793104); c=m*max(c,1e-6); c=clamp(log2(c),-12.47393,4.026069); c=(c+12.47393)/(4.026069+12.47393); return agxC(c); }
vec3 look(vec3 v){ float l=luma(v); v=pow(max(v,0.),vec3(uCon)); l=luma(v); return l+(v-l)*uSat; }
void main(){
  vec2 uv=vUv; vec2 c=uv-.5; float r2=dot(c*vec2(uSize.x/uSize.y,1.),c*vec2(uSize.x/uSize.y,1.)); vec2 ca=c*r2*uCA;
  vec3 col=vec3(textureLod(t,uv+ca,0.).r,textureLod(t,uv,0.).g,textureLod(t,uv-ca,0.).b);
  vec3 bl=textureLod(tBloom,uv,0.).rgb; col=mix(col,bl,uBloom); if(uRays>0.) { vec3 ry=textureLod(tRays,uv,0.).rgb; col+=mix(vec3(luma(ry))*vec3(1.12,.98,.70),ry,.35)*uRays; } 
  col*=uExp; col*=mix(1.,1.-sat(r2*1.15),uVig); col*=uTint;
  col=mix(col,vec3(14.,13.,11.),uWhite);
  vec3 lin; if(uTM>.5){ vec3 x=max(col,0.); float L=luma(x); x=pow(max(x/.18,1e-6),vec3(uCon))*.18; float L2=luma(x); x=max(L2+(x-L2)*uSat,0.); lin=aces(x*1.35); } else { vec3 a=agx(col); a=look(a); lin=agxEotf(a); }
  
  lin=lin*uGain+uLift*(1.-lin);
  lin=mix(lin,vec3(1.),0.); lin*=uFade;
  vec3 s=mix(lin*12.92,1.055*pow(max(lin,0.),vec3(1./2.4))-.055,step(.0031308,lin));
  float bar=step(uBars,uv.y)*step(uv.y,1.-uBars); s*=bar;
  vec4 ov=textureLod(tOver,vec2(uv.x,1.-uv.y),0.); s=mix(s,ov.rgb/max(ov.a,1e-3),ov.a*uOverA);
  float g=(h31(vec3(gl_FragCoord.xy,uSeed))+h31(vec3(gl_FragCoord.xy,uSeed+7.3))-1.); float lum=luma(s); s+=g*uGrain*(.35+.65*sqrt(sat(lum*(1.-lum)*4.)))*bar; s+=(h31(vec3(gl_FragCoord.yx,uSeed+1.7))-.5)/255.*bar;
  o=vec4(s,1.);
}`);
  return P;
};
