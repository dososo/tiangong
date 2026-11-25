import { open, ROOT } from './harness.mjs'; import fs from 'node:fs';
// usage: node tools/look.mjs jobs.json   (or jobs module exporting default)
const p = process.argv[2]; const only = process.argv[3]; const mod = await import(p.startsWith('/') ? p : ROOT + '/' + p); let jobs = mod.default; if (only) jobs = jobs.filter(j => only.split(',').includes(j.name));
const w = mod.W || 1280, h = mod.H || 720; const H = await open('look.html'); try { await H.page.evaluate(([w, h]) => window.init(w, h), [w, h]); for (const j of jobs) { const d = await H.page.evaluate(j => window.look(j), j); fs.writeFileSync(`${ROOT}/out/look_${j.name}.png`, Buffer.from(d.split(',')[1], 'base64')); } } catch (e) { console.log(String(e.message).slice(0, 4000)); } await H.close();
