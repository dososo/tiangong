# 署名与授权清单

`schema_version: 1` · 授权状态核验日期 2026-11-24 · 核验方式：直读官方页面（表中「核验」一栏写明读的是哪一页）

## 一、本项目自有部分

| 内容 | 授权 | 说明 |
|---|---|---|
| 全部源码（`src/`、`tools/`、`audio/`、`*.html`） | Apache-2.0，© 2026 BLCaptain（见 `LICENSE`） | 渲染器、建筑、龙凤鹤人物、天体、云海、分镜、漫游、配乐与音效代码均为本项目新写；未使用任何第三方三维引擎、模型、贴图或图片 |
| 成片画面、静帧、封面、漫游页、首页 | Apache-2.0 | 全部由代码逐像素计算；没有使用生成式图像或视频模型，没有使用实拍或影视素材 |
| 配乐「金声玉振」 | Apache-2.0；再次发布时须保留 `NOTICE` 与第二节的署名 | 编钟、磬、鼓、人声合唱层、箫、笙、混响为程序合成；其余乐器用下列采样演奏 |

## 二、发布时必须带上的署名（可整段复制）

> 古琴采样：GuqinSonGest，Han Han，Zenodo，DOI 10.5281/zenodo.14962054，CC BY 4.0，经切取、校音、重奏。
> 琵琶采样：PipaSet v1，Yuancheng Wang、Yuyang Jing、Wei Wei、Dorian Cazau、Olivier Adam、Qiao Wang，Zenodo，DOI 10.5281/zenodo.6760047，CC BY 4.0，经切取、重奏。
> 京剧锣鼓采样：Mi Tian、Ajay Srinivasamurthy、Mark Sandler、Xavier Serra（演奏 Ying Wan），Zenodo，DOI 10.5281/zenodo.1285212，CC BY 4.0（原压缩包内注明 CC BY 3.0），经切取、重奏。
> 大锣采样：pjcohen，Freesound 413613、413614，CC BY 4.0，经切取、重奏。
> 以上修改均不代表原作者认可本作品。授权文本：https://creativecommons.org/licenses/by/4.0/

漫游页只用到古琴采样，署名已写在页面的操作说明里。

## 三、声音素材

| 乐器 | 来源 | 授权 | 核验 |
|---|---|---|---|
| 古琴（成片、漫游页） | GuqinSonGest v1，Han Han（研究者 Liyu You），DOI 10.5281/zenodo.14962054 | CC BY 4.0 | 已读 zenodo.org/records/14962054 |
| 琵琶 | PipaSet v1，DOI 10.5281/zenodo.6760047 | CC BY 4.0 | 已读 zenodo.org/records/6760047 |
| 京剧大锣、小锣、铙钹等 | Beijing Opera percussion v1.0，DOI 10.5281/zenodo.1285212；论文 ICASSP 2014，DOI 10.1109/ICASSP.2014.6853981 | Zenodo 页面写 CC BY 4.0；压缩包内写 CC BY 3.0。按两者都满足的方式署名 | 已读 zenodo.org/records/1285212 |
| 大锣（tam-tam） | pjcohen，Freesound 413613、413614（经 FSD50K，DOI 10.5281/zenodo.4060432） | CC BY 4.0（Freesound 页面）；FSD50K 数据集页写「Other (Attribution)」，各条片段授权不一 | 已读 freesound.org 两条页面与 zenodo.org/records/4060432 |
| 古筝 | Pufermufin，Freesound 396868 | CC0 1.0 | 已读 freesound.org 页面 |
| 定音鼓、圆号、长号、大号、大提琴、中提琴、小提琴、低音提琴、竖琴 | VSCO-2-CE（SFZ 1.1.0），录音 Sam Gossner、Simon Dalzell，切样 Elan Hickler／Soundemote | CC0 1.0 | 已读 github.com/sgossner/VSCO-2-CE 与 LICENSE 原文，副本 `licenses/CC0-1.0_VSCO-2-CE.txt` |
| 合唱底层（仅 52 号音色） | MuseScore_General：Frank Wen 2000-02（FluidR3）、Michael Cowgill 2014-17、S. Christian Collins 2018-19，另含 Ethan Winer 2002、Michael Schorsch 2016 的音色 | MIT | 已读 ftp.osuosl.org 上的授权原文，副本 `licenses/MIT_MuseScore_General.md` |
| 编钟、磬、大鼓、合唱主层、箫、笙、风、混响 | 本项目 `audio/*.py` 合成 | Apache-2.0 | 自有 |

采样文件不在本仓库里，仓库里只有渲染后的声音。要重做配乐，把 [soundfonts-v1](https://github.com/dososo/blcaptain-code-band/releases/tag/soundfonts-v1) 的音色文件放进 `samples/`，或用环境变量 `TG_SAMPLES` 指到它们所在的文件夹。

## 四、字体

| 字体 | 用途 | 授权 | 核验 |
|---|---|---|---|
| Noto Serif SC 2.003（Adobe 版权声明见字体元数据） | 字幕、片名、漫游页界面、首页与封面（子集） | SIL OFL 1.1，页面文本未声明保留字体名 | 已读 notofonts/noto-cjk 的 Serif/LICENSE，副本 `licenses/OFL-1.1_NotoSerifSC.txt` |
| 霞鹜文楷 LXGW WenKai 1.530（LXGW；The Klee Project Authors） | 匾额题字（32 字形子集） | SIL OFL 1.1；保留字体名「霞鹜」「霞鶩」「落霞孤鹜」「落霞孤鶩」「LXGW」，另有附加许可：为网页字体而做的子集、WOFF2 转换可以沿用原名 | 已读 lxgw/LxgwWenKai 的 OFL.txt，副本 `licenses/OFL-1.1_LXGWWenKai.txt` |

## 五、文字与典故

- 字幕文字出自《西游记》第四回，逐字核对自维基文库 `西遊記/第004回`（oldid 2449093），转为简体，去标点。原著是明代作品，早已过著作权保护期；维基文库页面没有写明底本，站点整理文字按 CC BY-SA 4.0 提供。本片只用原著原句，共 13 处字幕。
- 「宝玉妆成」的「妆」，维基文库本作「粧」，两字通。
- 「三十三座天宫」「七十二重宝殿」的各宫殿名取自同回原文；画面没有逐座对应，是意象化处理。
- 画面的四种画法（水墨、青绿、金碧、藻井）、浑天仪、三足乌、玉兔、蟠龙柱、飞天、斗拱等均按传统形制由代码重新造型，没有临摹任何一部影视、动画或游戏里的天宫。

## 六、制作工具（不随仓库分发）

| 工具 | 授权 | 核验 |
|---|---|---|
| Google Chrome 158（ANGLE Metal） | 专有软件，作渲染宿主 | 未复核条款，待确认 |
| Playwright 1.58.0 | Apache-2.0 | 已读本机安装包内 LICENSE |
| bun 1.3.13 | MIT（内含 LGPL-2 的 JavaScriptCore） | 已读 oven-sh/bun 的 LICENSE.md |
| ffmpeg 8.1.2（含 x264、x265） | GPL-3.0-or-later（本机构建） | 已读本机 `ffmpeg -L` 输出 |
| FluidSynth 2.6.1 | LGPL-2.1-or-later | 已读本机安装包内说明 |
| numpy、scipy、soundfile、numba | BSD 系列 | 已读本机包元数据 |
| Pillow、fonttools、brotli | MIT-CMU、MIT、MIT | 已读本机包元数据 |

GPL／LGPL 工具只作为外部程序调用，代码没有并入本项目。
H.264／HEVC／AAC 的专利许可与发行方式有关，商用发行前请自行确认（待确认）。
