# poster-prompt.md — pptxgenjs フライヤー生成スキル

> 前提：`.claude/skills/stall-info.md` の情報を参照する。
> 出力形式：pptxgenjs で生成した .pptx（3案・3スライド・1ファイル）
> 画像素材フォルダ：`images/hotdog/`（ホットドッグ画像）、`images/people/`（人物画像）

---

## ━━━ 根本原則：凡庸を殺せ ━━━

**以下はすべて禁止。やった時点でリセットして作り直す。**

- 「上に写真／中にキャッチ／下に情報」の三段構成
- 白または薄いベージュの地色に普通サイズのテキスト
- 人物写真を「とりあえず右に置く」配置
- ホットドッグ画像を小さなアクセントとして添える扱い
- 3案が「同じ構造の色違い」になること
- 情報をただ並べただけのレイアウト

**「見た人が一瞬で止まる」強度を最低ラインとする。**
構図・フォントサイズ・色・画像の扱い、何もかも自由。
縦書き・斜め・断ち落とし・特大タイポ・全面色面・透かし文字・コラージュ・
重ね・はみ出し・回転——迷ったら「やりすぎ」の方を選べ。

---

## STEP 0 ── 素材スキャン（生成前に必ず実行）

```js
const fs = require('fs');
const path = require('path');

function scanImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
    .map(f => path.join(dir, f));
}

const hotdogImgs = scanImages('images/hotdog');
const peopleImgs = scanImages('images/people');
```

### ホットドッグ画像は「全案必須・主役扱い」

| 案 | ホットドッグの役割 | 禁止 |
|---|---|---|
| ①ダイナー | 画面の1/3以上を占める断ち落とし or 浮遊感のある特大配置 | 吹き出しの中に小さく収める |
| ②黒板 | チョーク枠でクローズアップ。パンの断面・ソーセージの質感が見えるサイズ | 人物より小さい |
| ③サイバー | 回転＋はみ出し。色面の境界を食い破るように配置 | 情報カードの横に添える程度 |

ホットドッグ画像がない場合のみ 🌭 絵文字（200pt）で代替。省略は絶対にしない。

### 人物画像の扱い

- 腕を伸ばしているなら：その先にホットドッグを配置する
- 顔のクローズアップが強いなら：背景に大きく敷いてタイポで突き破る
- 全身ポーズなら：断ち落としでスライド外にはみ出させる
- 複数枚あれば：重ねてコラージュ or 案ごとに使い分け

---

## STEP 1 ── pptxgenjs セットアップ

```js
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();

pptx.defineLayout({ name: 'A4', width: 8.27, height: 11.69 });
pptx.layout = 'A4';
```

**全案共通ルール**

| ルール | 詳細 |
|---|---|
| `hex` に `#` を付けない | pptxgenjs 仕様 |
| 8桁 hex 禁止 | 透明度は `transparency` / `opacity` で指定 |
| 画像は必ず `sizing:{type:'cover'\|'contain', w, h}` | `path` 単体指定は縦横比が崩れる |
| 円形抜きは正方形領域を `cover` → `rounding:true` | 非正方形だと楕円になる |
| 人物写真は必ず `sizing:{type:'contain'}` | `cover` は人物を引き伸ばすため禁止。背景断ち落とし専用 |
| トッピングのグラム表記（〇g）禁止 | 掲示用ポスターに不要。「ケチャップ」名称のみ記載 |
| `shadow` 等オブジェクトは毎回 `{}` で新規生成 | 共有参照バグ防止 |
| 断ち落としは座標負値 or W/H 超でよい | スライド外へのはみ出し意図的に使う |
| 地色が明るい面に白文字禁止 / 暗い面に黒文字禁止 | コントラスト確保 |

---

## STEP 2 ── 3案の実装

> **3案は「別の感情体験」であること**
>
> 案①：「背景そのものが叫んでいる」——情報はその中に浮かぶ
> 案②：「手で書かれた・貼られた」——物質感・温度感がある
> 案③：「タイポと色面のエネルギーが衝突している」——静止画なのに動いて見える

---

### ── 案① アメリカンダイナー ──

**スタイル：1950〜60年代レトロダイナー。チェッカーフロア柄、太ゴシック、赤×白×黒×ターコイズ。**

**カラーパレット**

| 役割 | HEX | 説明 |
|---|---|---|
| チェッカーA | `D42B2B` | ケチャップ赤（主役。参考：`E53935`） |
| チェッカーB | `E8A010` | マスタード黄（参考：`FFC107`） |
| 白 | `FFFFFF` | 文字・カード地 |
| ターコイズ | `40E0D0` | 補色アクセント（参考：`00CED1`） |
| 黒 | `1A1A1A` | 文字・影 |

**フォント**：Impact極太（英字・数字）/ Great Vibes筆記体（屋台名のみ）  
**サイズ比**：見出し36pt：本文12pt（3:1）  
**テキスト効果**：ドロップシャドウ（黒、opacity 50〜70%、blur 3px、offset 2px）+ 白縁2px

**大仕掛け：チェッカーフラッグ全面＋ホットドッグが画面を食い破る**

```
[チェッカー背景 全面・8×12タイル]
  ├─ ホットドッグPNG：左側から断ち落とし。x=-0.3 y=2.5 w=6.2 h=4.5 contain
  │   └ 上に特大「¥200」（Impact 100pt, FFFFFF, 赤shadow）
  ├─ 人物PNG：右側断ち落とし contain / 腕がホットドッグ方向
  ├─ 屋台名：Great Vibes 38pt FFFFFF 左上斜め
  ├─ しずる文 22pt FFFFFF（独立行）
  └─ 白カード（角丸・赤枠）: 下部に日付・場所・メニュー集約（30pt+）
```

```js
const slide1 = pptx.addSlide();

// チェッカー背景
const COLS = 8, ROWS = 12;
const tileW = 8.27 / COLS, tileH = 11.69 / ROWS;
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    slide1.addShape(pptx.ShapeType.rect, {
      x: c * tileW, y: r * tileH, w: tileW, h: tileH,
      fill: { color: (r + c) % 2 === 0 ? 'D42B2B' : 'E8A010' },
      line: { type: 'none' }
    });
  }
}

// 暗色オーバーレイ帯（下部情報ゾーン用）
slide1.addShape(pptx.ShapeType.rect, {
  x: 0, y: 6.8, w: 8.27, h: 4.89,
  fill: { color: '1A1A1A', transparency: 55 }, line: { type: 'none' }
});

// ホットドッグ：大きく・はみ出す勢い（contain必須）
if (hotdogImgs[0]) {
  slide1.addImage({
    path: hotdogImgs[0],
    x: -0.3, y: 2.5, w: 6.2, h: 4.5,
    sizing: { type: 'contain', w: 6.2, h: 4.5 }
  });
}

// ¥200 特大
slide1.addText('¥200', {
  x: 0.1, y: 3.2, w: 4.5, h: 1.6,
  fontSize: 100, bold: true, color: 'FFFFFF',
  fontFace: 'Impact',
  shadow: { type: 'outer', color: 'D42B2B', blur: 6, offset: 4, angle: 45 }
});

// 人物：右断ち落とし（contain必須・cover禁止）
if (peopleImgs[0]) {
  slide1.addImage({
    path: peopleImgs[0],
    x: 4.0, y: -0.5, w: 5.0, h: 12.8,
    sizing: { type: 'contain', w: 5.0, h: 12.8 }
  });
}

// 屋台名（筆記体）
slide1.addText('おいしいホットドック屋さん', {
  x: 0.2, y: 0.3, w: 5.5, h: 0.9,
  fontSize: 28, color: 'FFFFFF', fontFace: 'Great Vibes', italic: true,
  shadow: { type: 'outer', color: '000000', blur: 3, offset: 2, angle: 45 }
});

// しずる（独立行・22pt）
slide1.addText('外はぱりっ、中はジューシー。', {
  x: 0.2, y: 1.5, w: 4.5, h: 0.7,
  fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Impact',
  shadow: { type: 'outer', color: '000000', blur: 3, offset: 2, angle: 45 }
});

// 白カード（メニュー＋イベント情報）
slide1.addShape(pptx.ShapeType.roundRect, {
  x: 0.2, y: 7.2, w: 7.87, h: 4.2,
  fill: { color: 'FFFFFF' }, line: { color: 'D42B2B', width: 2.5 },
  rectRadius: 0.15
});
slide1.addText(
  'ホットドッグ ¥200　現金のみ\nトッピング全部無料！\nケチャップ・マスタード・マヨネーズ\n各「普通」「多め」が選べます\n\n10月16日（土）\n4年S科教室',
  {
    x: 0.4, y: 7.35, w: 7.5, h: 3.9,
    fontSize: 30, color: '1A1A1A', valign: 'top', align: 'left',
    bold: true, paraSpaceAfter: 6
  }
);
```

---

### ── 案② 黒板チョーク ──

**スタイル：カフェメニューボード調。暗緑の黒板地に白・パステルの手書き文字。円形フレーム・リボン多用。**

**カラーパレット**

| 役割 | HEX | 説明 |
|---|---|---|
| 黒板 | `1E3A1E` | 黒板グリーン（別案：`2C6B6A`） |
| チョーク白 | `FAF5E4` | クリーム白（メイン文字。参考：`F0F0F0`） |
| 黄緑 | `8DB36A` | デコアクセント（参考：`A5D6A7`） |
| 淡黄 | `FFF9C4` | 補色 |
| サーモン | `FF8A80` | ポイントアクセント |

**フォント**：Yomogi（全文字・手書き感）/ 別案：Chalkboard / Chalkduster  
**サイズ比**：見出し30pt：本文14pt（2:1）  
**テキスト効果**：
- チョーク粉感 → `shadow: { type:'outer', color:'FFFFFF', blur:3, offset:0, angle:0 }`
- 文字の透過5〜15%で粉っぽさを演出
- 枠に `shadow: { type:'inner', color:'FFFFFF', blur:3, offset:0 }` で内側光彩

**大仕掛け：ホットドッグをチョーク枠で"黒板に描いた料理図"として中央主役に**

```
[黒板グリーン 全面]
  ├─ ホットドッグPNG：中央大判 w=6.5 h=4.8 contain（二重矩形枠）
  ├─ 「¥200」：Yomogi 88pt FAF5E4 ホットドッグ上にかぶせ transparency:15
  ├─ 「ほかほか」34pt FFF9C4 独立浮遊ビジュアル（rotate:5°）
  ├─ 人物PNG（あれば）：右端円形抜き（小〜中サイズ）
  ├─ 「本日のメニュー」：左端縦書き（vert:eaVert）
  ├─ 「10.16」80pt 背景デザイン要素
  └─ トッピング・日付・場所 30pt+（下部）
```

```js
const slide2 = pptx.addSlide();

// 黒板全面
slide2.addShape(pptx.ShapeType.rect, {
  x: 0, y: 0, w: 8.27, h: 11.69,
  fill: { color: '1E3A1E' }, line: { type: 'none' }
});

// ホットドッグ：中央大判
if (hotdogImgs[0]) {
  slide2.addImage({
    path: hotdogImgs[0],
    x: 0.9, y: 2.2, w: 6.5, h: 4.8,
    sizing: { type: 'contain', w: 6.5, h: 4.8 }
  });
}

// チョーク風二重矩形枠
slide2.addShape(pptx.ShapeType.roundRect, {
  x: 0.75, y: 2.05, w: 6.77, h: 5.1,
  fill: { type: 'none' }, line: { color: 'FAF5E4', width: 3 },
  rectRadius: 0.08,
  shadow: { type: 'inner', color: 'FFFFFF', blur: 3, offset: 0, angle: 0 }
});
slide2.addShape(pptx.ShapeType.roundRect, {
  x: 0.62, y: 1.92, w: 7.03, h: 5.36,
  fill: { type: 'none' }, line: { color: 'FAF5E4', width: 1.2, transparency: 30 },
  rectRadius: 0.1
});

// ¥200 特大（ホットドッグの上にかぶせ）
slide2.addText('¥200', {
  x: 0.9, y: 2.4, w: 3.5, h: 1.8,
  fontSize: 88, bold: true, color: 'FAF5E4', fontFace: 'Yomogi',
  transparency: 15,
  shadow: { type: 'outer', color: 'FFFFFF', blur: 3, offset: 0, angle: 0 }
});

// 「ほかほか」単体しずる（独立浮遊ビジュアル要素）
slide2.addText('ほかほか', {
  x: 5.2, y: 1.2, w: 3.0, h: 0.85,
  fontSize: 34, bold: true, color: 'FFF9C4', fontFace: 'Yomogi',
  rotate: 5,
  shadow: { type: 'outer', color: 'FFFFFF', blur: 4, offset: 0, angle: 0 }
});

// 枠外の手書きデコ
slide2.addText('← コレ！ ★', {
  x: 0.1, y: 4.5, w: 1.8, h: 0.6,
  fontSize: 16, color: '8DB36A', fontFace: 'Yomogi', rotate: -12
});
slide2.addText('↑ うまい！', {
  x: 3.5, y: 7.25, w: 2.5, h: 0.6,
  fontSize: 14, color: 'FAF5E4', fontFace: 'Yomogi',
  shadow: { type: 'outer', color: 'FFFFFF', blur: 2, offset: 0, angle: 0 }
});

// 人物（あれば）：右端 円形抜き（contain不可→cover+rounding）
if (peopleImgs[0]) {
  slide2.addImage({
    path: peopleImgs[0],
    x: 5.8, y: 0.4, w: 2.2, h: 2.2,
    sizing: { type: 'cover', w: 2.2, h: 2.2 },
    rounding: true
  });
  slide2.addShape(pptx.ShapeType.ellipse, {
    x: 5.72, y: 0.32, w: 2.36, h: 2.36,
    fill: { type: 'none' }, line: { color: 'FAF5E4', width: 2.5 }
  });
}

// 縦書き「本日のメニュー」
slide2.addText('本日のメニュー', {
  x: 0.05, y: 1.2, w: 0.65, h: 5.5,
  fontSize: 13, color: 'FAF5E4', fontFace: 'Yomogi',
  vert: 'eaVert', valign: 'top'
});

// しずる文（独立行）
slide2.addText('もちふわパンに粗びきウィンナが暴れる。', {
  x: 0.8, y: 0.3, w: 5.0, h: 1.0,
  fontSize: 22, color: 'FAF5E4', fontFace: 'Yomogi', italic: true,
  shadow: { type: 'outer', color: 'FFFFFF', blur: 2, offset: 0, angle: 0 }
});

// 「10.16」大きなデザイン要素
slide2.addText('10.16', {
  x: 0.5, y: 7.6, w: 4.0, h: 1.4,
  fontSize: 80, bold: true, color: 'FAF5E4', fontFace: 'Yomogi',
  transparency: 12
});

// トッピング・詳細情報（30pt+）
slide2.addText('ケチャップ　マスタード　マヨネーズ', {
  x: 0.7, y: 9.1, w: 6.9, h: 0.7,
  fontSize: 26, color: 'FAF5E4', fontFace: 'Yomogi', align: 'center'
});
slide2.addText('3種すべて 無料！', {
  x: 0.7, y: 9.85, w: 6.9, h: 0.65,
  fontSize: 28, bold: true, color: '8DB36A', fontFace: 'Yomogi', align: 'center'
});
slide2.addText('10月16日（土）　4年S科教室　現金のみ', {
  x: 0.7, y: 10.6, w: 6.9, h: 0.75,
  fontSize: 22, color: 'FAF5E4', fontFace: 'Yomogi', align: 'center'
});
```

---

### ── 案③ ネオンサイバー ──

**スタイル：80〜90年代SF映画・Synthwave・Cyberpunk。濃紫黒背景にネオン発光テキスト、スキャンライン、パースのかかったグリッドフロア。**

**カラーパレット**

| 役割 | HEX | 説明 |
|---|---|---|
| 背景 | `0A0012` | ほぼ黒の深紫（参考：`0B0026`） |
| ネオンピンク | `FF2D78` | 主役・見出しグロー（参考：`FF007F`） |
| シアン | `00F5FF` | グリッド・サブテキスト（参考：`00FFFF`） |
| ネオンパープル | `B026FF` | スキャンライン・デコ（参考：`F222FF`） |
| ライムグリーン | `CCFF00` | "FREE"・アクセント（参考：`66FF00`） |
| 白 | `FFFFFF` | 本文 |

**フォント**：Impact極太（英字・主役テキスト）+ 日本語ゴシック太字  
参考フォント（開発環境にある場合）：Orbitron、Exo 2.0 Bold、Press Start 2P  
**サイズ比**：見出し36pt：本文9pt（4:1）  
**グロー効果（pptxgenjsでshadow代替）**：
- `shadow: { type: 'outer', color: '色と同色', blur: 20〜26, offset: 0, angle: 0 }`
- blur大＋offset:0 = ネオン管発光（opacity 70〜100%に相当）
- ドロップシャドウは薄め：offset 1〜2px、blur 2〜4px

**スキャンライン**：1px 等間隔（ピッチ約0.28in）横幅いっぱい、B026FF、transparency:88

**大仕掛け：黒紫背景＋スキャンライン＋グリッドフロアで「夜のゲームセンター」感**

```
[0A0012 全面背景]
[B026FF スキャンライン: 横細線 0.28in間隔 transparency:88]
[00F5FF グリッドフロア: 下部収束水平線18本 + 縦線5本 透過漸減]

上部（y:0〜2.5）:
  ├─ 「じゅわっ」52pt FF2D78 glow（空間に浮遊するビジュアル要素）
  ├─ 「ぱりっ」40pt 00F5FF glow、rotate:5°
  └─ 「ジューシー」34pt CCFF00 glow、rotate:-4°

中部（y:2.3〜6.5）:
  ├─ ホットドッグPNG: w=5.5 h=4.0 contain、00F5FF glow
  ├─ 人物PNG: 右側 w=4.3 h=7.2 contain、FF2D78 glow
  ├─ "HOT DOG" 透過タイポ 100pt FF2D78 rotate:-8° 背景装飾
  └─ ¥200 100pt FFFFFF + FF2D78 glow(blur:26)

下部情報ゾーン（y:6.3〜11.5）:
  ├─ トッピング3種 26pt 00F5FF glow（グラム表記なし）
  ├─ 「▶ ALL FREE ◀」40pt CCFF00 glow
  ├─ 「10月16日（土）」44pt FF2D78 glow 中央
  └─ 「4年S科教室」30pt 白 00F5FF glow
```

```js
const slide3 = pptx.addSlide();

// 背景
slide3.addShape(pptx.ShapeType.rect, {
  x: 0, y: 0, w: 8.27, h: 11.69,
  fill: { color: '0A0012' }, line: { type: 'none' }
});

// スキャンライン（0.28in間隔、B026FF transparency:88）
for (let y = 0; y < 11.7; y += 0.28) {
  slide3.addShape(pptx.ShapeType.line, {
    x: 0, y, w: 8.27, h: 0,
    line: { color: 'B026FF', width: 0.3, transparency: 88 }
  });
}

// グリッドフロア（下部収束 水平線、下にいくほど濃い）
const gridFloor = [
  { y: 6.2, t: 82 }, { y: 7.0, t: 76 }, { y: 7.7, t: 70 },
  { y: 8.35, t: 64 }, { y: 8.9, t: 58 }, { y: 9.35, t: 52 },
  { y: 9.72, t: 46 }, { y: 10.05, t: 40 }, { y: 10.32, t: 34 },
  { y: 10.55, t: 28 }, { y: 10.74, t: 22 }, { y: 10.9, t: 16 },
  { y: 11.04, t: 12 }, { y: 11.16, t: 8 }, { y: 11.27, t: 5 },
  { y: 11.37, t: 3 }, { y: 11.46, t: 2 }, { y: 11.55, t: 1 },
];
gridFloor.forEach(({ y, t }) => {
  slide3.addShape(pptx.ShapeType.line, {
    x: 0, y, w: 8.27, h: 0,
    line: { color: '00F5FF', width: 0.6, transparency: t }
  });
});
// 縦線
[1.24, 2.48, 4.135, 5.79, 7.03].forEach(x => {
  slide3.addShape(pptx.ShapeType.line, {
    x, y: 6.2, w: 0, h: 5.49,
    line: { color: 'B026FF', width: 0.4, transparency: 72 }
  });
});

// "HOT DOG" 背景装飾タイポ（透過・回転）
slide3.addText('HOT DOG', {
  x: -1.0, y: 3.5, w: 11.0, h: 2.5,
  fontSize: 100, bold: true, color: 'FF2D78',
  fontFace: 'Impact', rotate: -8, transparency: 78
});

// しずるオノマトペ浮遊（大きな独立ビジュアル要素）
slide3.addText('じゅわっ', {
  x: 0.2, y: 0.35, w: 4.0, h: 1.0,
  fontSize: 52, bold: true, color: 'FF2D78',
  shadow: { type: 'outer', color: 'FF2D78', blur: 22, offset: 0, angle: 0 }
});
slide3.addText('ぱりっ', {
  x: 4.5, y: 0.7, w: 3.5, h: 0.8,
  fontSize: 40, bold: true, color: '00F5FF', rotate: 5,
  shadow: { type: 'outer', color: '00F5FF', blur: 20, offset: 0, angle: 0 }
});
slide3.addText('ジューシー', {
  x: 0.2, y: 1.45, w: 5.0, h: 0.75,
  fontSize: 34, bold: true, color: 'CCFF00', rotate: -4,
  shadow: { type: 'outer', color: 'CCFF00', blur: 18, offset: 0, angle: 0 }
});

// ホットドッグ（シアングロー）
if (hotdogImgs[0]) {
  slide3.addImage({
    path: hotdogImgs[0],
    x: 0.3, y: 2.3, w: 5.5, h: 4.0,
    sizing: { type: 'contain', w: 5.5, h: 4.0 },
    shadow: { type: 'outer', color: '00F5FF', blur: 24, offset: 0, angle: 0 }
  });
}

// 人物（contain必須・ピンクグロー）
if (peopleImgs[0]) {
  slide3.addImage({
    path: peopleImgs[0],
    x: 4.2, y: 1.8, w: 4.3, h: 7.2,
    sizing: { type: 'contain', w: 4.3, h: 7.2 },
    shadow: { type: 'outer', color: 'FF2D78', blur: 28, offset: 0, angle: 0 }
  });
}

// ¥200 特大ネオン
slide3.addText('¥200', {
  x: 0.1, y: 3.8, w: 5.0, h: 1.7,
  fontSize: 100, bold: true, color: 'FFFFFF', fontFace: 'Impact',
  shadow: { type: 'outer', color: 'FF2D78', blur: 26, offset: 0, angle: 0 }
});

// 屋台名（シアン小文字）
slide3.addText('おいしいホットドック屋さん', {
  x: 0.2, y: 5.65, w: 5.5, h: 0.55,
  fontSize: 16, bold: true, color: '00F5FF',
  shadow: { type: 'outer', color: '00F5FF', blur: 10, offset: 0, angle: 0 }
});

// しずる文（独立行）
slide3.addText('かじった瞬間、じゅわっとあふれる。', {
  x: 0.2, y: 6.3, w: 6.0, h: 0.6,
  fontSize: 19, bold: true, color: 'FFFFFF',
  shadow: { type: 'outer', color: 'FF2D78', blur: 8, offset: 0, angle: 0 }
});

// トッピング3種（グラム表記なし・26pt）
['ケチャップ', 'マスタード', 'マヨネーズ'].forEach((t, i) => {
  slide3.addText(t, {
    x: 0.25 + i * 2.63, y: 7.05, w: 2.55, h: 0.65,
    fontSize: 26, bold: true, color: '00F5FF', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: '00F5FF', blur: 14, offset: 0, angle: 0 }
  });
});

// ALL FREE（40pt）
slide3.addText('▶  ALL FREE  ◀', {
  x: 0.25, y: 7.72, w: 7.77, h: 0.88,
  fontSize: 40, bold: true, color: 'CCFF00', fontFace: 'Impact', align: 'center',
  shadow: { type: 'outer', color: 'CCFF00', blur: 20, offset: 0, angle: 0 }
});

// 日付（44pt）
slide3.addText('10月16日（土）', {
  x: 0.25, y: 8.7, w: 7.77, h: 0.9,
  fontSize: 44, bold: true, color: 'FF2D78', fontFace: 'Impact', align: 'center',
  shadow: { type: 'outer', color: 'FF2D78', blur: 22, offset: 0, angle: 0 }
});

// 場所（30pt）
slide3.addText('4年S科教室', {
  x: 0.25, y: 9.65, w: 5.5, h: 0.65,
  fontSize: 30, bold: true, color: 'FFFFFF', fontFace: 'Impact',
  shadow: { type: 'outer', color: '00F5FF', blur: 12, offset: 0, angle: 0 }
});
slide3.addText('現金のみ', {
  x: 5.9, y: 9.65, w: 2.1, h: 0.65,
  fontSize: 22, bold: true, color: 'CCFF00', fontFace: 'Impact', align: 'right',
  shadow: { type: 'outer', color: 'CCFF00', blur: 10, offset: 0, angle: 0 }
});
```

---

---

## [v2] ディープリサーチ反映 ── 刷新3案

> ディープリサーチ（2026-06-29）の知見を基に v2 の設計方針を定義。
> `generate-flyer-02.js` 生成時はここを参照する。

---

### ── v2-案① 本気系（黒×蛍光イエロー×人物全面）──

**参考構図：スティーブ・マックイーン風 / コンサート告知ポスター**
- 人物をフレームいっぱいに配置し、黒背景でコントラスト最大化
- 写真が舞台、コピーが主役（コピーで見せる、人物は迫力を添える）
- 人物の視線・手の向きにコピーを配置（視線誘導）
- 黒背景×蛍光黄は完全な漆黒(`111111`)が必須（灰色化でコントラスト激減）

**NG一覧（黒背景の失敗例）**
- 背景が灰色になる（照明漏れ感）→ `111111` 固定
- 黒髪・黒服が背景に溶ける → 人物に白いリムライトshadow（`FFFFFF`, blur:30〜40, offset:0）で輪郭分離
- 文字が人物の顔・手の明るい部分に重なる → 顔・手の上には文字を置かない。置く場合は `shadow` + 黒縁取り
- 蛍光色を3色以上使う → 蛍光は1〜2色に絞る（多いとチープ）

**カラーパレット**

| 役割 | HEX | 備考 |
|---|---|---|
| 背景 | `111111` | 完全漆黒 |
| メインコピー | `FFFF00` | 蛍光イエロー・主役 |
| ¥200 | `FF2200` | 赤・特大インパクト |
| 本文 | `FFFFFF` | 白 |

**構図**
```
[111111 全面]
  ├─ 人物PNG：全面 contain（addContainヘルパー使用・vAlign:top）
  │   └ 白リムライトshadow (FFFFFF, blur:35, offset:0) で輪郭浮かせ
  ├─ 上部黒グラデ帯（テキスト可読性のため）
  ├─ 「高専生が本気で焼いてます。」52pt FFFF00 Impact（2行・蛍光グロー）
  │   └ 人物の視線や動きの方向に向かって配置
  ├─ ホットドッグPNG：右下エリア（人物の前景）
  ├─ ¥200 140pt FF2200 Impact（左中央〜下・画面の40%占有）
  └─ 下部情報帯（日付・場所・トッピング）
```

---

### ── v2-案② ドドン深紅（¥200を人物の手で"持つ"演出）──

**参考：大型セール広告 / スポーツイベント告知**
- 数字（¥200）が主役ビジュアル。人物は舞台背景
- 人物が手を前に差し出すポーズ → その手の高さに¥200を重ねる（手渡し感・提示感）
- 深紅（`8B0000`）は高級感・重厚感。明るい赤より落ち着いたシリアスさ
- 蛍光黄は彩度を少し抑えた `FFE600` がベター（警告標識感を避ける）

**¥200のドドン感チェックポイント**
- 文字は155pt以上・画面の40〜50%占有
- ドロップシャドウを強めに（黒 blur:8, offset:3〜4px）
- 縁取り効果: 白いshadow（blur:2, offset:0）で文字が顔に重なっても可読性を保つ
- slight傾き（rotate: -3〜5度）で躍動感・「ドンッ」感が増す

**カラーパレット**

| 役割 | HEX | 備考 |
|---|---|---|
| 背景 | `8B0000` | 深紅・重厚感 |
| ¥200 | `FFE600` | 彩度抑えめ蛍光黄（警告標識感を避ける） |
| メインコピー | `FFFFFF` / `FFE600` | 白とのコンビ |
| 強調 | `FFFF00` | 「FREE」等の極強調のみ |

**構図**
```
[8B0000 全面] + [黒透過オーバーレイ（引き締め）]
  ├─ ホットドッグPNG：右上（人物より先に配置してz-order下）
  ├─ 人物PNG：左寄り 全高 contain（addContainヘルパー hAlign:left）
  ├─ 上部「このホットドッグ、本気です。」コピー
  ├─ ¥200 155pt FFE600 Impact
  │   └ 人物の手の高さに合わせて配置（手渡し感）
  │   └ rotate: -3〜5 で躍動感
  │   └ shadow: 白縁(blur:2) + 黒落ち影(blur:10, offset:4)
  ├─ しずる文 26pt 白
  └─ 下部情報帯（TOPPING ALL FREE / 日付 / 場所）
```

---

### ── v2-案③ 映画ポスターネタ（シリアス×アクション風パロディ）──

**ジャンル：シリアス・アクション風が最もギャップが大きく笑いを誘う**
理由：重厚な色使い・フォントで「本物感」を出してから「高専屋台」が来る破壊力が最大。
ホラー風は意外性があるがニッチ。ラブコメ風は可愛いがインパクト弱め。

**本物映画ポスターの構成要素（再現して「二度見ネタ」を作る）**

| 要素 | 映画本物 | このポスターでの置き換え |
|---|---|---|
| 配給・製作クレジット（最上部） | 制作会社名 | 旭川高専 システム制御情報工学科 4年 制作 |
| 冠詞 | 「劇場版」「完全版」 | 「劇場版」（左上小さく） |
| あおり文 | 「○○が今、○○する」 | 「この200円が、伝説となる。」 |
| メインタイトル | 映画名 Impact 大 | 「おいしいホットドック屋さん」 |
| サブタイトル | 〜篇 | 「〜 ¥200の衝撃、学祭に降り立つ 〜」 |
| キャスト・監督クレジット（下部） | 俳優名／監督名 | 「出演：旭川高専4年生全員　特別出演：ホットドッグ」 |
| 公開日 | 「○月○日（曜）全国ロードショー」 | 「2026年10月16日（土） 絶賛公開中」 |
| 上映場所 | 劇場名 | 「4年S科教室（全館解放）」 |
| 鑑賞料 | 「一般¥1,900」 | 「鑑賞料：¥200（税込・現金のみ）」 |

**おすすめギャグコピー案（poster-prompt.md STEP 3 [D]も参照）**
- あおり文: 「この200円が、伝説となる。」「高専生が本気で焼く、青春の一皿。」
- キャスト: 「出演：旭川高専4年生全員 / 特別出演：ホットドッグ（本人役）」
- 「※本作は実話に基づいています」

**配色**
```
黒（0A0A0A）× 白（FFFFFF）× 深紅（CC0000）
タイトル: 白 Impact + CC0000 glow
あおり文: 白 italic
クレジット行: グレー（AAAAAA）小さく横並び
```

---

## STEP 3 ── コピー素材バンク

各案で別のものを使う。同じコピーを2案以上で使い回すな。

### [A] キャッチコピー（15字前後）
- 「焼きたてが、待ってる。」
- 「¥200で、幸せになれる。」
- 「一口で、学祭が変わる。」
- 「このホットドッグ、本気です。」
- 「高専生が本気で焼いてます。」

### [B] サブコピー（25〜35字）
- 「ぱりっと焼いたソーセージを、ふわふわパンでギュッと。」
- 「こだわりの粗びきウィンナ、スリットロールに挟んでどうぞ。」
- 「高専生が本気で焼く、200円の本格派。」

### [C] しずる（オノマトペ必須・独立ビジュアル要素として40〜60pt）

**オノマトペ単体（大きな独立要素として空間に配置せよ）**
- 「じゅわっ」— 肉汁・うまみ
- 「ぱりっ」— 焼き目・食感
- 「ほかほか」— 温度・湯気
- 「ジューシー」— 英字混じりで勢いを出す

**しずる文（20〜28pt 独立行。ブロック文章に埋めるな）**
- 「外はぱりっ、中はジューシー。」
- 「かじった瞬間、じゅわっとあふれる。」
- 「もちふわパンに粗びきウィンナが暴れる。」
- 「ほかほか湯気の向こうに、でかいうまさ。」
- 「噛んだら終わり、もう一本食べたくなる。」
- 「ぱちぱちはじける肉汁。ほかほかスリットロール。」

**案ごとのしずる割り当て（使い回し禁止）**

| 案 | 優先しずる |
|---|---|
| ①ダイナー | 「外はぱりっ、中はジューシー。」＋「噛んだら終わり、もう一本食べたくなる。」 |
| ②黒板 | 「もちふわパンに粗びきウィンナが暴れる。」＋「ほかほか」単体を空間に浮かせる |
| ③サイバー | 「じゅわっ」「ぱりっ」「ジューシー」単体を40〜60ptで空間配置 ＋「かじった瞬間、じゅわっとあふれる。」 |

---

## STEP 4 ── 保存・出力

```js
pptx.writeFile({ fileName: 'flyers/hotdog-flyer-3plans.pptx' });
```

- 保存先：`flyers/` フォルダ
- **pptx は何度でも上書き生成して改良を重ねてよい**
- `index.html` へのカード追加・JPG変換は **ユーザーが明示的に承認したときだけ** 行う
- 承認前は index.html を書き換えない

---

## STEP 5 ── QAチェックリスト（生成後に自己確認）

```
□ ホットドッグ画像が全3案に必ず使われているか（省略 = やり直し）
□ ¥200 が全案でヒーロー扱いされているか（小さく添えるだけ = NG）
□ トッピング3種が全案に記載されているか（グラム表記は禁止）
□ 「10月16日（土）」と「4年S科教室」が全案にあるか
□ しずるオノマトペ or しずる文が各案で独立した大きなテキスト要素として使われているか
□ 人物写真に sizing:'contain' を使っているか（cover で引き伸ばし = やり直し）
□ ホットドッグ画像の縦横比が崩れていないか（sizing必須）
□ 日付・場所・トッピングが30pt以上の独立テキストになっているか（10〜14ptの情報ブロック = NG）
□ 3案の構図が互いに完全に別物か（色違いは NG）
□ 地色×文字色のコントラストが確保されているか
□ 各案の「大胆な仕掛け」が機能しているか
□ hex に # が混入していないか
□ shadow 等オブジェクトを共有参照していないか
□ 3案どれも「上に写真／中にキャッチ／下に情報」になっていないか
```

---

## STEP 6 ── フォント案内

pptxgenjs はフォントを埋め込まないため、受け取り側の環境にフォントがない場合は代替フォントで表示される。

**フォント取得（Linux/Mac）**
```sh
mkdir -p ~/.fonts
curl -sL https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf \
  -o ~/.fonts/GreatVibes-Regular.ttf
curl -sL https://raw.githubusercontent.com/google/fonts/main/ofl/yomogi/Yomogi-Regular.ttf \
  -o ~/.fonts/Yomogi-Regular.ttf
fc-cache -f ~/.fonts
```

**配布前に PowerPoint で「フォントを埋め込む」を有効化すること。**  
（ファイル → オプション → 保存 → 「ファイルにフォントを埋め込む」にチェック）

---

## 汎用性メモ（素材が変わったとき）

| 状況 | 対応 |
|---|---|
| 人物画像が増えた | 各案で最も構図に合う1枚を選ぶ。2枚なら重ねてコラージュ可 |
| ホットドッグ画像が複数 | 案ごとに別の1枚を割り当てる（アングル・質感で使い分け） |
| 縦長人物写真 | contain + 縦いっぱいで使う |
| 横長食材写真 | `x:0, y:N, w:8.27` で横断帯状に配置 |
| 人物がいない | SVGシルエット or 省略して食品写真とタイポだけで構成 |
| ホットドッグ画像がない | 🌭 絵文字 200pt で代替（省略は絶対にしない） |
