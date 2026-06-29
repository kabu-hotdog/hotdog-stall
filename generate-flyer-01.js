const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// ── PNG の実ピクセルサイズをライブラリなしで読む ──
function getPngSize(filePath) {
  try {
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch (e) { return null; }
}

// ── ボックス内に収まる最大サイズ（アスペクト比保持）──
function containFit(imgW, imgH, boxW, boxH) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  return { w: imgW * scale, h: imgH * scale };
}

// ── contain 画像を配置（hAlign: left/center/right, vAlign: top/center/bottom）──
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

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'A4', width: 8.27, height: 11.69 });
pptx.layout = 'A4';

// ══════════════════════════════════════════════════════════════
// 案①  アメリカンダイナー（ターコイズ強化）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const W = 8.27, H = 11.69;

  // チェッカー背景
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

  // ターコイズ横ストライプ
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.38, w: W, h: 0.28,
    fill: { color: '40E0D0' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.76, w: W, h: 0.08,
    fill: { color: '40E0D0' }, line: { type: 'none' }
  });

  // 下部暗帯
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.8, w: W, h: H - 6.8,
    fill: { color: '0A0000', transparency: 30 }, line: { type: 'none' }
  });

  // ホットドッグ（アスペクト比計算 contain）
  if (hotdogImgs[0]) {
    addContain(slide, hotdogImgs[0], -0.3, 2.5, 6.2, 4.5, { vAlign: 'center' });
  }

  // ¥200 特大
  slide.addText('¥200', {
    x: 0.1, y: 3.1, w: 4.5, h: 1.6,
    fontSize: 100, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'D42B2B', blur: 6, offset: 4, angle: 45 }
  });

  // 人物：右寄せ contain（引き伸ばしなし）
  if (peopleImgs[0]) {
    addContain(slide, peopleImgs[0], 4.0, -0.5, 4.27, 12.19, { hAlign: 'right', vAlign: 'top' });
  }

  // 屋台名
  slide.addText('おいしいホットドック屋さん', {
    x: 0.2, y: 0.28, w: 5.5, h: 0.72,
    fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // しずる（22pt 独立行）
  slide.addText('外はぱりっ、中はジューシー。', {
    x: 0.2, y: 1.88, w: 4.5, h: 0.56,
    fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 5, offset: 2, angle: 45 }
  });

  // スターバッジ（ターコイズ）
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 5.65, y: 1.65, w: 1.95, h: 1.95,
    fill: { color: '40E0D0' }, line: { color: 'FFFFFF', width: 2.5 }
  });
  slide.addText('★ USA ★\nHOT DOG', {
    x: 5.65, y: 1.82, w: 1.95, h: 1.4,
    fontSize: 17, bold: true, color: '1A1A1A', align: 'center', valign: 'middle',
    fontFace: 'Impact'
  });

  // TOPPINGS ALL FREE
  slide.addText('TOPPINGS — ALL FREE', {
    x: 0.25, y: 6.88, w: 7.7, h: 0.58,
    fontSize: 27, bold: true, color: '40E0D0', fontFace: 'Impact'
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.25, y: 7.48, w: 7.7, h: 0,
    line: { color: '40E0D0', width: 1.5 }
  });

  // トッピング3種 40pt 縦リスト（幅を広く取り改行防止）
  ['ケチャップ', 'マスタード', 'マヨネーズ'].forEach((name, i) => {
    const y = 7.54 + i * 0.92;
    slide.addText(name, {
      x: 0.25, y, w: 7.5, h: 0.82,
      fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'Impact'
    });
    if (i < 2) {
      slide.addShape(pptx.ShapeType.line, {
        x: 0.25, y: y + 0.87, w: 7.7, h: 0,
        line: { color: 'FFFFFF', width: 0.5, transparency: 55 }
      });
    }
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.25, y: 10.32, w: 7.7, h: 0,
    line: { color: '40E0D0', width: 1.5 }
  });

  slide.addText('10月16日（土）', {
    x: 0.25, y: 10.38, w: 6.0, h: 0.72,
    fontSize: 36, bold: true, color: 'E8A010', fontFace: 'Impact'
  });
  slide.addText('4年S科教室', {
    x: 0.25, y: 11.1, w: 5.5, h: 0.52,
    fontSize: 26, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.55, y: 10.38, w: 1.5, h: 1.25,
    fill: { color: '40E0D0' }, line: { type: 'none' }, rectRadius: 0.1
  });
  slide.addText('現金\nのみ', {
    x: 6.55, y: 10.44, w: 1.5, h: 1.1,
    fontSize: 19, bold: true, color: '1A1A1A', align: 'center', valign: 'middle'
  });
}

// ══════════════════════════════════════════════════════════════
// 案②  黒板チョーク（人物を主役に・しずる大型化）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const W = 8.27, H = 11.69;

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '1E3A1E' }, line: { type: 'none' }
  });

  // 外枠2本
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.15, y: 0.15, w: 7.97, h: 11.39,
    fill: { type: 'none' }, line: { color: 'FAF5E4', width: 2.5 }, rectRadius: 0.08
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.28, y: 0.28, w: 7.71, h: 11.13,
    fill: { type: 'none' }, line: { color: 'C8C2B0', width: 0.8 }, rectRadius: 0.06
  });

  // ホットドッグ（人物の背後に先に配置）
  if (hotdogImgs[0]) {
    addContain(slide, hotdogImgs[0], 0.4, 1.3, 7.5, 5.5);
  }

  // チョーク枠（inner shadow は pptxgenjs 非対応のため outer に変更）
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.35, y: 1.18, w: 7.57, h: 5.7,
    fill: { type: 'none' }, line: { color: 'FAF5E4', width: 3 }, rectRadius: 0.1
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.24, y: 1.07, w: 7.79, h: 5.92,
    fill: { type: 'none' }, line: { color: 'C8C2B0', width: 1 }, rectRadius: 0.12
  });

  // 人物：食べてるキャラを特大に（contain・アスペクト比保持）
  if (peopleImgs[1]) {
    addContain(slide, peopleImgs[1], 0.3, 0.0, 7.7, 9.5, { vAlign: 'top' });
  }

  // しずる（人物の上に重ねる・26pt）
  slide.addText('もちふわパンに粗びきウィンナが暴れる。', {
    x: 0.5, y: 0.25, w: 7.0, h: 0.82,
    fontSize: 26, bold: true, color: 'FAF5E4', italic: true, align: 'center',
    shadow: { type: 'outer', color: '000000', blur: 6, offset: 2, angle: 45 }
  });

  // ¥200 透過かぶせ
  slide.addText('¥200', {
    x: 0.5, y: 1.5, w: 3.5, h: 1.8,
    fontSize: 88, bold: true, color: 'FAF5E4', transparency: 15,
    shadow: { type: 'outer', color: 'FFFFFF', blur: 3, offset: 0, angle: 0 }
  });

  // 「ほかほか」浮遊ビジュアル
  slide.addText('ほかほか', {
    x: 4.8, y: 1.15, w: 3.2, h: 0.78,
    fontSize: 32, bold: true, color: 'FFF9C4', rotate: 5,
    shadow: { type: 'outer', color: 'FFFFFF', blur: 4, offset: 0, angle: 0 }
  });

  // デコ落書き
  slide.addText('← コレ！★', {
    x: 0.3, y: 4.2, w: 1.7, h: 0.55,
    fontSize: 15, color: '8DB36A', rotate: -12
  });
  slide.addText('↑ うまい！', {
    x: 3.0, y: 6.88, w: 2.5, h: 0.55,
    fontSize: 14, color: 'FAF5E4',
    shadow: { type: 'outer', color: 'FFFFFF', blur: 2, offset: 0, angle: 0 }
  });

  // 情報ゾーン
  slide.addShape(pptx.ShapeType.line, {
    x: 0.45, y: 9.62, w: 7.37, h: 0,
    line: { color: 'FAF5E4', width: 1.5, dashType: 'dash' }
  });

  slide.addText('10.16', {
    x: 0.5, y: 9.7, w: 3.8, h: 1.0,
    fontSize: 56, bold: true, color: 'FAF5E4', transparency: 15
  });
  slide.addText('（土）　4年S科教室', {
    x: 0.5, y: 9.7, w: 7.3, h: 0.7,
    fontSize: 28, color: 'FAF5E4', align: 'right'
  });
  slide.addText('現金のみ', {
    x: 0.5, y: 10.45, w: 7.3, h: 0.55,
    fontSize: 22, bold: true, color: '8DB36A', align: 'right'
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.45, y: 11.08, w: 7.37, h: 0,
    line: { color: 'C8C2B0', width: 1 }
  });
  // トッピング1行（改行なし）
  slide.addText('ケチャップ　マスタード　マヨネーズ　全部 FREE！', {
    x: 0.5, y: 11.15, w: 7.3, h: 0.48,
    fontSize: 18, color: 'FAF5E4', align: 'center'
  });
}

// ══════════════════════════════════════════════════════════════
// 案③  ネオンサイバー（オノマトペ大幅強化）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const W = 8.27, H = 11.69;

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '0A0012' }, line: { type: 'none' }
  });

  for (let y = 0; y < 11.7; y += 0.28) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y, w: W, h: 0,
      line: { color: 'B026FF', width: 0.3, transparency: 88 }
    });
  }

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
  [1.24, 2.48, 4.135, 5.79, 7.03].forEach(x => {
    slide.addShape(pptx.ShapeType.line, {
      x, y: 6.2, w: 0, h: 5.49,
      line: { color: 'B026FF', width: 0.4, transparency: 72 }
    });
  });

  slide.addText('HOT DOG', {
    x: -1.0, y: 3.5, w: 11.0, h: 2.5,
    fontSize: 100, bold: true, color: 'FF2D78',
    fontFace: 'Impact', rotate: -8, transparency: 78
  });

  // オノマトペ大幅強化（72 / 58 / 46pt・重なりあり）
  slide.addText('じゅわっ', {
    x: -0.2, y: 0.05, w: 5.5, h: 1.3,
    fontSize: 72, bold: true, color: 'FF2D78', rotate: -3,
    shadow: { type: 'outer', color: 'FF2D78', blur: 26, offset: 0, angle: 0 }
  });
  slide.addText('ぱりっ', {
    x: 3.8, y: 0.55, w: 4.7, h: 1.15,
    fontSize: 58, bold: true, color: '00F5FF', rotate: 8,
    shadow: { type: 'outer', color: '00F5FF', blur: 24, offset: 0, angle: 0 }
  });
  slide.addText('ジューシー', {
    x: 0.0, y: 1.55, w: 6.8, h: 0.95,
    fontSize: 46, bold: true, color: 'CCFF00', rotate: -5,
    shadow: { type: 'outer', color: 'CCFF00', blur: 20, offset: 0, angle: 0 }
  });

  // ホットドッグ（contain・アスペクト比保持）
  if (hotdogImgs[0]) {
    addContain(slide, hotdogImgs[0], 0.3, 2.3, 5.5, 4.0, {
      shadow: { type: 'outer', color: '00F5FF', blur: 24, offset: 0, angle: 0 }
    });
  }

  // 人物（contain・アスペクト比保持）
  const cyber_person = peopleImgs[3] || peopleImgs[0];
  if (cyber_person) {
    addContain(slide, cyber_person, 4.2, 1.8, 4.07, 9.89, {
      shadow: { type: 'outer', color: 'FF2D78', blur: 28, offset: 0, angle: 0 }
    });
  }

  slide.addText('¥200', {
    x: 0.1, y: 3.8, w: 5.0, h: 1.7,
    fontSize: 100, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FF2D78', blur: 26, offset: 0, angle: 0 }
  });

  slide.addText('おいしいホットドック屋さん', {
    x: 0.2, y: 5.65, w: 5.5, h: 0.55,
    fontSize: 16, bold: true, color: '00F5FF',
    shadow: { type: 'outer', color: '00F5FF', blur: 10, offset: 0, angle: 0 }
  });

  slide.addText('かじった瞬間、じゅわっとあふれる。', {
    x: 0.2, y: 6.3, w: 6.0, h: 0.6,
    fontSize: 19, bold: true, color: 'FFFFFF',
    shadow: { type: 'outer', color: 'FF2D78', blur: 8, offset: 0, angle: 0 }
  });

  // トッピング（幅 2.6in ずつ・改行防止）
  ['ケチャップ', 'マスタード', 'マヨネーズ'].forEach((t, i) => {
    slide.addText(t, {
      x: 0.1 + i * 2.68, y: 7.05, w: 2.6, h: 0.65,
      fontSize: 26, bold: true, color: '00F5FF', fontFace: 'Impact', align: 'center',
      shadow: { type: 'outer', color: '00F5FF', blur: 14, offset: 0, angle: 0 }
    });
  });

  slide.addText('▶  ALL FREE  ◀', {
    x: 0.25, y: 7.72, w: 7.77, h: 0.88,
    fontSize: 40, bold: true, color: 'CCFF00', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: 'CCFF00', blur: 20, offset: 0, angle: 0 }
  });
  slide.addText('10月16日（土）', {
    x: 0.25, y: 8.7, w: 7.77, h: 0.9,
    fontSize: 44, bold: true, color: 'FF2D78', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: 'FF2D78', blur: 22, offset: 0, angle: 0 }
  });
  slide.addText('4年S科教室', {
    x: 0.25, y: 9.65, w: 5.5, h: 0.65,
    fontSize: 30, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '00F5FF', blur: 12, offset: 0, angle: 0 }
  });
  slide.addText('現金のみ', {
    x: 5.9, y: 9.65, w: 2.1, h: 0.65,
    fontSize: 22, bold: true, color: 'CCFF00', fontFace: 'Impact', align: 'right',
    shadow: { type: 'outer', color: 'CCFF00', blur: 10, offset: 0, angle: 0 }
  });
  slide.addText('旭川高専 システム制御情報工学科 4年', {
    x: 0.25, y: 10.42, w: 7.77, h: 0.4,
    fontSize: 10, color: 'B026FF', align: 'center',
    shadow: { type: 'outer', color: 'B026FF', blur: 6, offset: 0, angle: 0 }
  });
}

pptx.writeFile({ fileName: 'flyers/hotdog-flyer-01.pptx' })
  .then(() => console.log('✅ flyers/hotdog-flyer-01.pptx を生成しました'))
  .catch(err => { console.error('❌ エラー:', err); process.exit(1); });
