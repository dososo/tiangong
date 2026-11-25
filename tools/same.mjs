// Is the film drawn by the working source still the film of the frozen build the 4K master was rendered from?
// Same frames from both, pixel hashes compared.  node tools/same.mjs [out.json]
import { open } from './harness.mjs'; import fs from 'node:fs'; import path from 'node:path';
const outf = process.argv[2] || 'evidence/film_same.json', W = 640, H = 360, SPP = 4, TS = [1, 10, 19, 25, 31, 41, 60, 74, 80, 85, 95, 103, 109, 116, 130, 148, 160, 166];
const out = {}; for (const p of ['film.html', 'build_film/film.html']) {
  const X = await open(p, { log: false }); await X.page.waitForFunction(() => window.boot); await X.page.evaluate(async ([w, h]) => { await window.boot(document.getElementById('c'), w, h); }, [W, H]);
  out[p] = await X.page.evaluate(async ([w, h, spp, ts]) => { const r = []; for (const T of ts) { window.film.renderAt(T, { spp }); const c = document.getElementById('c'); const g = document.createElement('canvas'); g.width = w; g.height = h; const x = g.getContext('2d'); x.drawImage(c, 0, 0); r.push([T, Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', x.getImageData(0, 0, w, h).data))).map(v => v.toString(16).padStart(2, '0')).join('')]); } return r; }, [W, H, SPP, TS]); await X.close();
}
const [a, b] = Object.values(out); const rows = a.map((x, i) => ({ T: x[0], source: x[1], frozen: b[i][1], same: x[1] === b[i][1] })); for (const r of rows) console.log('T=' + r.T, r.source.slice(0, 32), r.frozen.slice(0, 32), r.same ? 'SAME' : 'DIFFERENT');
const res = { schema_version: 1, time: new Date().toISOString(), size: [W, H], spp: SPP, same: rows.filter(r => r.same).length, total: rows.length, rows }; fs.mkdirSync(path.dirname(outf), { recursive: true }); fs.writeFileSync(outf + '.tmp', JSON.stringify(res, null, 1)); fs.renameSync(outf + '.tmp', outf); console.log(res.same + '/' + res.total + ' frames identical'); process.exit(res.same === res.total ? 0 : 1);
