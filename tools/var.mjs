// try variants of a shot's light side by side: node tools/var.mjs <shot:u> <variants.js> [w] [spp] [tag]
import { open, ROOT } from './harness.mjs'; import fs from 'node:fs';
const [spec, file] = process.argv.slice(2); const w = +(process.argv[4] || 960), h = Math.round(w * 9 / 16), spp = +(process.argv[5] || 6), tag = process.argv[6] || 'var';
const src = fs.readFileSync(file, 'utf8'); const H = await open('film.html'); try {
  await H.page.waitForFunction(() => window.boot); const names = [];
  const ns = await H.page.evaluate(async ([w, h, src]) => { await window.boot(document.getElementById('c'), w, h); window.M = await import(new URL('src/core/math.js', location.href).href); window.VAR = (0, eval)('(' + src + ')'); window.ORG = Object.fromEntries(film.SHOTS.map(s => [s.id, s.frame])); return Object.keys(window.VAR); }, [w, h, src]);
  for (const one of spec.split(',')) { const [id, u] = one.split(':'); for (const n of ns) { const d = await H.page.evaluate(([id, u, n, spp]) => { const s = film.SHOTS.find(x => x.id === id); s.frame = (a, b, W, E) => { const st = ORG[id](a, b, W, E); VAR[n](st, a, b); return st; }; let t0 = 0; for (const x of film.SHOTS) { if (x === s) break; t0 += x.dur; } film.renderAt(t0 + (+u), { spp }); s.frame = ORG[id]; return document.getElementById('c').toDataURL('image/jpeg', .93); }, [id, u, n, spp]); const fn = `${tag}_${id}_${u}_${n}.jpg`; fs.writeFileSync(`${ROOT}/out/${fn}`, Buffer.from(d.split(',')[1], 'base64')); names.push(fn); console.log(fn); } }
  fs.writeFileSync(`${ROOT}/out/${tag}.json`, JSON.stringify(names));
} catch (e) { console.log(String(e.message).slice(0, 3000)); } await H.close();
