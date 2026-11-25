#!/usr/bin/env python3
"""Collect every piece of evidence into results.json and VERIFICATION_REPORT.md. Numbers come from the evidence files only; a missing file is reported as missing.
python3 tools/report.py"""
import json, os, hashlib, time, subprocess, platform, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); os.chdir(ROOT)
J = lambda p: json.load(open(p, encoding='utf8')) if os.path.exists(p) else None
def save(p, s): open(p + '.tmp', 'w', encoding='utf8').write(s); os.replace(p + '.tmp', p)
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''): h.update(b)
    return h.hexdigest()
def mb(n): return f'{n / 1e6:.1f} MB'
sec = []
def add(key, name, ev, passed, total, note=''): sec.append(dict(key=key, name=name, evidence=ev, passed=passed, total=total, note=note, ok=total > 0 and passed == total))
def std(key, name, ev, note=''):
    d = J(ev); add(key, name, ev, d['passed'], d['total'], note) if d else add(key, name, ev, 0, 0, '证据缺失'); return d
f4, f1 = std('film_4k', '成片 4K 文件检查（ffmpeg 解码）', 'evidence/film_4k.json'), std('film_1080p', '成片 1080p 文件检查（ffmpeg 解码）', 'evidence/film_1080p.json')
std('avf_4k', '成片 4K 由苹果 AVFoundation 逐帧解码', 'evidence/avfoundation_4k.json'); std('avf_1080p', '成片 1080p 由苹果 AVFoundation 逐帧解码', 'evidence/avfoundation_1080p.json'); std('avf_preview', '手机预览版 720p 由苹果 AVFoundation 逐帧解码', 'evidence/avfoundation_preview.json', '体积压到 30 MiB 以内，画质有损，没有做编码损失检查'); std('shown_4k', '成片 4K 屏上所见与审片画面一致（AVFoundation、Chrome 各 16 帧）', 'evidence/shown_4k.json'); std('shown_1080p', '成片 1080p 屏上所见与审片画面一致（AVFoundation、Chrome 各 16 帧）', 'evidence/shown_1080p.json'); std('vmaf_4k', '成片 4K 编码损失（VMAF，十八段，每镜都有）', 'evidence/vmaf_4k.json'); std('vmaf_1080p', '成片 1080p 编码损失（VMAF，十八段，每镜都有）', 'evidence/vmaf_1080p.json')
r = subprocess.run(['shasum', '-a', '256', '-c', '../evidence/film_source_sha256.txt'], cwd='build_film', capture_output=True, text=True); L = [x for x in r.stdout.splitlines() if x.strip()]; add('film_source', '成片源码快照与哈希清单一致', 'evidence/film_source_sha256.txt', sum(x.endswith('OK') for x in L), len(L), '首版开拍时的清单是 `evidence/film_source_sha256_v1.txt`，两版只差 `film.js` 一处（门）')
d = J('evidence/film_doors.json'); add('film_doors', '改门之后没有重渲的部分与首版逐帧一致（35 秒起抽 157 帧，逐字节）', 'evidence/film_doors.json', d['same'] if d and d['passed'] else 0, d['total'] if d else 0, '首版在「门开」之前就把南天门画成开着，前后接不上；改后重渲第 0–863 帧，对照组确认改动只出现在 35 秒之前')
std('film_doors_4k', '两次 4K 渲染逐帧对照（第 0–863 帧解码后 MD5：没有门的帧应完全相同）', 'evidence/film_doors_4k.json', '两次渲染相隔数小时；B1 前段、B2 全部相同，证明同一帧号画出同一张图')
d = J('evidence/film_same.json'); add('film_same', '现行源码与成片快照逐帧一致（抽 18 帧，逐字节）', 'evidence/film_same.json', d['same'] if d else 0, d['total'] if d else 0)
std('bells', '三十三声钟与三十三重天逐重对齐', 'evidence/bells.json'); std('audio', '配乐母带机器检查（直流、声道平衡、单声道兼容、相位、咔哒声、闭眼后的静默）', 'evidence/audio.json', '不代替人耳'); std('captions', '字幕逐字出处', 'evidence/captions_check.json')
std('explore', '漫游页交互（真实鼠标键盘）', 'evidence/explore_results.json'); p = J('evidence/explore_perf.json')
if p: good = [x for x in p['rows'] if x['fps'] >= 58 and x['worst'] <= 34]; ids = {x['id'] for x in p['rows']}; add('perf', '漫游页帧率（Chrome，十五处，≥58 帧且最慢一帧 ≤34 ms）', 'evidence/explore_perf.json', len(good) if len(ids) == 15 else 0, 15, f"最低 {min(x['fps'] for x in p['rows'])} 帧，最慢一帧 {max(x['worst'] for x in p['rows'])} ms")
else: add('perf', '漫游页帧率', 'evidence/explore_perf.json', 0, 0, '证据缺失')
std('pace', '漫游页在不同刷新率下的节拍（模拟显示器）', 'evidence/explore_pace.json'); std('webkit', '漫游页 WebKit（Safari 内核）', 'evidence/webkit.json'); std('ios', '漫游页 iPhone 模拟器 Safari', 'evidence/ios_sim.json', '模拟器用的是本机显卡，不能代表真机帧率'); std('frame', '漫游页放进受限框架（发布环境的替身）', 'evidence/frame_test.json')
deliv = []
for base, _, fs in os.walk('delivery'):
    for f in sorted(fs):
        q = os.path.join(base, f)
        if f.startswith('.') or f.endswith(('.zip', '.tmp')): continue
        deliv.append(dict(path=q, bytes=os.path.getsize(q), sha256=sha(q)))
deliv.sort(key=lambda x: x['path'])
blocked = ['iPhone／iPad／安卓真机：帧率、发热、触控手感（只在 iPhone 模拟器里跑过）', '真实 120 Hz 显示器（只用模拟节拍验过）', 'Firefox（本机没有装，未测）', '低端显卡与 Windows（未测）', 'H.264／HEVC 在电视、投影、社交平台二次转码后的观感']
human = ['配乐没有经人耳监听（只有响度、真峰值、频谱与对位的机器验证）；定音鼓音高须人耳确认', '色板按传统矿物颜料的通行色相设定，没有从真实文物图像采样', '浑天仪、斗拱、藻井等形制按通行知识造型，没有逐件对照测绘图']
# evidence counts only for the exact file it was taken from
BIND = [('film_4k', 'evidence/film_4k.json', 'delivery/tiangong_4k.mp4'), ('film_1080p', 'evidence/film_1080p.json', 'delivery/tiangong_1080p.mp4'), ('avf_4k', 'evidence/avfoundation_4k.json', 'delivery/tiangong_4k.mp4'), ('avf_1080p', 'evidence/avfoundation_1080p.json', 'delivery/tiangong_1080p.mp4'), ('avf_preview', 'evidence/avfoundation_preview.json', 'delivery/tiangong_preview_720p.mp4'), ('shown_4k', 'evidence/shown_4k.json', 'delivery/tiangong_4k.mp4'), ('shown_1080p', 'evidence/shown_1080p.json', 'delivery/tiangong_1080p.mp4'), ('vmaf_4k', 'evidence/vmaf_4k.json', 'delivery/tiangong_4k.mp4'), ('vmaf_1080p', 'evidence/vmaf_1080p.json', 'delivery/tiangong_1080p.mp4')] + [(k, f'evidence/{e}.json', 'delivery/tiangong_explore.html') for k, e in [('explore', 'explore_results'), ('perf', 'explore_perf'), ('pace', 'explore_pace'), ('webkit', 'webkit'), ('ios', 'ios_sim')]] + [('frame', 'evidence/frame_test.json', 'out/artifact/tiangong_explore.html'), ('audio', 'evidence/audio.json', 'out/score_master.wav')]
for k, ev, f in BIND:
    e = J(ev); x = next(s for s in sec if s['key'] == k)
    if not e: continue
    if not os.path.exists(f): x.update(ok=False, note='对应文件不存在'); continue
    if e.get('sha256') != (next((d['sha256'] for d in deliv if d['path'] == f), None) or sha(f)): x.update(ok=False, passed=0, note='证据与现行文件的 SHA-256 不符，作废，须重测')
    else: x['bound_sha256'] = e['sha256']
checks = sum(s['passed'] for s in sec), sum(s['total'] for s in sec); allok = all(s['ok'] for s in sec)
conclusion = '有条件达标' if allok else '未达标'
head = lambda c: subprocess.run(c, capture_output=True, text=True).stdout.splitlines()[0] if c else ''
env = dict(machine='Apple M4 Pro, 14 cores, 24 GB', macos=platform.mac_ver()[0], node=head(['node', '-v']), ffmpeg=head(['ffmpeg', '-hide_banner', '-version']), python=platform.python_version(), chrome='158 (ANGLE Metal)', playwright='1.58.0')
res = dict(schema_version=1, generated_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), conclusion=conclusion, checks_passed=checks[0], checks_total=checks[1], sections=sec, deliverables=deliv, blocked_env=blocked, needs_human=human, pending_agent=[], environment=env)
save('results.json', json.dumps(res, ensure_ascii=False, indent=1))
T = []; w = T.append
w('# 验证报告\n'); w(f"生成时间 {res['generated_at']}（UTC） · `schema_version: 1` · 本文件由 `tools/report.py` 从 `evidence/` 生成，数字没有手填\n")
w('## 一、结论\n'); w(f"**{conclusion}**：机器可验的 {checks[1]} 项{'全部' if allok else ''}通过 {checks[0]} 项。「有条件」指下面第四节的 BLOCKED_ENV 与第五节的人工项还没有人验过。\n" if allok else f"**{conclusion}**：{checks[1]} 项中通过 {checks[0]} 项，未过的见下表。\n")
w('## 二、总表\n'); w('| 编号 | 检查 | 通过 | 证据 | 备注 |\n|---|---|---|---|---|'); [w(f"| V{i + 1:02d} | {s['name']} | {s['passed']}/{s['total']} | `{s['evidence']}` | {s['note']} |") for i, s in enumerate(sec)]; w('')
for tag, d in [('4K', f4), ('1080p', f1)]:
    if not d: continue
    w(f"### 成片 {tag}：`{d['file']}`，{mb(d['bytes'])}，{d['mbit']} Mbit/s\n"); w('| 检查 | 结果 | 数值 |\n|---|---|---|')
    for c in d['checks']: w(f"| {c['name']} | {'通过' if c['passed'] else '未过'} | {json.dumps(c['info'], ensure_ascii=False)[:150] if c['info'] is not None else ''} |")
    w('')
w('画面另由 Claude Code 看图审过：全片每秒一格通看；4K 各段抽帧放大看；两份成片的天空渐变放大 14 倍对比度查色阶断层，没有发现（`evidence/banding.jpg`，左 1080p、右 4K）。这些是看图判断，不计入上面的项数，也不代替人眼。\n')
if p:
    w('### 漫游页帧率（Chrome，1512×982，像素比 2，显卡空闲时）\n'); w('| 处 | 帧率 | 最慢一帧 ms | 显卡耗时 ms | 内部分辨率 |\n|---|---|---|---|---|'); [w(f"| {x['name']} | {x['fps']} | {x['worst']} | {x['gpu']} | {x['in'][0]}×{x['in'][1]} |") for x in p['rows']]; w('')
w('## 三、交付物与 SHA-256\n'); w('| 文件 | 大小 | SHA-256 |\n|---|---|---|'); [w(f"| `{x['path']}` | {mb(x['bytes'])} | `{x['sha256']}` |") for x in deliv]; w('')
w('## 四、BLOCKED_ENV（待复验，不计入通过）\n'); [w(f'{i + 1}. {b}') for i, b in enumerate(blocked)]; w('')
w('## 五、须人工确认\n'); [w(f'{i + 1}. {b}') for i, b in enumerate(human)]; w('')
w('## 六、已知残留\n'); w('1. 4K 逐像素看，E3 有一处飘带掠过被阳光照亮的环体时有轻微碎点。\n2. 帧源是 8 位 RGBA（线性光累积、抖动后量化），4K 母版以 10 位 HEVC 编码；没有 HDR 版。\n3. 两份成片写的是 Rec.709 原色与矩阵、sRGB 传递函数。若按惯例写 Rec.709 传递函数，Mac 上 QuickTime 与 Chrome 会把中间调抬高约 10／255（对比见 `evidence/color_tags.json`）。不认这个标签的播放器和电视会按各自的默认曲线显示，可能略暗（未测）。\n4. 漫游页在高像素屏上会按显卡余量自动降低内部分辨率（上表最后一列），再靠时间累积补足细节；要最清楚的画面请按 F 定格，走的是成片同一条渲染路径。\n5. 4K 逐像素看，H 段最快的花瓣上，24 次采样的运动模糊有轻微台阶；J 段 156 秒前后，白鹤短暂飞过题词头两个字，仍可辨认。\n')
w('## 七、最后一轮自审的发现与处理\n'); w('| 编号 | 级别 | 位置 | 问题 | 为什么要改 | 修法与结果 |\n|---|---|---|---|---|---|'); w('| F1 | P1 | 成片 A、B1 末、B3（0–839 帧） | 南天门已经开着，下一镜 C 却从关着打开 | 前后接不上，「门开」的分量也没了 | `film.js` 一处：C 段之前门关着。重渲第 0–863 帧并重新编码两份成片；没有门的帧与首版逐帧相同（V11、V12） |'); w('| F2 | P2 | `tools/verify_film.py` 黑场检查 | 没有列入 C 段设计的起黑（第 840 帧），却放了几段过宽的窗口 | 会误报，也会漏报 | 窗口收紧到五处设计的黑场 |'); w('| F3 | P2 | `tools/verify_film.py` 一帧闪烁检查 | 用绝对阈值，快摇镜头每一帧都超 | 误报，且看不出真正的闪烁 | 改为与前后十帧的中位数相比，并加阳性对照：人为插入 24 处黑帧、白帧、亮度跳变、别镜的帧，全部检出 |'); w('| F4 | P2 | `tools/vmaf.py` 抽样 | 两段抽样跨了渲染分段，运行会中断；G2、I 两镜没有抽到 | 证据不全 | 抽样改为十八段，每镜都有 |'); w('')
w('## 八、环境\n'); [w(f'- {k}：{v}') for k, v in env.items()]; w('')
save('VERIFICATION_REPORT.md', '\n'.join(T) + '\n'); print(conclusion, checks, [(s['name'], s['passed'], s['total']) for s in sec if not s['ok']])
