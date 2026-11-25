// The landing page in WebKit: pictures, type, width, and the film (which copy is picked, does it play, can it be dragged to another second).
const out = { checks: [] }, ok = (name, pass, info) => out.checks.push({ name, passed: !!pass, info });
const wait = ms => new Promise(r => setTimeout(r, ms)), upTo = (p, ms) => Promise.race([p, wait(ms).then(() => 'late')]);
await upTo(document.fonts.ready, 8000);
const faces = [...document.fonts].map(f => f.status); ok('both page typefaces are loaded', faces.length > 0 && faces.every(s => s === 'loaded'), faces);
for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .7) { scrollTo({ top: y, behavior: 'instant' }); await wait(250); }
await wait(1500); const pics = [...document.images], broken = pics.filter(i => !i.complete || !i.naturalWidth).map(i => i.currentSrc || i.src);
ok('every picture is drawn', pics.length >= 20 && !broken.length, { pictures: pics.length, broken });
ok('nothing is wider than the window', document.documentElement.scrollWidth <= innerWidth, [document.documentElement.scrollWidth, innerWidth]);
const bar = [...document.querySelectorAll('a[href]')].map(a => a.href); ok('links to the palace and to the source', bar.some(h => /\/roam\/(index\.html)?$/.test(h)) && bar.some(h => h.startsWith('https://github.com/dososo/tiangong')), bar.length);
const v = document.querySelector('video'); scrollTo({ top: 0, behavior: 'instant' }); v.muted = true; const ev = []; for (const e of ['loadedmetadata', 'playing', 'seeked', 'error', 'stalled']) v.addEventListener(e, () => ev.push(e));
let why = ''; try { if (await upTo(v.play(), 25000) === 'late') why = 'did not start in 25 s'; } catch (e) { why = String(e); }
const t0 = v.currentTime; await wait(3000); const t1 = v.currentTime; ok('the film plays', !why && !v.error && t1 - t0 > 1.5, { why, from: t0, to: t1, size: [v.videoWidth, v.videoHeight], seconds: v.duration, picked: v.currentSrc.split('/').pop() });
v.currentTime = 100; await upTo(new Promise(r => v.addEventListener('seeked', r, { once: true })), 15000); await wait(2500); ok('the film can be dragged to 1:40 and goes on', !v.error && v.currentTime > 100.5 && v.currentTime < 110, v.currentTime);
const c = document.createElement('canvas'); c.width = 64; c.height = 36; let px = null; try { const g = c.getContext('2d'); g.drawImage(v, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; px = s / (64 * 36 * 3); } catch (e) { px = String(e); }
ok('its picture is not black', typeof px === 'number' && px > 4, px); v.pause(); out.events = ev;
out.passed = out.checks.filter(k => k.passed).length; out.total = out.checks.length; return JSON.stringify(out);
