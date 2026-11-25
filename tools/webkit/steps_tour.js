const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const t0 = performance.now(); const R = { vis: document.visibilityState, size: [innerWidth, innerHeight, devicePixelRatio], views: [] };
while (!(window.tg && document.querySelector('#start.ready')) && !document.querySelector('#start.bad') && performance.now() - t0 < 120000) await sleep(100);
R.ready = !!document.querySelector('#start.ready'); R.loadMs = Math.round(performance.now() - t0); R.msg = document.querySelector('#start p')?.textContent; if (!R.ready) return JSON.stringify(R);
const gl = tg.E.gl, cv = document.querySelector('#c'); R.tq = tg.tq; R.out = [cv.width, cv.height]; R.pace = tg.pace();
document.querySelector('#enter').click(); await sleep(1200); R.entered = tg.st.entered; R.audio = tg.snd.ctx ? tg.snd.ctx.state : null;
const fps = (ms) => new Promise(r => { let n = 0, f0 = 0, l = 0, w = 0; const f = (t) => { if (!f0) f0 = t; else { w = Math.max(w, t - l); n++; } l = t; if (t - f0 < ms) requestAnimationFrame(f); else r({ fps: +(n / (t - f0) * 1000).toFixed(1), worst: +w.toFixed(1) }); }; requestAnimationFrame(f); });
for (let i = 0; i < tg.S.length; i++) {
  tg.select(i, { dur: .05 }); const t1 = performance.now(); while (tg.nav.fl && performance.now() - t1 < 8000) await sleep(50); await sleep(12000);
  const f = await fps(3000); const v = { id: tg.S[i].v.id, name: tg.S[i].v.name, ...f, scale: tg.scale(), hour: +tg.st.hour.toFixed(2), gl: gl.getError(), lost: gl.isContextLost() };
  tg.manual(true); await sleep(60); tg.tick(1 / 60); const g = document.createElement('canvas'); g.width = 720; g.height = Math.round(720 * cv.height / cv.width); g.getContext('2d').drawImage(cv, 0, 0, g.width, g.height); v.jpg = g.toDataURL('image/jpeg', .86); tg.manual(false); R.views.push(v);
}
tg.select(6, { dur: .05 }); await sleep(7000); tg.still(true); const t2 = performance.now(); while (!document.querySelector('#still.done') && performance.now() - t2 < 120000) await sleep(200); R.stillMs = Math.round(performance.now() - t2); R.stillDone = !!document.querySelector('#still.done'); await sleep(200);
{ const g = document.createElement('canvas'); g.width = 1200; g.height = Math.round(1200 * cv.height / cv.width); tg.rt.stillShow?.(); g.getContext('2d').drawImage(cv, 0, 0, g.width, g.height); R.still = g.toDataURL('image/jpeg', .9); } tg.still(false); R.gl = gl.getError(); R.lost = gl.isContextLost(); return JSON.stringify(R);
