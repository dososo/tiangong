// contact sheet: node tools/sheet.mjs "A:3,A:10,D:5" [w] [spp] [out]
import { open, ROOT } from './harness.mjs'; import fs from 'node:fs';
const spec = process.argv[2] || ''; const w = +(process.argv[3] || 960), h = Math.round(w * 9 / 16), spp = +(process.argv[4] || 4); const tag = process.argv[5] || 'sheet';
const H = await open('film.html'); try {
  await H.page.waitForFunction(() => window.boot); const info = await H.page.evaluate(async ([w, h]) => { const f = await window.boot(document.getElementById('c'), w, h); let t = 0; return f.SHOTS.map(s => { const r = { id: s.id, t0: t, dur: s.dur }; t += s.dur; return r; }); }, [w, h]);
  let list = spec ? spec.split(',').map(x => { const [id, u] = x.split(':'); const s = info.find(q => q.id === id); return [id + '_' + u, s.t0 + (+u)]; }) : info.flatMap(s => [.12, .5, .9].map(f => [s.id + '_' + (s.dur * f).toFixed(1), s.t0 + s.dur * f]));
  const names = []; for (const [n, T] of list) { const t0 = Date.now(); const d = await H.page.evaluate(([T, spp]) => { window.film.renderAt(T, { spp }); return document.getElementById('c').toDataURL('image/jpeg', .93); }, [T, spp]); fs.writeFileSync(`${ROOT}/out/${tag}_${n}.jpg`, Buffer.from(d.split(',')[1], 'base64')); names.push(`${tag}_${n}.jpg`); console.log(n, T.toFixed(2), Date.now() - t0, 'ms'); }
  fs.writeFileSync(`${ROOT}/out/${tag}.json`, JSON.stringify(names)); console.log('total', info.reduce((a, s) => a + s.dur, 0));
} catch (e) { console.log(String(e.message).slice(0, 4000)); } await H.close();
