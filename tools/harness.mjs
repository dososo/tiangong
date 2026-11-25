// Headless Chrome + static server. Raw frames are POSTed back to node.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url'; import crypto from 'node:crypto';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Playwright: this folder's own copy (npm install) or the one installed globally beside node. Only its library is used; the browser is the Chrome already on the machine.
function playwright() {
  for (const base of [ROOT + path.sep, path.join(path.dirname(fs.realpathSync(process.execPath)), '../lib/node_modules/')]) { try { return createRequire(base)('playwright'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; } }
  throw new Error('Playwright is missing: run  npm install  in the project folder (or  npm install -g playwright@1.58.0)');
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ttf': 'font/ttf', '.otf': 'font/otf' };
export function serve(onPost) {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      const u = new URL(q.url, 'http://x');
      if (q.method === 'POST') { const ch = []; q.on('data', d => ch.push(d)); q.on('end', async () => { try { await onPost?.(u, Buffer.concat(ch)); r.writeHead(200); r.end('ok'); } catch (e) { r.writeHead(500); r.end(String(e)); } }); return; }
      let f; try { f = fs.realpathSync(path.join(ROOT, decodeURIComponent(u.pathname))); } catch { r.writeHead(404); r.end(); return; }
      if (!f.startsWith(fs.realpathSync(ROOT) + path.sep) || !fs.statSync(f).isFile()) { r.writeHead(403); r.end(); return; }
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port }));
  });
}
export async function open(pageUrl, { w = 1280, h = 720, onPost, log = true, init, initArg, args = [] } = {}) {
  const { chromium } = playwright(); const srv = await serve(onPost);
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: [...(process.platform === 'darwin' ? ['--use-angle=metal'] : []), '--enable-gpu', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas', '--disable-gpu-watchdog', '--js-flags=--expose-gc', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', ...args] });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.setDefaultTimeout(0); const errs = [];
  page.on('console', m => { if (log) console.log('[page]', m.text()); }); page.on('pageerror', e => { errs.push(e.message); console.log('[pageerror]', e.message.slice(0, 6000)); });
  if (init) await page.addInitScript(init, initArg); await page.goto(`http://127.0.0.1:${srv.port}/${pageUrl}`); 
  return { page, browser, port: srv.port, errs, close: async () => { await browser.close(); srv.s.close(); } };
}
// Evidence is bound to the file it was taken from: a changed page makes it void (tools/report.py compares).
export const pageSha = (pg) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(ROOT, decodeURI(pg.replace(/^file:\/\//, '').split('?')[0])))).digest('hex');
