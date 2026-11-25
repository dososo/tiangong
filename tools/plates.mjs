// Frames of the film without captions, at any size and shape, for covers and the web page.
// node tools/plates.mjs jobs.json outdir       jobs: [{ "name", "T" (film seconds), "w", "h", "spp", "fov" (factor), "dy" (look higher by so many metres), "monkey": false }]
import { open } from './harness.mjs'; import fs from 'node:fs'; import path from 'node:path';
const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), out = path.resolve(process.argv[3] || 'out/plates'); fs.mkdirSync(out, { recursive: true });
// the captions are drawn on the one 2D canvas that asks for willReadFrequently: false
const init = () => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, o) { const c = get.call(this, k, o); if (k === '2d' && o && o.willReadFrequently === false) { c.fillText = () => {}; c.drawImage = () => {}; } return c; }; };
const sizes = new Map(); for (const j of jobs) { const k = `${j.w}x${j.h}`; (sizes.get(k) || sizes.set(k, []).get(k)).push(j); }
for (const list of sizes.values()) {
  const { w, h } = list[0]; let got; const H = await open('film.html', { init, log: false, onPost: async (u, b) => { const p = path.join(out, path.basename(u.searchParams.get('f'))); fs.writeFileSync(p + '.tmp', b); fs.renameSync(p + '.tmp', p); got = b.length; } });
  try {
    await H.page.waitForFunction(() => window.boot); await H.page.evaluate(async ([w, h]) => { await window.boot(document.getElementById('c'), w, h); for (const s of window.film.SHOTS) { s.frame0 = s.frame; s.frame = (...a) => { const r = s.frame0(...a), o = window.__o || {}; if (o.fov || o.dy) r.cam = { ...r.cam, fov: r.cam.fov * (o.fov || 1), at: [r.cam.at[0], r.cam.at[1] + (o.dy || 0), r.cam.at[2]] }; if (o.monkey === false) delete r.monkey; return r; }; } }, [w, h]);
    for (const j of list) { const t0 = Date.now(); await H.page.evaluate(async (j) => { window.__o = j; window.film.renderAt(j.T, { spp: j.spp || 48 }); const b = await new Promise(r => document.getElementById('c').toBlob(r, 'image/png')); await fetch('/put?f=' + encodeURIComponent(j.name + '.png'), { method: 'POST', body: b }); }, j); console.log(j.name, `${w}x${h}`, 'T', j.T, got, 'bytes', Date.now() - t0, 'ms', H.errs.length ? H.errs : ''); }
  } catch (e) { console.log('failed', String(e.message).slice(0, 1500)); process.exitCode = 1; } await H.close();
}
