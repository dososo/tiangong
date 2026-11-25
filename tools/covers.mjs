// Covers: a plate of the film (out/plates, made by tools/plates.mjs), the vertical title as it stands at the end of the film, the seal, and, in the "link" copies, the address.
// node tools/covers.mjs   -> media/cover.jpg, media/og.jpg, media/covers/*.jpg
import { open, ROOT } from './harness.mjs'; import fs from 'node:fs'; import path from 'node:path';
const DRAFT = fs.existsSync(path.join(ROOT, 'publish/repo')), SITE = DRAFT ? 'publish/repo' : '.', PLATES = path.join(ROOT, DRAFT ? 'publish/plates' : 'out/plates'), M = path.join(ROOT, SITE, 'media'), LINK = 'dososo.github.io/tiangong';
const SEAL = 'M12.5 3L19.5 3 M12.5 6.2L19.5 6.2 M16 3L16 10.2 M12.5 19L12.5 10.2L19.5 10.2L19.5 19 M16 10.2L16 13.6 M14.8 19L14.8 13.6L17.2 13.6L17.2 19 M6 2.4L6 4.6 M2.5 8.2L2.5 4.6L9.5 4.6L9.5 8.2 M4.2 7.6L7.8 7.6L7.8 11.2L4.2 11.2L4.2 7.6 M6 11.2L6 13.4 M3 13.4L9 13.4L9 19L3 19L3 13.4';
// title: size of the two big characters, top and side: their distance from the corner, all in pixels of the picture; mt: where the small column starts, in title sizes
const JOBS = [
  { out: ['cover.jpg', 'covers/cover-16x9-clean.jpg'], plate: 'cover_16x9', w: 1920, h: 1080, title: 152, top: 92, side: 118 },
  { out: ['covers/cover-16x9-link.jpg'], plate: 'cover_16x9', w: 1920, h: 1080, title: 152, top: 92, side: 118, link: true },
  { out: ['covers/cover-4x3-clean.jpg'], plate: 'cover_4x3', w: 1440, h: 1080, title: 122, top: 72, side: 56 },
  { out: ['covers/cover-4x3-link.jpg'], plate: 'cover_4x3', w: 1440, h: 1080, title: 122, top: 72, side: 56, link: true },
  { out: ['covers/cover-3x4-clean.jpg'], plate: 'cover_3x4', w: 1080, h: 1440, title: 138, top: 80, side: 66, mt: .2 },
  { out: ['covers/cover-3x4-link.jpg'], plate: 'cover_3x4', w: 1080, h: 1440, title: 138, top: 80, side: 66, mt: .2, link: true },
  { out: ['covers/cover-5x2-clean.jpg'], plate: 'cover_5x2', w: 2000, h: 800, title: 138, top: 70, side: 130 },
  { out: ['og.jpg'], plate: 'og', w: 1200, h: 630, title: 98, top: 54, side: 72 },
];
const html = (j, b64) => { const t = j.title, s = t / 152, sm = Math.max(17, Math.round(24 * s)); return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:200;src:url(data:font/woff2;base64,${b64.f200})}@font-face{font-family:T;font-weight:400;src:url(data:font/woff2;base64,${b64.f400})}
*{margin:0;box-sizing:border-box}body{width:${j.w}px;height:${j.h}px;overflow:hidden;position:relative;background:#000;font-family:T;color:#f4e9dc;-webkit-font-smoothing:antialiased}
img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.v{position:absolute;inset:0;background:linear-gradient(to top,rgba(20,9,10,.62) 0,rgba(20,9,10,.24) 13%,rgba(20,9,10,0) 27%),radial-gradient(42% 74% at 100% 0,rgba(28,9,16,.42),rgba(28,9,16,0) 76%)}
.n{position:absolute;top:${j.top}px;right:${j.side}px;display:flex;flex-direction:row-reverse;align-items:flex-start;gap:${26 * s}px}
.n b{writing-mode:vertical-rl;font-weight:200;font-size:${t}px;line-height:1;letter-spacing:.1em;text-shadow:0 0 ${24 * s}px rgba(40,12,16,.35)}
.n div{display:flex;flex-direction:column;align-items:center;gap:${22 * s}px;margin-top:${t * (j.mt ?? .92)}px}.n span{writing-mode:vertical-rl;font-weight:400;font-size:${sm}px;line-height:1;letter-spacing:.42em}
svg{width:${46 * s}px;height:${46 * s}px;background:#9e4b3b;display:block}path{fill:none;stroke:#f4e9dc;stroke-width:1.18}
.e,.l{position:absolute;bottom:${Math.round(j.h * .046)}px;font-weight:400;font-size:${Math.max(16, Math.round(22 * s))}px;line-height:1.5}.e{left:${Math.round(j.w * .036)}px;letter-spacing:.3em}.l{right:${Math.round(j.w * .036)}px;letter-spacing:.06em;text-align:right}
</style><img src="data:image/png;base64,${b64.img}"><div class="v"></div><div class="n"><b>天宫</b><div><span>西游记　第四回</span><svg viewBox="0 0 22 22"><path d="${SEAL}"/></svg></div></div>
<p class="e">THE CELESTIAL PALACE</p>${j.link ? `<p class="l">在线看片，入宫漫游<br>${LINK}</p>` : ''}`; };
const b = (f) => fs.readFileSync(f).toString('base64'), O = await open('film.html', { log: false });
try {
  for (const j of JOBS) {
    const page = await O.browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 }); await page.setContent(html(j, { f200: b(path.join(M, 'fonts/serif-200.woff2')), f400: b(path.join(M, 'fonts/serif-400.woff2')), img: b(path.join(PLATES, j.plate + '.png')) })); await page.evaluate(() => document.fonts.ready); await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    const bad = await page.evaluate(() => [...document.querySelectorAll('.n,.n b,.n span,.n svg,.e,.l')].filter(e => { const r = e.getBoundingClientRect(); return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight; }).map(e => e.className || e.tagName)); if (bad.length) throw new Error(`${j.out[0]}: off the picture: ${bad}`);
    for (const o of j.out) { const f = path.join(M, o); fs.mkdirSync(path.dirname(f), { recursive: true }); await page.screenshot({ path: f + '.tmp', type: 'jpeg', quality: 92 }); fs.renameSync(f + '.tmp', f); console.log(o, `${j.w}x${j.h}`, fs.statSync(f).size); } await page.close();
  }
} catch (e) { console.log('failed', e.message); process.exitCode = 1; } await O.close();
