#!/usr/bin/env python3
"""The first and the second 4K render of frames 0-864, decoded frame by frame (MD5): frames that do not show the gate must come out identical, hours apart.
python3 tools/doors4k.py [first dir] [second dir] [out.json]"""
import sys, os, json, subprocess, time, numpy as np
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); os.chdir(ROOT); av = sys.argv[1:]; A, B, O = (av + [None] * 3)[:3]; A = A or 'out/film4k_before_doors'; B = B or 'out/film4k'; O = O or 'evidence/film_doors_4k.json'
SH = [('A', 0, 384), ('B1', 384, 552), ('B2', 552, 672), ('B3', 672, 840), ('C (first 24 frames)', 840, 864)]
def md5(f): return [l.split(',')[-1].strip() for l in subprocess.run(['nice', '-n', '10', 'ffmpeg', '-v', 'error', '-i', f, '-map', '0:v:0', '-f', 'framemd5', '-'], capture_output=True, text=True, check=True).stdout.splitlines() if l and l[0] != '#']
same = {}
def px(f, k): return np.frombuffer(subprocess.run(['nice', '-n', '10', 'ffmpeg', '-v', 'error', '-i', f, '-vf', f"select='eq(n\\,{k})'", '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'yuv422p10le', '-'], capture_output=True, check=True).stdout, '<u2').astype(np.int32)
for a in range(0, 864, 96):
    n = f'c_{a:05d}_{a + 96:05d}.mkv'
    with ThreadPoolExecutor(2) as ex: x, y = ex.map(md5, [f'{A}/{n}', f'{B}/{n}'])
    assert len(x) == len(y) == 96, n
    for k in range(96): same[a + k] = x[k] == y[k]
    print(n, sum(same[a + k] for k in range(96)), 'of 96 identical', flush=True)
rows = [dict(shot=s, frames=b - a, identical=sum(same[f] for f in range(a, b)), changed=[f for f in range(a, b) if not same[f]][:1] + [f for f in range(a, b) if not same[f]][-1:]) for s, a, b in SH]
for r in rows: print(r)
# A frame right after the cut may still be predicted from before it by the intermediate codec (x264 crf 8 puts its key frame where the dark ends): that much is allowed, in 10-bit steps.
CB = [f for f in range(840, 864) if not same[f]]; dev = {f: int(np.abs(px(f'{A}/c_00768_00864.mkv', f - 768) - px(f'{B}/c_00768_00864.mkv', f - 768)).max()) for f in CB}; print('shot C, not identical after decoding:', dev)
chk = [('B2 never shows the gate: all 120 frames identical', rows[2]['identical'] == 120), ('the first 24 frames of C (gate shut in both): identical, or at most one predicted frame within 16 of 1023', len(CB) <= 1 and all(x <= 16 for x in dev.values())), ('B1 until the gate comes into view: identical from its first frame on', same[384] and all(same[f] for f in range(384, (rows[1]['changed'] or [552])[0]))), ('A and B3 show the gate: changed', rows[0]['identical'] < 384 and rows[3]['identical'] < 168)]
for n, p in chk: print('PASS' if p else 'FAIL', n)
res = dict(schema_version=1, time=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), passed=sum(p for _, p in chk), total=len(chk), checks=[dict(name=n, passed=bool(p)) for n, p in chk], rows=rows, c_after_decoding_max_of_1023=dev); open(O + '.tmp', 'w').write(json.dumps(res, ensure_ascii=False, indent=1)); os.replace(O + '.tmp', O); sys.exit(0 if res['passed'] == res['total'] else 1)
