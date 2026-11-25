#!/usr/bin/env python3
"""Turn the raw WebKit and iPhone-simulator runs into evidence: python3 tools/webkit/collect.py <webkit raw.json> <ios dir> <page>"""
import sys, os, json, io, base64, hashlib, time, glob
from PIL import Image, ImageDraw
raw, iosd, page = sys.argv[1:4]; EV = 'evidence'; sha = hashlib.sha256(open(page, 'rb').read()).hexdigest()
def save(p, o): open(p + '.tmp', 'w', encoding='utf8').write(json.dumps(o, ensure_ascii=False, indent=1)); os.replace(p + '.tmp', p)
def fin(name, out, extra):
    res = dict(schema_version=1, page=page, sha256=sha, **extra, passed=sum(c['passed'] for c in out), total=len(out), checks=out); save(f'{EV}/{name}.json', res)
    with open(f'{EV}/{name}.log', 'w', encoding='utf8') as f:
        for c in out: f.write(('PASS ' if c['passed'] else 'FAIL ') + c['name'] + ' ' + json.dumps(c.get('info'), ensure_ascii=False) + '\n')
        f.write(f"{res['passed']}/{res['total']}\n")
    print(name, res['passed'], '/', res['total'], [c['name'] for c in out if not c['passed']])
d = json.load(open(raw, encoding='utf8')); r = json.loads(d['result']) if isinstance(d['result'], str) else d['result']; out = []; ok = lambda n, p, i=None: out.append(dict(name=n, passed=bool(p), info=i))
ok('page visible and built', r['vis'] == 'visible' and r['ready'], dict(ms=r['loadMs'], msg=r['msg'])); ok('entered', r['entered']); ok('sound running', r['audio'] == 'running', r['audio']); ok('fifteen places', len(r['views']) == 15, len(r['views']))
for v in r['views']: ok('place ' + v['name'], v['gl'] == 0 and not v['lost'] and v['fps'] >= 55, {k: v[k] for k in ('fps', 'worst', 'scale', 'hour', 'gl')})
ok('still completes', r['stillDone'], dict(ms=r['stillMs'])); ok('no GL error, context alive', r['gl'] == 0 and not r['lost']); ok('no script error', not d['page']['err'], d['page']['err'][:3])
fin('webkit', out, dict(what='WKWebView, off-screen window under the desktop (the engine Safari uses); frame rate measured with requestAnimationFrame, no GPU timer in this engine', ua=d['page']['ua'], size=r['size'], out=r['out'], pace=r['pace'], run_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(os.path.getmtime(raw)))))
ims = [Image.open(io.BytesIO(base64.b64decode(v['jpg'].split(',')[1]))).convert('RGB').resize((400, 250), Image.LANCZOS) for v in r['views']]; W = Image.new('RGB', (2000, 750)); [W.paste(im, (400 * (i % 5), 250 * (i // 5))) for i, im in enumerate(ims)]; W.save(f'{EV}/webkit_views.jpg', quality=86)
L = json.load(open(os.path.join(iosd, 'log.json'), encoding='utf8')); g = {}; [g.setdefault(o.get('k'), []).append(o) for o in L['log']]; out = []
ok('run finished', L['finished']); op = g['open'][0]; rd = g['ready'][0]; gl = g['gl'][0]; ok('page built', rd['ready'], dict(ms=rd['ms'], msg=rd.get('msg'))); ok('ten places', len(g['view']) == 10, len(g['view']))
for v in g['view']: ok('place ' + v['name'], v['gl'] == 0 and not v['lost'] and v['fps'] >= 30, {k: v[k] for k in ('fps', 'worst', 'scale', 'gl')})
ok('help sheet opened', 'help' in g); ok('no script error', not g['done'][0]['err'] and not rd['err'], g['done'][0]['err'][:3])
fin('ios_sim', out, dict(what='Safari in an iPhone simulator on this Mac (Mac GPU; frame rates do not stand for a real phone)', device=os.environ.get('SIM_NAME', L['udid']), ua=op['ua'], screen=op['size'], touch=op['touch'], out=gl['out'], run_at=L['time'], real_device='BLOCKED_ENV'))
fs = sorted(glob.glob(os.path.join(iosd, 's*_*.png'))); ims = [Image.open(f).convert('RGB') for f in fs if 'sheet' not in f]; h = 560; ims = [im.resize((round(im.width * h / im.height), h), Image.LANCZOS) for im in ims]; n = 6; w = ims[0].width; W = Image.new('RGB', (w * n, h * ((len(ims) + n - 1) // n))); [W.paste(im, (w * (i % n), h * (i // n))) for i, im in enumerate(ims)]; W.save(f'{EV}/ios_sim_views.jpg', quality=86)
