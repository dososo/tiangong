// Pictures of the roaming page as a visitor sees it, controls included: node tools/roam_shots.mjs [page] [outdir] [w] [h] [dpr] [names]
import { open } from './harness.mjs'; import fs from 'node:fs'; import path from 'node:path';
const [, , pg = 'delivery/tiangong_explore.html', out = 'out/roam', W = '1440', H = '900', DPR = '2', names = '南天门,长桥,飞天,凌霄,月坛,仰观,行者'] = process.argv; fs.mkdirSync(out, { recursive: true });
const O = await open('film.html', { log: false }); const ctx = await O.browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +DPR }); const page = await ctx.newPage(); page.setDefaultTimeout(120000); const errs = []; page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${O.port}/${pg}?sc=1`); await page.waitForFunction(() => window.tg && document.querySelector('#start.ready')); await page.screenshot({ path: path.join(out, 'start.png') }); await page.click('#enter'); await page.waitForTimeout(2600);
  for (const n of names.split(',')) {
    await page.mouse.move(+W / 2 + Math.random() * 4, +H / 2); await page.waitForTimeout(120); const b = page.locator('#slips button', { hasText: n }); await b.click(); await page.waitForFunction((n) => window.tg.st.cur?.v.name === n && !window.tg.nav.fl, n); await page.waitForTimeout(4200); await page.mouse.move(+W / 2 + 8, +H / 2 - 30); await page.waitForTimeout(1300);
    await page.screenshot({ path: path.join(out, `${n}.png`) }); console.log(n, await page.evaluate(() => [window.tg.E.w, window.tg.E.h, +window.tg.st.hour.toFixed(2)]));
  }
} catch (e) { console.log('failed', e.message.slice(0, 600)); process.exitCode = 1; }
console.log('errors', errs.length, errs.slice(0, 3)); await O.close();
