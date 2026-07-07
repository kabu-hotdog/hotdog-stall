// generate-flyer.js — v1 ダイナー / v2 サイバー / v3 本気系 / v4 ドドン深紅
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const { safeWriteFile } = require('./pptx-safe-write');

function getPngSize(filePath) {
  try {
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch (e) { return null; }
}

function containFit(imgW, imgH, boxW, boxH) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  return { w: imgW * scale, h: imgH * scale };
}

function addContain(slide, imgPath, boxX, boxY, boxW, boxH, opts = {}) {
  const { hAlign = 'center', vAlign = 'center', ...rest } = opts;
  const dims = getPngSize(imgPath);
  let w, h;
  if (dims) {
    const fit = containFit(dims.width, dims.height, boxW, boxH);
    w = fit.w; h = fit.h;
  } else {
    w = boxW; h = boxH;
  }
  const x = hAlign === 'left'  ? boxX :
             hAlign === 'right' ? boxX + boxW - w :
                                  boxX + (boxW - w) / 2;
  const y = vAlign === 'top'    ? boxY :
             vAlign === 'bottom' ? boxY + boxH - h :
                                   boxY + (boxH - h) / 2;
  slide.addImage({ path: imgPath, x, y, w, h, ...rest });
}

function scanImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
    .map(f => path.join(dir, f).replace(/\\/g, '/'));
}

const hotdogImgs = scanImages('images/hotdog');
const peopleImgs = scanImages('images/people');
console.log('hotdog:', hotdogImgs);
console.log('people:', peopleImgs);

// hotdogImgs[0] = チーズホットドッグ.png（アルファベット順）
// hotdogImgs[1] = ホットドッグ.png
const cheeseHotdog = hotdogImgs[0];
const plainHotdog  = hotdogImgs[1] || hotdogImgs[0];

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'A4', width: 8.27, height: 11.69 });
pptx.layout = 'A4';

const W = 8.27, H = 11.69;

// ══════════════════════════════════════════════════════════════
// v1  アメリカンダイナー
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // チェッカー背景（赤×マスタード黄）
  const COLS = 8, ROWS = 12;
  const tileW = W / COLS, tileH = H / ROWS;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      slide.addShape(pptx.ShapeType.rect, {
        x: c * tileW, y: r * tileH, w: tileW, h: tileH,
        fill: { color: (r + c) % 2 === 0 ? 'D42B2B' : 'E8A010' },
        line: { type: 'none' }
      });
    }
  }

  // "HOT DOG" 背景装飾タイポ（左斜め・透過）
  slide.addText('HOT DOG', {
    x: -1.5, y: 0.8, w: 11.0, h: 3.0,
    fontSize: 130, bold: true, color: 'FFFFFF',
    fontFace: 'Impact', rotate: -12, transparency: 82
  });

  // ターコイズ横帯（2本）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.28, w: W, h: 0.32,
    fill: { color: '40E0D0' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.72, w: W, h: 0.1,
    fill: { color: '40E0D0' }, line: { type: 'none' }
  });

  // 下部暗帯
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.6, w: W, h: H - 6.6,
    fill: { color: '0A0000', transparency: 28 }, line: { type: 'none' }
  });

  // オリジナルホットドッグ：左断ち落とし（メイン）
  if (plainHotdog) {
    addContain(slide, plainHotdog, -0.3, 2.2, 5.2, 3.9, { vAlign: 'center' });
  }
  // チーズホットドッグ：右下（サブ・人物前景）
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 4.4, 4.6, 3.6, 2.7, {
      shadow: { type: 'outer', color: 'D42B2B', blur: 10, offset: 4, angle: 45 }
    });
  }

  // ¥200 特大
  slide.addText('¥200', {
    x: 0.05, y: 2.9, w: 4.8, h: 1.8,
    fontSize: 110, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'D42B2B', blur: 8, offset: 5, angle: 45 }
  });

  // 人物：右寄せ contain
  if (peopleImgs[0]) {
    addContain(slide, peopleImgs[0], 4.0, -0.5, 4.27, 12.19, { hAlign: 'right', vAlign: 'top' });
  }

  // 屋台名（上部）
  slide.addText('おいしいホットドック屋さん', {
    x: 0.2, y: 0.2, w: 5.8, h: 0.72,
    fontSize: 26, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 4, offset: 2, angle: 45 }
  });

  // しずる（ターコイズ帯の下）
  slide.addText('外はぱりっ、中はジューシー。', {
    x: 0.2, y: 1.85, w: 5.0, h: 0.58,
    fontSize: 22, bold: true, color: '1A1A1A', fontFace: 'Impact'
  });

  // ★ USA ★ スターバッジ（上部右）
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 5.7, y: 0.12, w: 1.88, h: 1.88,
    fill: { color: '40E0D0' }, line: { color: 'FFFFFF', width: 2.5 }
  });
  slide.addText('★ USA ★\nHOT DOG', {
    x: 5.7, y: 0.28, w: 1.88, h: 1.4,
    fontSize: 17, bold: true, color: '1A1A1A', align: 'center', valign: 'middle',
    fontFace: 'Impact'
  });

  // 情報ゾーン区切り線
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.6, w: W, h: 0.06,
    fill: { color: '40E0D0' }, line: { type: 'none' }
  });

  // メニュー
  slide.addText('ホットドッグ ¥200　／　チーズホットドッグ ¥300', {
    x: 0.25, y: 6.68, w: 7.7, h: 0.52,
    fontSize: 20, bold: true, color: 'E8A010', fontFace: 'Impact'
  });

  // TOPPINGS ALL FREE
  slide.addText('TOPPINGS — ALL FREE', {
    x: 0.25, y: 7.22, w: 7.7, h: 0.6,
    fontSize: 28, bold: true, color: '40E0D0', fontFace: 'Impact'
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.25, y: 7.84, w: 7.7, h: 0,
    line: { color: '40E0D0', width: 1.5 }
  });

  // トッピング3種
  ['ケチャップ', 'マスタード', 'マヨネーズ'].forEach((name, i) => {
    const y = 7.9 + i * 0.78;
    slide.addText(name, {
      x: 0.25, y, w: 7.5, h: 0.72,
      fontSize: 36, bold: true, color: 'FFFFFF', fontFace: 'Impact',
      shadow: { type: 'outer', color: '000000', blur: 4, offset: 2, angle: 45 }
    });
    if (i < 2) {
      slide.addShape(pptx.ShapeType.line, {
        x: 0.25, y: y + 0.74, w: 7.7, h: 0,
        line: { color: 'FFFFFF', width: 0.5, transparency: 55 }
      });
    }
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.25, y: 10.22, w: 7.7, h: 0,
    line: { color: '40E0D0', width: 2 }
  });

  // 日付・場所
  slide.addText('10月16日（土）', {
    x: 0.25, y: 10.29, w: 6.0, h: 0.7,
    fontSize: 34, bold: true, color: 'E8A010', fontFace: 'Impact'
  });
  slide.addText('4年S科教室', {
    x: 0.25, y: 11.0, w: 5.5, h: 0.52,
    fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // 現金のみバッジ
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.5, y: 10.29, w: 1.55, h: 1.28,
    fill: { color: '40E0D0' }, line: { type: 'none' }, rectRadius: 0.1
  });
  slide.addText('現金\nのみ', {
    x: 6.5, y: 10.35, w: 1.55, h: 1.12,
    fontSize: 20, bold: true, color: '1A1A1A', align: 'center', valign: 'middle'
  });
}

// ══════════════════════════════════════════════════════════════
// v2  ネオンサイバー
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // 深紫黒背景
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '0A0012' }, line: { type: 'none' }
  });

  // スキャンライン（0.28in間隔・B026FF）
  for (let y = 0; y < 11.7; y += 0.28) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y, w: W, h: 0,
      line: { color: 'B026FF', width: 0.3, transparency: 88 }
    });
  }

  // グリッドフロア（下部収束・水平線）
  [
    { y: 6.2, t: 82 }, { y: 7.0, t: 76 }, { y: 7.7, t: 70 },
    { y: 8.35, t: 64 }, { y: 8.9, t: 58 }, { y: 9.35, t: 52 },
    { y: 9.72, t: 46 }, { y: 10.05, t: 40 }, { y: 10.32, t: 34 },
    { y: 10.55, t: 28 }, { y: 10.74, t: 22 }, { y: 10.9, t: 16 },
    { y: 11.04, t: 12 }, { y: 11.16, t: 8  }, { y: 11.27, t: 5  },
    { y: 11.37, t: 3  }, { y: 11.46, t: 2  }, { y: 11.55, t: 1  },
  ].forEach(({ y, t }) => {
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y, w: W, h: 0,
      line: { color: '00F5FF', width: 0.6, transparency: t }
    });
  });
  // グリッド縦線
  [1.24, 2.48, 4.135, 5.79, 7.03].forEach(x => {
    slide.addShape(pptx.ShapeType.line, {
      x, y: 6.2, w: 0, h: 5.49,
      line: { color: 'B026FF', width: 0.4, transparency: 72 }
    });
  });

  // "HOT DOG" 背景装飾タイポ（透過・回転）
  slide.addText('HOT DOG', {
    x: -1.0, y: 3.2, w: 11.0, h: 2.8,
    fontSize: 108, bold: true, color: 'FF2D78',
    fontFace: 'Impact', rotate: -8, transparency: 80
  });

  // オノマトペ（特大・浮遊）
  slide.addText('じゅわっ', {
    x: -0.3, y: -0.05, w: 6.0, h: 1.45,
    fontSize: 80, bold: true, color: 'FF2D78', rotate: -3,
    shadow: { type: 'outer', color: 'FF2D78', blur: 28, offset: 0, angle: 0 }
  });
  slide.addText('ぱりっ', {
    x: 3.5, y: 0.65, w: 5.2, h: 1.25,
    fontSize: 64, bold: true, color: '00F5FF', rotate: 9,
    shadow: { type: 'outer', color: '00F5FF', blur: 26, offset: 0, angle: 0 }
  });
  slide.addText('ジューシー', {
    x: -0.1, y: 1.6, w: 7.5, h: 1.0,
    fontSize: 50, bold: true, color: 'CCFF00', rotate: -5,
    shadow: { type: 'outer', color: 'CCFF00', blur: 22, offset: 0, angle: 0 }
  });

  // チーズホットドッグ：左（メイン・シアングロー）
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 0.1, 2.35, 4.8, 3.5, {
      shadow: { type: 'outer', color: '00F5FF', blur: 26, offset: 0, angle: 0 }
    });
  }
  // オリジナルホットドッグ：左下（サブ・ピンクグロー）
  if (plainHotdog) {
    addContain(slide, plainHotdog, 0.1, 5.5, 3.8, 2.2, {
      shadow: { type: 'outer', color: 'FF2D78', blur: 18, offset: 0, angle: 0 }
    });
  }

  // 人物（contain・ピンクグロー）
  const cyberperson = peopleImgs[3] || peopleImgs[0];
  if (cyberperson) {
    addContain(slide, cyberperson, 4.0, 1.7, 4.27, 10.0, {
      shadow: { type: 'outer', color: 'FF2D78', blur: 30, offset: 0, angle: 0 }
    });
  }

  // ¥200 特大ネオン
  slide.addText('¥200', {
    x: 0.05, y: 3.7, w: 5.2, h: 1.85,
    fontSize: 108, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FF2D78', blur: 28, offset: 0, angle: 0 }
  });

  // 屋台名
  slide.addText('おいしいホットドック屋さん', {
    x: 0.2, y: 5.62, w: 5.5, h: 0.58,
    fontSize: 17, bold: true, color: '00F5FF',
    shadow: { type: 'outer', color: '00F5FF', blur: 12, offset: 0, angle: 0 }
  });

  // しずる文
  slide.addText('かじった瞬間、じゅわっとあふれる。', {
    x: 0.2, y: 6.28, w: 6.2, h: 0.62,
    fontSize: 19, bold: true, color: 'FFFFFF',
    shadow: { type: 'outer', color: 'FF2D78', blur: 8, offset: 0, angle: 0 }
  });

  // メニュー
  slide.addText('ホットドッグ ¥200　　チーズホットドッグ ¥300', {
    x: 0.1, y: 6.92, w: 7.77, h: 0.5,
    fontSize: 18, bold: true, color: 'FFFFFF', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: 'FF2D78', blur: 8, offset: 0, angle: 0 }
  });

  // トッピング3種
  ['ケチャップ', 'マスタード', 'マヨネーズ'].forEach((t, i) => {
    slide.addText(t, {
      x: 0.1 + i * 2.68, y: 7.48, w: 2.6, h: 0.68,
      fontSize: 26, bold: true, color: '00F5FF', fontFace: 'Impact', align: 'center',
      shadow: { type: 'outer', color: '00F5FF', blur: 14, offset: 0, angle: 0 }
    });
  });

  // ALL FREE
  slide.addText('▶  ALL FREE  ◀', {
    x: 0.25, y: 8.18, w: 7.77, h: 0.9,
    fontSize: 40, bold: true, color: 'CCFF00', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: 'CCFF00', blur: 22, offset: 0, angle: 0 }
  });

  // 日付
  slide.addText('10月16日（土）', {
    x: 0.25, y: 9.15, w: 7.77, h: 0.95,
    fontSize: 44, bold: true, color: 'FF2D78', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: 'FF2D78', blur: 24, offset: 0, angle: 0 }
  });

  // 場所・現金
  slide.addText('4年S科教室', {
    x: 0.25, y: 10.15, w: 5.3, h: 0.68,
    fontSize: 30, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '00F5FF', blur: 14, offset: 0, angle: 0 }
  });
  slide.addText('現金のみ', {
    x: 5.7, y: 10.15, w: 2.32, h: 0.68,
    fontSize: 24, bold: true, color: 'CCFF00', fontFace: 'Impact', align: 'right',
    shadow: { type: 'outer', color: 'CCFF00', blur: 12, offset: 0, angle: 0 }
  });

  // 学科名
  slide.addText('旭川高専 システム制御情報工学科 4年', {
    x: 0.25, y: 10.9, w: 7.77, h: 0.45,
    fontSize: 14, bold: true, color: 'B026FF', align: 'center',
    shadow: { type: 'outer', color: 'B026FF', blur: 10, offset: 0, angle: 0 }
  });
}

// ══════════════════════════════════════════════════════════════
// v3  本気系（漆黒×蛍光黄×人物全面）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // 完全漆黒背景
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '111111' }, line: { type: 'none' }
  });

  // 人物：全面（contain・白リムライト）
  const p1 = peopleImgs[2] || peopleImgs[0];
  if (p1) {
    addContain(slide, p1, 0.0, 0.0, W, H, {
      vAlign: 'top',
      shadow: { type: 'outer', color: 'FFFFFF', blur: 38, offset: 0, angle: 0 }
    });
  }

  // 上部黒帯（テキスト可読性）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 2.8,
    fill: { color: '000000', transparency: 25 }, line: { type: 'none' }
  });

  // 左縦蛍光ライン
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: H,
    fill: { color: 'FFFF00' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: W - 0.06, y: 0, w: 0.06, h: H,
    fill: { color: 'FFFF00' }, line: { type: 'none' }
  });

  // メインコピー（蛍光イエロー・特大）
  slide.addText('高専生が本気で', {
    x: 0.25, y: 0.08, w: 7.8, h: 1.2,
    fontSize: 58, bold: true, color: 'FFFF00', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FFFF00', blur: 20, offset: 0, angle: 0 }
  });
  slide.addText('焼いてます。', {
    x: 0.25, y: 1.24, w: 7.8, h: 1.18,
    fontSize: 58, bold: true, color: 'FFFF00', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FFFF00', blur: 20, offset: 0, angle: 0 }
  });

  // オリジナルホットドッグ：右下（メイン・蛍光グロー）
  if (plainHotdog) {
    addContain(slide, plainHotdog, 3.8, 3.8, 4.2, 3.2, {
      shadow: { type: 'outer', color: 'FFFF00', blur: 24, offset: 0, angle: 0 }
    });
  }
  // チーズホットドッグ：左上（サブ・蛍光グロー）
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 0.1, 2.2, 3.3, 2.5, {
      shadow: { type: 'outer', color: 'FFFF00', blur: 16, offset: 0, angle: 0 }
    });
  }

  // ¥200 特大（FF2200赤グロー）
  slide.addText('¥200', {
    x: -0.3, y: 4.7, w: 6.8, h: 2.9,
    fontSize: 158, bold: true, color: 'FF2200', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FF2200', blur: 24, offset: 0, angle: 0 }
  });

  // 下部情報帯
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 8.65, w: W, h: H - 8.65,
    fill: { color: '000000', transparency: 18 }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 8.67, w: W, h: 0.05,
    fill: { color: 'FFFF00' }, line: { type: 'none' }
  });

  // しずる
  slide.addText('外はぱりっ、中はジューシー。', {
    x: 0.25, y: 8.78, w: 7.7, h: 0.6,
    fontSize: 24, bold: true, color: 'FFFFFF',
    shadow: { type: 'outer', color: '000000', blur: 6, offset: 2, angle: 45 }
  });

  // メニュー
  slide.addText('ホットドッグ ¥200　　チーズホットドッグ ¥300', {
    x: 0.25, y: 9.38, w: 7.7, h: 0.48,
    fontSize: 20, bold: true, color: 'FFFF00', fontFace: 'Impact'
  });

  // トッピング
  slide.addText('ケチャップ　マスタード　マヨネーズ　全部FREE', {
    x: 0.25, y: 9.88, w: 7.7, h: 0.55,
    fontSize: 21, bold: true, color: 'FFFF00', fontFace: 'Impact'
  });

  // 日付
  slide.addText('10月16日（土）', {
    x: 0.25, y: 10.45, w: 7.7, h: 0.82,
    fontSize: 38, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // 場所・現金
  slide.addText('4年S科教室　／　現金のみ', {
    x: 0.25, y: 11.27, w: 7.7, h: 0.42,
    fontSize: 22, bold: true, color: 'FFFF00', fontFace: 'Impact'
  });
}

// ══════════════════════════════════════════════════════════════
// v4  ドドン深紅（¥200特大・傾き・縁取り）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // 深紅全面
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '8B0000' }, line: { type: 'none' }
  });

  // 引き締め黒オーバーレイ
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '000000', transparency: 52 }, line: { type: 'none' }
  });

  // 右上ハイライト面
  slide.addShape(pptx.ShapeType.rect, {
    x: 3.5, y: 0, w: W - 3.5, h: H * 0.38,
    fill: { color: 'AA0000', transparency: 38 }, line: { type: 'none' }
  });

  // チーズホットドッグ：右上（メイン・z-order下）
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 3.3, 0.05, 4.97, 3.5);
  }
  // オリジナルホットドッグ：左中央（サブ）
  if (plainHotdog) {
    addContain(slide, plainHotdog, 0.1, 2.2, 3.2, 2.4, {
      shadow: { type: 'outer', color: 'FFFFFF', blur: 10, offset: 0, angle: 0 }
    });
  }

  // 人物：左寄り全高（contain・白リムライト）
  const p2 = peopleImgs[4] || peopleImgs[0];
  if (p2) {
    addContain(slide, p2, -1.0, 0.0, 7.8, H, {
      hAlign: 'left', vAlign: 'top',
      shadow: { type: 'outer', color: 'FFFFFF', blur: 22, offset: 0, angle: 0 }
    });
  }

  // 上部コピー（2行）
  slide.addText('このホットドッグ、', {
    x: 0.3, y: 0.1, w: 7.7, h: 0.9,
    fontSize: 42, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 10, offset: 4, angle: 45 }
  });
  slide.addText('本気です。', {
    x: 0.3, y: 0.98, w: 7.7, h: 1.0,
    fontSize: 54, bold: true, color: 'FFE600', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FFE600', blur: 20, offset: 0, angle: 0 }
  });

  // ¥200 特大（傾き・黒落ち影）
  slide.addText('¥200', {
    x: 0.4, y: 4.7, w: 7.5, h: 3.1,
    fontSize: 162, bold: true, color: 'FFE600', fontFace: 'Impact',
    rotate: -4,
    shadow: { type: 'outer', color: '000000', blur: 12, offset: 5, angle: 40 }
  });
  // ¥200 白グロー縁取り（前景重ね）
  slide.addText('¥200', {
    x: 0.4, y: 4.7, w: 7.5, h: 3.1,
    fontSize: 162, bold: true, color: 'FFE600', fontFace: 'Impact',
    rotate: -4, transparency: 0,
    shadow: { type: 'outer', color: 'FFFFFF', blur: 3, offset: 0, angle: 0 }
  });

  // しずる
  slide.addText('かじった瞬間、じゅわっとあふれる。', {
    x: 0.3, y: 8.1, w: 7.7, h: 0.65,
    fontSize: 24, bold: true, color: 'FFFFFF',
    shadow: { type: 'outer', color: '000000', blur: 7, offset: 2, angle: 45 }
  });

  // 区切り線
  slide.addShape(pptx.ShapeType.line, {
    x: 0.3, y: 8.8, w: 7.67, h: 0,
    line: { color: 'FFE600', width: 2.8 }
  });

  // メニュー
  slide.addText('ホットドッグ ¥200　　チーズホットドッグ ¥300', {
    x: 0.3, y: 8.88, w: 7.7, h: 0.5,
    fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // TOPPING ALL FREE
  slide.addText('TOPPING  ALL  FREE', {
    x: 0.3, y: 9.4, w: 7.7, h: 0.62,
    fontSize: 29, bold: true, color: 'FFE600', fontFace: 'Impact'
  });

  // トッピング3種
  slide.addText('ケチャップ　　マスタード　　マヨネーズ', {
    x: 0.3, y: 10.04, w: 7.7, h: 0.6,
    fontSize: 25, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // 区切り線
  slide.addShape(pptx.ShapeType.line, {
    x: 0.3, y: 10.67, w: 7.67, h: 0,
    line: { color: 'FFFFFF', width: 1, transparency: 38 }
  });

  // 日付
  slide.addText('10月16日（土）', {
    x: 0.3, y: 10.73, w: 7.7, h: 0.78,
    fontSize: 42, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // 場所・現金
  slide.addText('4年S科教室　／　現金のみ', {
    x: 0.3, y: 11.51, w: 7.7, h: 0.18,
    fontSize: 20, bold: true, color: 'FFE600', fontFace: 'Impact'
  });
}

safeWriteFile(pptx, 'flyers/hotdog-flyer.pptx')
  .then(() => console.log('✅ flyers/hotdog-flyer.pptx を生成しました'))
  .catch(err => { console.error('❌ エラー:', err); process.exit(1); });
