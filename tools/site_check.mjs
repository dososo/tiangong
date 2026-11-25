// The web pages as a visitor gets them, in Chrome: nothing missing, nothing overflowing, the film plays and seeks, the palace opens.
// node tools/site_check.mjs [--dir folder] [--url https://…/] [--out result.json]
//   no arguments    this folder, served the way GitHub Pages serves it (tools/site_serve.mjs)
//   --url           a published copy instead
import { open, ROOT } from './harness.mjs'; import { siteServe } from './site_serve.mjs'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const LIVE = arg('--url'), DIR = path.resolve(arg('--dir') || ROOT), OUT = arg('--out'), S = LIVE ? null : await siteServe(DIR), BASE = LIVE ? LIVE.replace(/\/?$/, '/') : S.url, HOME = 'https://dososo.github.io/tiangong/';
const checks = [], ok = (name, pass, info = null) => { checks.push({ name, passed: !!pass, info }); console.log(pass ? 'pass' : 'FAIL', name, pass ? '' : JSON.stringify(info)); };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const O = await open('film.html', { log: false });
// every page is watched from the first byte
async function visit(url, { w = 1440, h = 900, dpr = 1, touch = false } = {}) {
  const ctx = await O.browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: touch, hasTouch: touch }), page = await ctx.newPage(); page.setDefaultTimeout(90000);
  const log = { errors: [], bad: [], media: [], outside: [], bytes: 0 };
  // the palace is one file and asks for no icon; Chrome looks for /favicon.ico at the root of the host, which is not ours
  const icon = (u) => /^https?:\/\/[^/]+\/favicon\.ico$/.test(u);
  page.on('console', m => { if (m.type() === 'error' && !icon(m.location().url)) log.errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => log.errors.push(e.message.slice(0, 200)));
  page.on('requestfailed', r => { if (!/\.mp4$/.test(r.url())) log.bad.push([r.url(), r.failure()?.errorText]); });
  page.on('response', r => { const u = r.url(); if (r.status() >= 400 && !icon(u)) log.bad.push([u, r.status()]); if (/\.mp4$/.test(u)) log.media.push(u.split('/').pop()); if (/^https?:/.test(u) && !u.startsWith(BASE) && !icon(u)) log.outside.push(u); });
  await page.goto(url, { waitUntil: 'load' }); return { page, ctx, log };
}
const scroll = (page) => page.evaluate(async () => { const s = document.scrollingElement; for (let y = 0; y < s.scrollHeight; y += innerHeight * .7) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 120)); } scrollTo({ top: 0, behavior: 'instant' }); await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 15000); }))); });
try {
  // ---------------------------------------------------------------- the front page
  for (const [w, h, dpr, touch] of [[360, 740, 2, 1], [390, 844, 2, 1], [820, 1180, 2, 1], [844, 390, 2, 1], [1024, 768, 1, 0], [1440, 900, 1, 0], [1920, 1080, 1, 0], [2560, 1440, 1, 0]]) {
    const V = await visit(BASE, { w, h, dpr, touch: !!touch }); await V.page.evaluate(() => document.fonts.ready); await scroll(V.page);
    const r = await V.page.evaluate(() => {
      const de = document.scrollingElement, out = [], small = [], taps = [];
      for (const e of document.querySelectorAll('body *')) { const b = e.getBoundingClientRect(); if (b.width && (b.right > innerWidth + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('[aria-hidden]')) out.push([e.tagName, e.className.baseVal ?? e.className, Math.round(b.left), Math.round(b.right)]); }
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n; (n = tw.nextNode());) { const p = n.parentElement; if (!n.data.trim() || p.closest('script,style,svg')) continue; const f = parseFloat(getComputedStyle(p).fontSize); if (f < 12) small.push([f, n.data.trim().slice(0, 12)]); }
      for (const e of document.querySelectorAll('a,button')) { const b = e.getBoundingClientRect(); if (b.width && b.height < 24 && getComputedStyle(e).display !== 'inline') taps.push([e.textContent.trim().slice(0, 12), Math.round(b.height)]); }
      return { over: de.scrollWidth - innerWidth, out: out.slice(0, 6), small: small.slice(0, 6), taps: taps.slice(0, 6), broken: [...document.images].filter(i => !i.naturalWidth).map(i => i.currentSrc || i.src), noalt: [...document.images].filter(i => !i.hasAttribute('alt')).length, images: document.images.length, fonts: [...document.fonts].filter(f => f.status !== 'loaded').map(f => f.family + f.weight + f.status) };
    });
    ok(`front page ${w}×${h}: no sideways scroll`, r.over <= 0, { over: r.over, out: r.out }); ok(`front page ${w}×${h}: every picture arrives`, !r.broken.length && r.images >= 30, { images: r.images, broken: r.broken });
    ok(`front page ${w}×${h}: no text under 12 px, no tap target under 24 px, fonts loaded`, !r.small.length && !r.taps.length && !r.fonts.length, { small: r.small, taps: r.taps, fonts: r.fonts });
    ok(`front page ${w}×${h}: console and network are clean`, !V.log.errors.length && !V.log.bad.length, { errors: V.log.errors.slice(0, 4), bad: V.log.bad.slice(0, 4) });
    ok(`front page ${w}×${h}: nothing from other sites, no film before it is asked for`, !V.log.outside.length && !V.log.media.length, { outside: V.log.outside.slice(0, 4), media: V.log.media });
    if (w === 1440) {
      const m = await V.page.evaluate(() => { const g = (s, a = 'content') => document.querySelector(s)?.getAttribute(a) || null; return { lang: document.documentElement.lang, title: document.title, desc: g('meta[name=description]'), canon: g('link[rel=canonical]', 'href'), image: g('meta[property="og:image"]'), card: g('meta[name="twitter:card"]'), h1: document.querySelectorAll('h1').length, noalt: [...document.images].filter(i => !i.hasAttribute('alt')).length, nosize: [...document.images].filter(i => !i.getAttribute('width') || !i.getAttribute('height')).length }; });
      ok('front page: language, title, description, canonical address, one h1', m.lang.startsWith('zh') && m.title && m.desc && m.canon === HOME && m.h1 === 1, m); ok('front page: every picture has an alt text and a size', m.noalt === 0 && m.nosize === 0, m);
      ok('front page: the share card is an absolute address that answers', m.card === 'summary_large_image' && m.image?.startsWith(HOME) && (await V.page.request.get(BASE + m.image.slice(HOME.length))).ok(), m.image);
      const links = await V.page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href)); const inner = [...new Set(links.filter(l => l.startsWith(BASE)).map(l => l.split('#')[0]))], dead = [];
      for (const l of inner) if (!(await V.page.request.get(l)).ok()) dead.push(l); const ids = await V.page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(i => i && !document.getElementById(i)));
      ok('front page: every inner link leads somewhere', !dead.length && !ids.length && inner.length >= 2, { inner, dead, ids });
      const outer = [...new Set(links.filter(l => !l.startsWith(BASE) && /^https?:/.test(l)))];
      if (LIVE) { const gone = []; for (const l of outer) { const r = await V.page.request.fetch(l, { method: 'HEAD', maxRedirects: 5 }).catch(e => ({ status: () => String(e.message).slice(0, 60) })); if (r.status() !== 200) gone.push([l, r.status()]); } ok('front page: every outer link leads somewhere', !gone.length && outer.length >= 5, { count: outer.length, gone }); }
      // the film
      const t0 = await V.page.evaluate(async () => { const v = document.getElementById('v'); v.muted = true; await v.play(); await new Promise(r => setTimeout(r, 2500)); return { t: v.currentTime, src: v.currentSrc.split('/').pop(), w: v.videoWidth, d: v.duration, err: v.error && v.error.message }; });
      ok('film: plays', t0.t > 1 && !t0.err && Math.abs(t0.d - 168) < .1, t0);
      const t1 = await V.page.evaluate(async () => { const v = document.getElementById('v'); v.currentTime = 119.6; await new Promise(r => { v.onseeked = r; setTimeout(r, 20000); }); const a = v.currentTime; await new Promise(r => setTimeout(r, 1800)); return { a, b: v.currentTime, err: v.error && v.error.message, q: v.getVideoPlaybackQuality().droppedVideoFrames }; });
      ok('film: seeks and goes on', Math.abs(t1.a - 119.6) < .2 && t1.b > t1.a + .8 && !t1.err, t1);
      const t2 = await V.page.evaluate(async () => { const v = document.getElementById('v'); v.pause(); const c = document.createElement('canvas'); c.width = 160; c.height = 90; const g = c.getContext('2d'); g.drawImage(v, 0, 0, 160, 90); const d = g.getImageData(0, 0, 160, 90).data; let s = 0, q = 0; for (let i = 0; i < d.length; i += 4) { const y = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; s += y; q += y * y; } const n = d.length / 4; return { mean: +(s / n).toFixed(1), dev: +Math.sqrt(q / n - (s / n) ** 2).toFixed(1) }; });
      ok('film: the picture is there (not black, not flat)', t2.mean > 8 && t2.dev > 8, t2);
    }
    await V.ctx.close();
  }
  // the H.264 copy, for browsers that cannot show the first one
  { const V = await visit(BASE); const r = await V.page.evaluate(async () => { const v = document.createElement('video'); v.muted = true; v.src = [...document.querySelectorAll('#v source')].pop().src; document.body.append(v); await v.play(); await new Promise(r => setTimeout(r, 1800)); return { t: v.currentTime, w: v.videoWidth, d: v.duration, err: v.error && v.error.message, src: v.src.split('/').pop() }; }); ok('film: the second copy plays too', r.t > .6 && !r.err && Math.abs(r.d - 168) < .1, r); await V.ctx.close(); }
  // ---------------------------------------------------------------- the palace
  const want = JSON.parse(fs.readFileSync(path.join(ROOT, fs.existsSync(path.join(ROOT, 'docs/verification/results.json')) ? 'docs/verification/results.json' : 'results.json'), 'utf8')).deliverables.find(d => d.path === 'delivery/tiangong_explore.html').sha256;
  for (const [w, h, dpr, touch, name] of [[1440, 900, 1, 0, 'desktop'], [390, 844, 3, 1, 'phone size']]) {
    const V = await visit(BASE + 'roam/', { w, h, dpr, touch: !!touch });
    if (!touch) ok('palace: the page is the file that was verified (SHA-256)', sha(await (await V.page.request.get(BASE + 'roam/')).body()) === want, want);
    await V.page.waitForFunction(() => window.tg && document.querySelector('#start.ready')); await V.page.click('#enter'); await V.page.waitForTimeout(3000);
    const r = await V.page.evaluate(async () => { const gl = window.tg.E.gl; let n = 0, on = true; const f = () => { n++; if (on) requestAnimationFrame(f); }; requestAnimationFrame(f); const t0 = performance.now(); await new Promise(r => setTimeout(r, 2000)); on = false; return { fps: Math.round(n / (performance.now() - t0) * 1000), err: gl.getError(), lost: gl.isContextLost(), place: window.tg.st.cur?.v?.name ?? null, over: document.scrollingElement.scrollWidth - innerWidth, size: [window.tg.E.w, window.tg.E.h] }; });
    ok(`palace, ${name}: opens and runs`, r.fps >= 20 && r.err === 0 && !r.lost && r.over <= 0, r); ok(`palace, ${name}: console and network are clean, nothing from other sites`, !V.log.errors.length && !V.log.bad.length && !V.log.outside.length, V.log); await V.ctx.close();
  }
} catch (e) { ok('the run itself', false, String(e.message).slice(0, 600)); }
const passed = checks.filter(c => c.passed).length; if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT + '.tmp', JSON.stringify({ schema_version: 1, at: new Date().toISOString(), url: LIVE || 'local copy', chrome: O.browser.version(), passed, total: checks.length, checks }, null, 1)); fs.renameSync(OUT + '.tmp', OUT); }
console.log(`${passed}/${checks.length}`); await O.close(); S?.s.close(); process.exit(passed === checks.length ? 0 : 1);
