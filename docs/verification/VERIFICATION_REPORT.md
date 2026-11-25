# 验证报告

生成时间 2026-11-24T23:00:22Z（UTC） · `schema_version: 1` · 本文件由 `tools/report.py` 从 `evidence/` 生成，数字没有手填

> **公开版说明**：本报告在制作目录里由 `tools/report.py` 生成，数字没有改动。仓库与制作目录有四处不同：成片等大文件在 [Release v1.0.0](https://github.com/dososo/tiangong/releases/tag/v1.0.0)，手机预览版没有放出来；证据放在本文件旁边的 `evidence/`；`build_film/tools/harness.mjs`（只负责启动浏览器）换成了不含本机路径的版本，所以 V10 的 36 个哈希里这一个对不上，其余 35 个一致；删去一条只与制作者本机有关的残留说明。首页与线上漫游页的检查另见 `site.json`。

## 一、结论

**有条件达标**：机器可验的 447 项全部通过 447 项。「有条件」指下面第四节的 BLOCKED_ENV 与第五节的人工项还没有人验过。

## 二、总表

| 编号 | 检查 | 通过 | 证据 | 备注 |
|---|---|---|---|---|
| V01 | 成片 4K 文件检查（ffmpeg 解码） | 16/16 | `evidence/film_4k.json` |  |
| V02 | 成片 1080p 文件检查（ffmpeg 解码） | 16/16 | `evidence/film_1080p.json` |  |
| V03 | 成片 4K 由苹果 AVFoundation 逐帧解码 | 8/8 | `evidence/avfoundation_4k.json` |  |
| V04 | 成片 1080p 由苹果 AVFoundation 逐帧解码 | 8/8 | `evidence/avfoundation_1080p.json` |  |
| V05 | 手机预览版 720p 由苹果 AVFoundation 逐帧解码 | 8/8 | `evidence/avfoundation_preview.json` | 体积压到 30 MiB 以内，画质有损，没有做编码损失检查 |
| V06 | 成片 4K 屏上所见与审片画面一致（AVFoundation、Chrome 各 16 帧） | 4/4 | `evidence/shown_4k.json` |  |
| V07 | 成片 1080p 屏上所见与审片画面一致（AVFoundation、Chrome 各 16 帧） | 4/4 | `evidence/shown_1080p.json` |  |
| V08 | 成片 4K 编码损失（VMAF，十八段，每镜都有） | 3/3 | `evidence/vmaf_4k.json` |  |
| V09 | 成片 1080p 编码损失（VMAF，十八段，每镜都有） | 3/3 | `evidence/vmaf_1080p.json` |  |
| V10 | 成片源码快照与哈希清单一致 | 36/36 | `evidence/film_source_sha256.txt` | 首版开拍时的清单是 `evidence/film_source_sha256_v1.txt`，两版只差 `film.js` 一处（门） |
| V11 | 改门之后没有重渲的部分与首版逐帧一致（35 秒起抽 157 帧，逐字节） | 157/157 | `evidence/film_doors.json` | 首版在「门开」之前就把南天门画成开着，前后接不上；改后重渲第 0–863 帧，对照组确认改动只出现在 35 秒之前 |
| V12 | 两次 4K 渲染逐帧对照（第 0–863 帧解码后 MD5：没有门的帧应完全相同） | 4/4 | `evidence/film_doors_4k.json` | 两次渲染相隔数小时；B1 前段、B2 全部相同，证明同一帧号画出同一张图 |
| V13 | 现行源码与成片快照逐帧一致（抽 18 帧，逐字节） | 18/18 | `evidence/film_same.json` |  |
| V14 | 三十三声钟与三十三重天逐重对齐 | 5/5 | `evidence/bells.json` |  |
| V15 | 配乐母带机器检查（直流、声道平衡、单声道兼容、相位、咔哒声、闭眼后的静默） | 10/10 | `evidence/audio.json` | 不代替人耳 |
| V16 | 字幕逐字出处 | 13/13 | `evidence/captions_check.json` |  |
| V17 | 漫游页交互（真实鼠标键盘） | 61/61 | `evidence/explore_results.json` |  |
| V18 | 漫游页帧率（Chrome，十五处，≥58 帧且最慢一帧 ≤34 ms） | 15/15 | `evidence/explore_perf.json` | 最低 60.1 帧，最慢一帧 16.8 ms |
| V19 | 漫游页在不同刷新率下的节拍（模拟显示器） | 8/8 | `evidence/explore_pace.json` |  |
| V20 | 漫游页 WebKit（Safari 内核） | 22/22 | `evidence/webkit.json` |  |
| V21 | 漫游页 iPhone 模拟器 Safari | 15/15 | `evidence/ios_sim.json` | 模拟器用的是本机显卡，不能代表真机帧率 |
| V22 | 漫游页放进受限框架（发布环境的替身） | 13/13 | `evidence/frame_test.json` |  |

### 成片 4K：`tiangong_4k.mp4`，847.4 MB，40.4 Mbit/s

| 检查 | 结果 | 数值 |
|---|---|---|
| fast start: index before the pictures | 通过 | ["ftyp", "moov", "free", "mdat"] |
| picture format | 通过 | {"codec": "hevc", "profile": "Main 10", "size": [3840, 2160], "pix": "yuv420p10le", "level": 150, "tag": "hvc1"} |
| colour tags: Rec.709 primaries and matrix, sRGB curve, video range | 通过 | ["bt709", "iec61966-2-1", "bt709", "tv"] |
| 24 frames a second, constant | 通过 | ["24/1", "24/1"] |
| 4032 frames | 通过 | 4032 |
| picture lasts 168.000 s | 通过 | "168.000000" |
| sound: AAC, 48 kHz, stereo, 168 s | 通过 | {"codec": "aac", "sr": "48000", "ch": 2, "dur": "168.000000", "kbps": 320} |
| picture and sound start together | 通过 | ["0.000000", "0.000000"] |
| every frame decodes, no decoder message | 通过 | {"frames": 4032, "messages": "", "seconds": 31.3} |
| hard cuts exactly where the shot list has them | 通过 | {"found": [552, 672, 840, 1728, 1860, 1992, 2112, 2352, 2544, 2688, 2880], "expected": [552, 672, 840, 1728, 1860, 1992, 2112, 2352, 2544, 2688, 2880] |
| black only in the fades and the blink of the eye | 通过 | {"count": 10, "runs": [[0, 2], [383, 384], [840, 840], [3671, 3673], [4031, 4031]], "allowed": [[0, 4], [381, 387], [838, 842], [3668, 3676], [4028, 4 |
| no frozen frames | 通过 | [] |
| no one-frame flashes | 通过 | {"flagged": [], "nearest": [[3586, 0.64], [3277, 0.6], [3587, 0.6], [3278, 0.59], [3231, 0.47]], "rule": "more than 3 x the median of the ten frames a |
| that check sees injected flashes (positive control) | 通过 | {"seen": 24, "total": 24, "missed": [], "fast_frames": [516, 3248], "calm_frames": [1000, 1400, 2250, 2450, 3900]} |
| loudness near -14 LUFS | 通过 | {"I": -14.4, "LRA": 13.5} |
| true peak at or below -1 dBTP | 通过 | -1.3 |

### 成片 1080p：`tiangong_1080p.mp4`，398.7 MB，19.0 Mbit/s

| 检查 | 结果 | 数值 |
|---|---|---|
| fast start: index before the pictures | 通过 | ["ftyp", "moov", "free", "mdat"] |
| picture format | 通过 | {"codec": "h264", "profile": "High", "size": [1920, 1080], "pix": "yuv420p", "level": 42, "tag": "avc1"} |
| colour tags: Rec.709 primaries and matrix, sRGB curve, video range | 通过 | ["bt709", "iec61966-2-1", "bt709", "tv"] |
| 24 frames a second, constant | 通过 | ["24/1", "24/1"] |
| 4032 frames | 通过 | 4032 |
| picture lasts 168.000 s | 通过 | "168.000000" |
| sound: AAC, 48 kHz, stereo, 168 s | 通过 | {"codec": "aac", "sr": "48000", "ch": 2, "dur": "168.000000", "kbps": 320} |
| picture and sound start together | 通过 | ["0.000000", "0.000000"] |
| every frame decodes, no decoder message | 通过 | {"frames": 4032, "messages": "", "seconds": 11.2} |
| hard cuts exactly where the shot list has them | 通过 | {"found": [552, 672, 840, 1728, 1860, 1992, 2112, 2352, 2544, 2688, 2880], "expected": [552, 672, 840, 1728, 1860, 1992, 2112, 2352, 2544, 2688, 2880] |
| black only in the fades and the blink of the eye | 通过 | {"count": 10, "runs": [[0, 2], [383, 384], [840, 840], [3671, 3673], [4031, 4031]], "allowed": [[0, 4], [381, 387], [838, 842], [3668, 3676], [4028, 4 |
| no frozen frames | 通过 | [] |
| no one-frame flashes | 通过 | {"flagged": [], "nearest": [[3586, 0.64], [3277, 0.6], [3587, 0.59], [3278, 0.59], [3231, 0.47]], "rule": "more than 3 x the median of the ten frames  |
| that check sees injected flashes (positive control) | 通过 | {"seen": 24, "total": 24, "missed": [], "fast_frames": [516, 3242], "calm_frames": [1000, 1400, 2250, 2450, 3900]} |
| loudness near -14 LUFS | 通过 | {"I": -14.4, "LRA": 13.5} |
| true peak at or below -1 dBTP | 通过 | -1.3 |

画面另由 Claude Code 看图审过：全片每秒一格通看；4K 各段抽帧放大看；两份成片的天空渐变放大 14 倍对比度查色阶断层，没有发现（`evidence/banding.jpg`，左 1080p、右 4K）。这些是看图判断，不计入上面的项数，也不代替人眼。

### 漫游页帧率（Chrome，1512×982，像素比 2，显卡空闲时）

| 处 | 帧率 | 最慢一帧 ms | 显卡耗时 ms | 内部分辨率 |
|---|---|---|---|---|
| 云海 | 60.3 | 16.8 | 13.8 | 1332×866 |
| 南天门 | 60.2 | 16.8 | 11.98 | 1110×722 |
| 龙柱 | 60.2 | 16.8 | 11.76 | 1910×1240 |
| 天门 | 60.2 | 16.8 | 14.58 | 932×606 |
| 长桥 | 60.2 | 16.8 | 15.63 | 932×606 |
| 回廊 | 60.1 | 16.8 | 10.73 | 1332×866 |
| 丹墀 | 60.2 | 16.8 | 11.41 | 932×606 |
| 飞天 | 60.2 | 16.8 | 11.88 | 932×606 |
| 朝会 | 60.2 | 16.8 | 13.84 | 622×404 |
| 凌霄 | 60.2 | 16.8 | 12.77 | 932×606 |
| 日坛 | 60.2 | 16.8 | 12.24 | 1910×1240 |
| 月坛 | 60.1 | 16.8 | 23.64 | 932×606 |
| 仰观 | 60.2 | 16.8 | 9.87 | 754×490 |
| 俯观 | 60.2 | 16.8 | 11.23 | 1332×866 |
| 行者 | 60.2 | 16.8 | 10.81 | 754×490 |

## 三、交付物与 SHA-256

| 文件 | 大小 | SHA-256 |
|---|---|---|
| `delivery/stills/01_A_初登上界.jpg` | 2.0 MB | `348e72e2dd113fdfa8b259c7d92a8f58c98415190465dbda3d40d9e35549d718` |
| `delivery/stills/02_B1_龙柱晨光.jpg` | 2.0 MB | `c1ac3bfde864bbb76d6a76e9831d103f99cd0b907e284a7b9df242d32ed95616` |
| `delivery/stills/03_B2_赤须龙.jpg` | 2.4 MB | `2956f6445cd7083e0e67bb064a5e8e7c23d8150979f704607bdcd10e11a7b775` |
| `delivery/stills/04_B3_南天门.jpg` | 3.6 MB | `910dafc0f77c4407480b39404d780020982b7abe8bdfadb7db4c639bdec92338` |
| `delivery/stills/05_C_门开.jpg` | 2.8 MB | `73cc8fe25e12ff39d48f1b2a8855a87a0e3e31991280ad9e04cb44bd63bd920f` |
| `delivery/stills/06_D_金碧.jpg` | 2.3 MB | `39afeefa52b698273311d5acfdb9b7e3a759e57cc498756b15426eb35a039a33` |
| `delivery/stills/07_D_三十三座天宫.jpg` | 2.4 MB | `1aad77f4782c983977a466bf39f0dc7cf68f7aa025bd71aa89069b833bded38a` |
| `delivery/stills/08_D_青绿.jpg` | 2.9 MB | `09e5e52c5dee8495a2d6c2d143067c82a4bc6ac986c9ea8d008a5c91543671fa` |
| `delivery/stills/09_E1_复道回廊.jpg` | 4.0 MB | `2585ef1a6a39fc9e3304333ff5bd5370eba001d918f758d8a0db0abbafe79e0c` |
| `delivery/stills/10_E2_龙凤翱翔.jpg` | 2.7 MB | `57136a770a40f275a151ee8cfa1baba23439e920255ec651e35b0e7327a11ccc` |
| `delivery/stills/11_E3_飞天.jpg` | 2.3 MB | `e1db247fed560fe4c898145bc0c720a3063e8461744daeaaac3ed2e965bcaa69` |
| `delivery/stills/12_F1_金乌着底飞.jpg` | 2.3 MB | `2ddc3917c0ad7cf24b65c733d0aa9e3faccf94a2f2ab4dd5789a4b10860e5a95` |
| `delivery/stills/13_F2_玉兔坛边过.jpg` | 2.6 MB | `b1a6a33404b3841d235a312c9b2943dd631da00c2023316a6753f4ec78b786e2` |
| `delivery/stills/14_G1_丹墀.jpg` | 3.2 MB | `ecd4ebde185ecd0ff53f5ca947553668ad4cd2bb0fadefeb42f999d57574be52` |
| `delivery/stills/15_G2_万圣朝王.jpg` | 2.5 MB | `fbe7fce8d739b6cced6a913026a2867243e7dc96220ab91867f87fba6f136bd4` |
| `delivery/stills/16_H_仰观藻井.jpg` | 2.7 MB | `24565a636dc20e4f3c24f1ba60f35782a06a3a24e2f3055e433ed9026933fa88` |
| `delivery/stills/17_H_三十三重天.jpg` | 2.4 MB | `32d5b9be78490db9c2577bac7425fff18922f9f02195063f3e3a6463bb2656d3` |
| `delivery/stills/18_H_俯观曼荼罗.jpg` | 2.7 MB | `b006e5a9a973d23ef870de706c656ed79220fa88c3cdf1cf73023bd7f03ba0b8` |
| `delivery/stills/19_I_芥子须弥.jpg` | 3.7 MB | `2c669eb7e33c9e5e9285900b11aa1d13474a5071ed61036596e1a41b4c3a42c3` |
| `delivery/stills/20_I_金睛.jpg` | 4.7 MB | `3b3b89601bc3faa68b7fa43fd48360ea5ee9d2444c81f7a32b4096e117982025` |
| `delivery/stills/21_J_天宫.jpg` | 2.7 MB | `dc5277fef51801de70595315057da3a114f240a4f90566e01853ffa8671bb0b1` |
| `delivery/tiangong_1080p.mp4` | 398.7 MB | `b9b0b811bfac9aab3530bf2e466ba94e0ce84ec36e483cc2ef36f054b4b31b38` |
| `delivery/tiangong_4k.mp4` | 847.4 MB | `26f3413aef5cb076eda5da7c2af06cfcdbd00bd703d03cc04f143de086ad1074` |
| `delivery/tiangong_explore.html` | 2.5 MB | `8c7b2bd7af447fb5246e7567d10d354e96d86610051022aee9dff204c672fe78` |
| `delivery/tiangong_preview_720p.mp4` | 30.3 MB | `c68fa5e9ed69d012769f014ce71a65db6c4c16a6e5e596a501781c8701d1aa43` |
| `delivery/tiangong_score.m4a` | 6.8 MB | `7a7fc71db49a3bffc1558effd13461602e5b2f2015640772bcce1e2a7520b218` |

## 四、BLOCKED_ENV（待复验，不计入通过）

1. iPhone／iPad／安卓真机：帧率、发热、触控手感（只在 iPhone 模拟器里跑过）
2. 真实 120 Hz 显示器（只用模拟节拍验过）
3. Firefox（本机没有装，未测）
4. 低端显卡与 Windows（未测）
5. H.264／HEVC 在电视、投影、社交平台二次转码后的观感

## 五、须人工确认

1. 配乐没有经人耳监听（只有响度、真峰值、频谱与对位的机器验证）；定音鼓音高须人耳确认
2. 色板按传统矿物颜料的通行色相设定，没有从真实文物图像采样
3. 浑天仪、斗拱、藻井等形制按通行知识造型，没有逐件对照测绘图

## 六、已知残留

1. 4K 逐像素看，E3 有一处飘带掠过被阳光照亮的环体时有轻微碎点。
2. 帧源是 8 位 RGBA（线性光累积、抖动后量化），4K 母版以 10 位 HEVC 编码；没有 HDR 版。
3. 两份成片写的是 Rec.709 原色与矩阵、sRGB 传递函数。若按惯例写 Rec.709 传递函数，Mac 上 QuickTime 与 Chrome 会把中间调抬高约 10／255（对比见 `evidence/color_tags.json`）。不认这个标签的播放器和电视会按各自的默认曲线显示，可能略暗（未测）。
4. 漫游页在高像素屏上会按显卡余量自动降低内部分辨率（上表最后一列），再靠时间累积补足细节；要最清楚的画面请按 F 定格，走的是成片同一条渲染路径。
5. 4K 逐像素看，H 段最快的花瓣上，24 次采样的运动模糊有轻微台阶；J 段 156 秒前后，白鹤短暂飞过题词头两个字，仍可辨认。

## 七、最后一轮自审的发现与处理

| 编号 | 级别 | 位置 | 问题 | 为什么要改 | 修法与结果 |
|---|---|---|---|---|---|
| F1 | P1 | 成片 A、B1 末、B3（0–839 帧） | 南天门已经开着，下一镜 C 却从关着打开 | 前后接不上，「门开」的分量也没了 | `film.js` 一处：C 段之前门关着。重渲第 0–863 帧并重新编码两份成片；没有门的帧与首版逐帧相同（V11、V12） |
| F2 | P2 | `tools/verify_film.py` 黑场检查 | 没有列入 C 段设计的起黑（第 840 帧），却放了几段过宽的窗口 | 会误报，也会漏报 | 窗口收紧到五处设计的黑场 |
| F3 | P2 | `tools/verify_film.py` 一帧闪烁检查 | 用绝对阈值，快摇镜头每一帧都超 | 误报，且看不出真正的闪烁 | 改为与前后十帧的中位数相比，并加阳性对照：人为插入 24 处黑帧、白帧、亮度跳变、别镜的帧，全部检出 |
| F4 | P2 | `tools/vmaf.py` 抽样 | 两段抽样跨了渲染分段，运行会中断；G2、I 两镜没有抽到 | 证据不全 | 抽样改为十八段，每镜都有 |

## 八、环境

- machine：Apple M4 Pro, 14 cores, 24 GB
- macos：26.6.2
- node：v22.17.1
- ffmpeg：ffmpeg version 8.1.2 Copyright (c) 2000-2026 the FFmpeg developers
- python：3.10.18
- chrome：158 (ANGLE Metal)
- playwright：1.58.0

