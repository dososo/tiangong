// What Chrome puts on the screen: the named frames of a film as screenshots. node tools/shown/browser.mjs film.mp4 outdir n1 n2 …
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(path.join(path.dirname(fs.realpathSync(process.execPath)), '../lib/node_modules/')); const { chromium } = require('playwright');
const [film, od, ...ns] = process.argv.slice(2); const page = path.join(od, 'player.html');
fs.writeFileSync(page, `<!doctype html><body style="margin:0;background:#000"><video id="v" muted playsinline preload="auto" style="width:1920px;height:1080px;display:block" src="file://${encodeURI(path.resolve(film))}"></video></body>`);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--force-color-profile=srgb'] }); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } }); pg.setDefaultTimeout(60000);
await pg.goto('file://' + encodeURI(page)); await pg.evaluate(() => new Promise((res, rej) => { const v = document.getElementById('v'); if (v.readyState >= 2) res(); v.onloadeddata = res; v.onerror = () => rej(new Error('video error ' + v.error?.code + ' ' + v.error?.message)); }));
for (const n of ns.map(Number)) { const t = await pg.evaluate(n => new Promise(res => { const v = document.getElementById('v'); let mt = -1; v.requestVideoFrameCallback((_, m) => { mt = m.mediaTime; }); v.onseeked = () => setTimeout(() => res(mt), 400); v.currentTime = (n + .5) / 24; }), n); await pg.screenshot({ path: path.join(od, `chrome_${n}.png`) }); console.log(n, Math.round(t * 24)); }
await b.close();
