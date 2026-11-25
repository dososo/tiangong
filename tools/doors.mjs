// The South Gate was shut until shot C after the film had been rendered once; frames 0–864 were rendered again.
// Are the frames kept from the first render (shot C and later) exactly what the corrected source draws?
// out/build_v1 = the source of the first render (hashes: evidence/film_source_sha256_v1.txt).  node tools/doors.mjs [out.json]
import { open } from './harness.mjs'; import fs from 'node:fs'; import path from 'node:path';
const outf = process.argv[2] || 'evidence/film_doors.json', W = 640, H = 360, SPP = 4, TC = 35, TS = [...Array.from({ length: 168 }, (_, i) => i + .5), ...Array.from({ length: 24 }, (_, i) => (840 + i) / 24)]; // one frame a second, and the first 24 of shot C, frame by frame
const out = {}; for (const p of ['out/build_v1/film.html', 'build_film/film.html']) {
  const X = await open(p, { log: false }); await X.page.waitForFunction(() => window.boot); await X.page.evaluate(async ([w, h]) => { await window.boot(document.getElementById('c'), w, h); }, [W, H]);
  out[p] = await X.page.evaluate(async ([w, h, spp, ts]) => { const r = []; for (const T of ts) { window.film.renderAt(T, { spp }); const c = document.getElementById('c'); const g = document.createElement('canvas'); g.width = w; g.height = h; const x = g.getContext('2d'); x.drawImage(c, 0, 0); r.push([T, Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', x.getImageData(0, 0, w, h).data))).map(v => v.toString(16).padStart(2, '0')).join('')]); } return r; }, [W, H, SPP, TS]); await X.close();
}
const [a, b] = Object.values(out), rows = a.map((x, i) => ({ T: x[0], first: x[1], corrected: b[i][1], same: x[1] === b[i][1], kept: x[0] >= TC }));
const kept = rows.filter(r => r.kept), early = rows.filter(r => !r.kept), bad = kept.filter(r => !r.same), changed = early.filter(r => !r.same);
for (const r of bad) console.log('T=' + r.T, 'DIFFERENT after the gate has opened');
console.log(`from ${TC} s on: ${kept.length - bad.length}/${kept.length} frames identical; before: ${changed.length}/${early.length} changed, at T = ${changed.map(r => r.T).join(' ')}`);
const pass = !bad.length && changed.length > 0; // the second condition is the positive control: the correction has to show somewhere
const res = { schema_version: 1, time: new Date().toISOString(), size: [W, H], spp: SPP, gate_opens_at: TC, same: kept.length - bad.length, total: kept.length, changed_before: changed.map(r => r.T), passed: pass, rows };
fs.mkdirSync(path.dirname(outf), { recursive: true }); fs.writeFileSync(outf + '.tmp', JSON.stringify(res, null, 1)); fs.renameSync(outf + '.tmp', outf); process.exit(pass ? 0 : 1);
