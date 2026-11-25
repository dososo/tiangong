#!/usr/bin/env python3
"""Why the film says "sRGB curve": the same 24 frames written with the two possible tags, shown by AVFoundation and Chrome. python3 tools/shown/tags.py <chunk dir> <first frame> <out.json>"""
import sys, os, json, subprocess, tempfile, time
ch, at, outp = sys.argv[1], int(sys.argv[2]), sys.argv[3]; T = tempfile.mkdtemp(); HERE = os.path.dirname(os.path.abspath(__file__)); c = at // 96 * 96; res = dict(schema_version=1, time=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), first_frame=at, note='columns: frame, mean shift, largest tone-band shift, mean absolute difference (of 255)', tags={})
for tag in ['bt709', 'iec61966-2-1']:
    f = f'{T}/{tag}.mp4'; subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{ch}/c_{c:05d}_{c + 96:05d}.mkv', '-vf', f'trim=start_frame={at - c}:end_frame={at - c + 24},setpts=N/24/TB,scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc={tag}:colorspace=bt709', '-r', '24', '-c:v', 'libx264', '-crf', '10', '-movflags', '+faststart', f], check=True)
    subprocess.run([sys.executable, os.path.join(HERE, 'run.py'), f, ch, f'{T}/{tag}.json', '--frames', '4,12,20', '--offset', str(at)], stdout=subprocess.DEVNULL); d = json.load(open(f'{T}/{tag}.json')); res['tags'][tag] = {x['name'].split(':')[0]: x['info'] for x in d['checks'] if 'tone band' in x['name']}
open(outp + '.tmp', 'w').write(json.dumps(res, ensure_ascii=False, indent=1)); os.replace(outp + '.tmp', outp); print(json.dumps(res, ensure_ascii=False))
