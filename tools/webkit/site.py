#!/usr/bin/env python3
"""The published pages in WebKit, the engine of Safari: the landing page at two widths and the palace.
  python3 tools/webkit/site.py <address of the site, with the last slash> <out.json>
Needs macOS with the Swift compiler. Nothing appears on the screen."""
import json, os, subprocess, sys, tempfile, time
HERE = os.path.dirname(os.path.realpath(__file__))


def main(site, out):
    if not site.startswith(('http://', 'https://')) or not site.endswith('/'): sys.exit('the address starts with http:// or https:// and ends with a slash')
    with tempfile.TemporaryDirectory() as tmp:
        exe = os.path.join(tmp, 'wk'); subprocess.run(['xcrun', 'swiftc', '-O', os.path.join(HERE, 'webkit_test.swift'), '-o', exe], check=True, stderr=subprocess.DEVNULL)
        checks, agent = [], ''

        def visit(label, url, steps, w, h):
            nonlocal agent
            res = os.path.join(tmp, 'r.json')
            if os.path.exists(res): os.remove(res)
            try: subprocess.run([exe, url, os.path.join(HERE, steps), res, str(w), str(h)], stdout=subprocess.DEVNULL, timeout=700)
            except subprocess.TimeoutExpired: pass
            if not os.path.exists(res): checks.append({'name': f'{label}: the page answers', 'passed': False, 'info': 'no result'}); return None
            d = json.load(open(res, encoding='utf8')); agent = (d.get('page') or {}).get('ua', agent); err = (d.get('page') or {}).get('err', ['unknown'])
            checks.append({'name': f'{label}: no errors in the page', 'passed': not err and 'failure' not in d and 'timeout' not in d, 'info': err or d.get('failure') or ''})
            return json.loads(d['result']) if isinstance(d.get('result'), str) else None
        for w, h in ((1280, 800), (390, 844)):
            r = visit(f'landing page {w}x{h}', site, 'steps_site.js', w, h)
            for c in (r or {}).get('checks', []): checks.append({'name': f"landing page {w}x{h}: {c['name']}", 'passed': c['passed'], 'info': c.get('info')})
        r = visit('palace', site + 'roam/', 'steps_load.js', 1280, 800)
        if r is not None: checks.append({'name': 'palace: every shader compiles, the lamps are lit, WebGL reports no error', 'passed': bool(r.get('ready')) and r.get('err0') == 0, 'info': {k: r.get(k) for k in ('ready', 'ms', 'msg', 'gl', 'err0')}})
    d = {'schema_version': 1, 'what': 'the pages in WebKit, the engine of Safari', 'site': site, 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'agent': agent, 'system': 'macOS ' + subprocess.run(['sw_vers', '-productVersion'], capture_output=True, text=True).stdout.strip(), 'passed': sum(c['passed'] for c in checks), 'total': len(checks), 'checks': checks}
    with open(out + '.tmp', 'w', encoding='utf8') as f: json.dump(d, f, ensure_ascii=False, indent=1); f.write('\n')
    os.replace(out + '.tmp', out); print(f"{d['passed']}/{d['total']}"); [print(' BAD', c['name'], c['info']) for c in checks if not c['passed']]
    return d['passed'] == d['total'] and d['total'] >= 18


if __name__ == '__main__':
    if len(sys.argv) != 3: sys.exit(__doc__)
    sys.exit(0 if main(sys.argv[1], sys.argv[2]) else 1)
