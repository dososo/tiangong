// The site as GitHub Pages serves it: under /tiangong/, right media types, byte ranges. node tools/site_serve.mjs [dir] [port] (or import { siteServe })
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.txt': 'text/plain; charset=utf-8' };
export function siteServe(dir, port = 0, base = '/tiangong/') {
  const root = fs.realpathSync(dir);
  return new Promise(res => { const s = http.createServer((q, r) => {
    const u = new URL(q.url, 'http://x'); if (!u.pathname.startsWith(base)) { r.writeHead(404); r.end(); return; }
    let f = path.join(root, decodeURIComponent(u.pathname.slice(base.length))); try { f = fs.realpathSync(f); if (fs.statSync(f).isDirectory()) f = fs.realpathSync(path.join(f, 'index.html')); } catch { r.writeHead(404); r.end(); return; }
    if (f !== root && !f.startsWith(root + path.sep)) { r.writeHead(403); r.end(); return; }
    const n = fs.statSync(f).size, h = { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'accept-ranges': 'bytes' }, m = /^bytes=(\d*)-(\d*)$/.exec(q.headers.range || '');
    if (m && (m[1] || m[2])) { const a = m[1] ? +m[1] : Math.max(0, n - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], n - 1) : n - 1; if (a > b) { r.writeHead(416, { 'content-range': `bytes */${n}` }); r.end(); return; } r.writeHead(206, { ...h, 'content-range': `bytes ${a}-${b}/${n}`, 'content-length': b - a + 1 }); fs.createReadStream(f, { start: a, end: b }).on('error', () => r.destroy()).pipe(r); return; }
    r.writeHead(200, { ...h, 'content-length': n }); fs.createReadStream(f).on('error', () => r.destroy()).pipe(r);
  }); s.listen(port, '127.0.0.1', () => res({ s, url: `http://127.0.0.1:${s.address().port}${base}` })); });
}
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) { const { url } = await siteServe(process.argv[2] || '.', +process.argv[3] || 8791); console.log(url); }
