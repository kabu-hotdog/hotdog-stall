const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

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

// hotdogImgs[0] = チーズホットドッグ.png (チ < ホ)
// hotdogImgs[1] = ホットドッグ.png
const cheeseHotdog = hotdogImgs[0];
const plainHotdog  = hotdogImgs[1] || hotdogImgs[0];

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'A4', width: 8.27, height: 11.69 });
pptx.layout = 'A4';
const W = 8.27, H = 11.69;

// ══════════════════════════════════════════════════════════════
// v1  アメリカンダイナー — 左右分割
// LEFT: ノーマル（赤×黒チェッカー）  RIGHT: チーズ（黄×暖チェッカー）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const COLS = 8, ROWS = 12;
  const tileW = W / COLS, tileH = H / ROWS;

  // チェッカー背景（左右で色が異なる）
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isLeft = c < COLS / 2;
      const A = isLeft ? 'D42B2B' : 'E8A010';
      const B = isLeft ? '1A1A1A' : '8B5A00';
      slide.addShape(pptx.ShapeType.rect, {
        x: c * tileW, y: r * tileH, w: tileW + 0.01, h: tileH + 0.01,
        fill: { color: (r + c) % 2 === 0 ? A : B },
        line: { type: 'none' }
      });
    }
  }

  // ターコイズ横帯 2本（全幅）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.15, w: W, h: 0.3,
    fill: { color: '40E0D0' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.58, w: W, h: 0.08,
    fill: { color: '40E0D0' }, line: { type: 'none' }
  });

  // 中央縦区切り（ターコイズ太線）
  const SP1 = tileW * (COLS / 2); // 4.135
  slide.addShape(pptx.ShapeType.rect, {
    x: SP1 - 0.06, y: 0, w: 0.12, h: H,
    fill: { color: '40E0D0' }, line: { type: 'none' }
  });

  // ─── LEFT ZONE: ノーマル ───────────────────────────────
  slide.addText('パリッと！', {
    x: -0.1, y: 0.08, w: 4.0, h: 1.0,
    fontSize: 60, bold: true, color: 'FFFFFF', fontFace: 'Impact', rotate: -6,
    shadow: { type: 'outer', color: '000000', blur: 5, offset: 3, angle: 45 }
  });
  if (plainHotdog) {
    addContain(slide, plainHotdog, -0.4, 1.75, 4.6, 3.2, { vAlign: 'center' });
  }
  slide.addText('ホットドッグ', {
    x: 0.15, y: 4.7, w: 3.7, h: 0.48,
    fontSize: 18, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 2, offset: 1, angle: 45 }
  });
  slide.addText('¥200', {
    x: 0.0, y: 5.1, w: 3.9, h: 1.45,
    fontSize: 96, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'D42B2B', blur: 9, offset: 5, angle: 45 }
  });

  // ─── RIGHT ZONE: チーズ ───────────────────────────────
  slide.addText('とろ〜り', {
    x: 4.25, y: 0.08, w: 4.0, h: 1.0,
    fontSize: 56, bold: true, color: 'FFE600', fontFace: 'Impact', rotate: 6,
    shadow: { type: 'outer', color: '000000', blur: 5, offset: 3, angle: 45 }
  });
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 4.25, 1.75, 4.0, 3.2, { vAlign: 'center' });
  }
  slide.addText('チーズホットドッグ', {
    x: 4.25, y: 4.7, w: 3.9, h: 0.48,
    fontSize: 18, bold: true, color: 'FFE600', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 2, offset: 1, angle: 45 }
  });
  slide.addText('¥300', {
    x: 4.3, y: 5.1, w: 3.9, h: 1.45,
    fontSize: 96, bold: true, color: 'FFE600', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'E8A010', blur: 9, offset: 5, angle: 45 }
  });

  // 人物（右寄せ・両ゾーンをまたぐ）
  if (peopleImgs[0]) {
    addContain(slide, peopleImgs[0], 3.5, -0.5, 5.0, 12.19, { hAlign: 'right', vAlign: 'top' });
  }

  // ─── 情報ゾーン ──────────────────────────────────────
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.62, w: W, h: H - 6.62,
    fill: { color: '080000', transparency: 20 }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.62, w: W, h: 0.07,
    fill: { color: '40E0D0' }, line: { type: 'none' }
  });
  slide.addText('おいしいホットドック屋さん', {
    x: 0.2, y: 6.7, w: 5.5, h: 0.52,
    fontSize: 20, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 3, offset: 1, angle: 45 }
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 5.9, y: 6.6, w: 1.6, h: 1.6,
    fill: { color: '40E0D0' }, line: { color: 'FFFFFF', width: 2.5 }
  });
  slide.addText('★ USA ★\nHOT DOG', {
    x: 5.9, y: 6.66, w: 1.6, h: 1.22,
    fontSize: 14, bold: true, color: '1A1A1A', align: 'center', valign: 'middle',
    fontFace: 'Impact'
  });
  slide.addText('外はぱりっ。チーズはとろ〜り。', {
    x: 0.2, y: 7.24, w: 7.7, h: 0.5,
    fontSize: 20, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.2, y: 7.78, w: 7.87, h: 0,
    line: { color: '40E0D0', width: 1.5 }
  });
  slide.addText('TOPPINGS — ALL FREE', {
    x: 0.2, y: 7.83, w: 7.87, h: 0.58,
    fontSize: 28, bold: true, color: '40E0D0', fontFace: 'Impact'
  });
  ['ケチャップ', 'マスタード', 'マヨネーズ'].forEach((n, i) => {
    const y = 8.44 + i * 0.72;
    slide.addText(n, {
      x: 0.2, y, w: 7.7, h: 0.66,
      fontSize: 34, bold: true, color: 'FFFFFF', fontFace: 'Impact',
      shadow: { type: 'outer', color: '000000', blur: 3, offset: 2, angle: 45 }
    });
    if (i < 2) slide.addShape(pptx.ShapeType.line, {
      x: 0.2, y: y + 0.67, w: 7.87, h: 0,
      line: { color: 'FFFFFF', width: 0.5, transparency: 55 }
    });
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.2, y: 10.6, w: 7.87, h: 0,
    line: { color: '40E0D0', width: 2 }
  });
  slide.addText('10月16日（土）', {
    x: 0.2, y: 10.65, w: 5.8, h: 0.68,
    fontSize: 34, bold: true, color: 'E8A010', fontFace: 'Impact'
  });
  slide.addText('4年S科教室', {
    x: 0.2, y: 11.36, w: 5.5, h: 0.33,
    fontSize: 20, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.48, y: 10.65, w: 1.58, h: 1.04,
    fill: { color: '40E0D0' }, line: { type: 'none' }, rectRadius: 0.1
  });
  slide.addText('現金\nのみ', {
    x: 6.48, y: 10.71, w: 1.58, h: 0.9,
    fontSize: 18, bold: true, color: '1A1A1A', align: 'center', valign: 'middle'
  });
}

// ══════════════════════════════════════════════════════════════
// v2  ネオンサイバー — 左右分割
// LEFT: ノーマル（シアン空間）  RIGHT: チーズ（ゴールド空間）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const SP2 = 4.0;

  // 深紫黒背景
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '0A0012' }, line: { type: 'none' }
  });

  // ゾーン色トーン（左: シアン薄, 右: ゴールド薄）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SP2, h: H,
    fill: { color: '002A2A', transparency: 60 }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: SP2, y: 0, w: W - SP2, h: H,
    fill: { color: '2A1A00', transparency: 60 }, line: { type: 'none' }
  });

  // スキャンライン（全幅）
  for (let y = 0; y < 11.7; y += 0.28) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y, w: W, h: 0,
      line: { color: 'B026FF', width: 0.3, transparency: 88 }
    });
  }

  // グリッドフロア（全幅）
  [
    { y: 6.0, t: 84 }, { y: 6.8, t: 78 }, { y: 7.5, t: 72 },
    { y: 8.1, t: 66 }, { y: 8.6, t: 60 }, { y: 9.05, t: 54 },
    { y: 9.42, t: 48 }, { y: 9.74, t: 42 }, { y: 10.0, t: 36 },
    { y: 10.24, t: 30 }, { y: 10.44, t: 24 }, { y: 10.62, t: 18 },
    { y: 10.78, t: 13 }, { y: 10.92, t: 9 }, { y: 11.04, t: 6 },
    { y: 11.15, t: 4 }, { y: 11.25, t: 2 }, { y: 11.34, t: 1 },
  ].forEach(({ y, t }) => {
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y, w: W, h: 0,
      line: { color: '00F5FF', width: 0.6, transparency: t }
    });
  });
  [1.24, 2.48, 4.135, 5.79, 7.03].forEach(x => {
    slide.addShape(pptx.ShapeType.line, {
      x, y: 6.0, w: 0, h: 5.69,
      line: { color: 'B026FF', width: 0.4, transparency: 72 }
    });
  });

  // 中央ネオン縦区切り（B026FF ＋ 白細線）
  slide.addShape(pptx.ShapeType.rect, {
    x: SP2 - 0.06, y: 0, w: 0.12, h: H,
    fill: { color: 'B026FF', transparency: 35 }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: SP2 - 0.01, y: 0, w: 0.02, h: H,
    fill: { color: 'FFFFFF' }, line: { type: 'none' }
  });

  // ─── LEFT: ノーマル（シアン）───────────────────────────
  slide.addText('ぱりっ', {
    x: -0.2, y: 0.05, w: 4.4, h: 1.3,
    fontSize: 86, bold: true, color: '00F5FF', rotate: -5,
    shadow: { type: 'outer', color: '00F5FF', blur: 30, offset: 0, angle: 0 }
  });
  if (plainHotdog) {
    addContain(slide, plainHotdog, 0.1, 1.45, 3.8, 2.9, {
      shadow: { type: 'outer', color: '00F5FF', blur: 28, offset: 0, angle: 0 }
    });
  }
  slide.addText('ホットドッグ', {
    x: 0.1, y: 4.1, w: 3.8, h: 0.48,
    fontSize: 16, bold: true, color: '00F5FF', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: '00F5FF', blur: 8, offset: 0, angle: 0 }
  });
  slide.addText('¥200', {
    x: 0.05, y: 4.55, w: 3.8, h: 1.5,
    fontSize: 100, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '00F5FF', blur: 28, offset: 0, angle: 0 }
  });

  // ─── RIGHT: チーズ（ゴールド）──────────────────────────
  slide.addText('とろ〜り', {
    x: 4.1, y: 0.05, w: 4.1, h: 1.3,
    fontSize: 72, bold: true, color: 'FFD700', rotate: 5,
    shadow: { type: 'outer', color: 'FFD700', blur: 28, offset: 0, angle: 0 }
  });
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 4.1, 1.45, 3.8, 2.9, {
      shadow: { type: 'outer', color: 'FFD700', blur: 28, offset: 0, angle: 0 }
    });
  }
  slide.addText('チーズホットドッグ', {
    x: 4.1, y: 4.1, w: 3.9, h: 0.48,
    fontSize: 16, bold: true, color: 'FFD700', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: 'FFD700', blur: 8, offset: 0, angle: 0 }
  });
  slide.addText('¥300', {
    x: 4.2, y: 4.55, w: 3.8, h: 1.5,
    fontSize: 100, bold: true, color: 'FFD700', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FFD700', blur: 28, offset: 0, angle: 0 }
  });

  // 人物（右・ゴールドグロー）
  const neonP = peopleImgs[3] || peopleImgs[0];
  if (neonP) {
    addContain(slide, neonP, 3.8, 1.5, 4.47, 10.2, {
      shadow: { type: 'outer', color: 'FF2D78', blur: 30, offset: 0, angle: 0 }
    });
  }

  // ─── 情報ゾーン ──────────────────────────────────────
  slide.addText('おいしいホットドック屋さん', {
    x: 0.2, y: 6.1, w: 5.5, h: 0.55,
    fontSize: 16, bold: true, color: '00F5FF',
    shadow: { type: 'outer', color: '00F5FF', blur: 10, offset: 0, angle: 0 }
  });
  slide.addText('外はぱりっ、チーズはとろ〜り。', {
    x: 0.2, y: 6.65, w: 6.5, h: 0.55,
    fontSize: 19, bold: true, color: 'FFFFFF',
    shadow: { type: 'outer', color: 'FF2D78', blur: 8, offset: 0, angle: 0 }
  });
  ['ケチャップ', 'マスタード', 'マヨネーズ'].forEach((t, i) => {
    slide.addText(t, {
      x: 0.1 + i * 2.68, y: 7.25, w: 2.6, h: 0.65,
      fontSize: 24, bold: true, color: '00F5FF', fontFace: 'Impact', align: 'center',
      shadow: { type: 'outer', color: '00F5FF', blur: 14, offset: 0, angle: 0 }
    });
  });
  slide.addText('▶  ALL FREE  ◀', {
    x: 0.2, y: 7.94, w: 7.87, h: 0.85,
    fontSize: 38, bold: true, color: 'CCFF00', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: 'CCFF00', blur: 20, offset: 0, angle: 0 }
  });
  slide.addText('10月16日（土）', {
    x: 0.2, y: 8.85, w: 7.87, h: 0.92,
    fontSize: 44, bold: true, color: 'FF2D78', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: 'FF2D78', blur: 22, offset: 0, angle: 0 }
  });
  slide.addText('4年S科教室', {
    x: 0.2, y: 9.82, w: 5.3, h: 0.65,
    fontSize: 30, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '00F5FF', blur: 12, offset: 0, angle: 0 }
  });
  slide.addText('現金のみ', {
    x: 5.7, y: 9.82, w: 2.32, h: 0.65,
    fontSize: 24, bold: true, color: 'CCFF00', fontFace: 'Impact', align: 'right',
    shadow: { type: 'outer', color: 'CCFF00', blur: 10, offset: 0, angle: 0 }
  });
  slide.addText('旭川高専 システム制御情報工学科 4年', {
    x: 0.2, y: 10.55, w: 7.87, h: 0.42,
    fontSize: 13, bold: true, color: 'B026FF', align: 'center',
    shadow: { type: 'outer', color: 'B026FF', blur: 8, offset: 0, angle: 0 }
  });
}

// ══════════════════════════════════════════════════════════════
// v3  本気系（漆黒×蛍光）— 斜め分割
// LEFT-UP: ノーマル（蛍光黄）  RIGHT-DOWN: チーズ（蛍光オレンジ）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // 完全漆黒背景
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '111111' }, line: { type: 'none' }
  });

  // 人物：全面（両ゾーンをまたぐ）
  const p3 = peopleImgs[2] || peopleImgs[0];
  if (p3) {
    addContain(slide, p3, 0, 0, W, H, {
      vAlign: 'top',
      shadow: { type: 'outer', color: 'FFFFFF', blur: 36, offset: 0, angle: 0 }
    });
  }

  // 上部黒帯
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 2.7,
    fill: { color: '000000', transparency: 28 }, line: { type: 'none' }
  });

  // 対角ストライプ区切り（黄→オレンジ グラデ代わりに2本重ね）
  slide.addShape(pptx.ShapeType.rect, {
    x: W / 2 - 0.12, y: -3, w: 0.24, h: H + 6,
    fill: { color: 'FFFF00', transparency: 18 }, line: { type: 'none' },
    rotate: 14
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: W / 2 - 0.03, y: -3, w: 0.06, h: H + 6,
    fill: { color: 'FFFFFF' }, line: { type: 'none' },
    rotate: 14
  });

  // 縦蛍光ライン（両端）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: H,
    fill: { color: 'FFFF00' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: W - 0.06, y: 0, w: 0.06, h: H,
    fill: { color: 'FFD700' }, line: { type: 'none' }
  });

  // ─── LEFT-UP: ノーマル（蛍光黄）─────────────────────
  slide.addText('パリッと', {
    x: 0.2, y: 0.05, w: 4.5, h: 1.2,
    fontSize: 68, bold: true, color: 'FFFF00', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FFFF00', blur: 22, offset: 0, angle: 0 }
  });
  slide.addText('ホットドッグ', {
    x: 0.2, y: 1.22, w: 3.8, h: 0.45,
    fontSize: 16, bold: true, color: 'FFFF00', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FFFF00', blur: 8, offset: 0, angle: 0 }
  });
  if (plainHotdog) {
    addContain(slide, plainHotdog, 0.1, 1.7, 3.8, 2.8, {
      shadow: { type: 'outer', color: 'FFFF00', blur: 22, offset: 0, angle: 0 }
    });
  }
  slide.addText('¥200', {
    x: -0.3, y: 4.4, w: 5.0, h: 2.2,
    fontSize: 130, bold: true, color: 'FF2200', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FF2200', blur: 22, offset: 0, angle: 0 }
  });

  // ─── RIGHT-DOWN: チーズ（蛍光オレンジ）──────────────
  slide.addText('とろ〜り', {
    x: 3.9, y: 1.0, w: 4.3, h: 1.1,
    fontSize: 60, bold: true, color: 'FFD700', fontFace: 'Impact', rotate: 5,
    shadow: { type: 'outer', color: 'FFD700', blur: 22, offset: 0, angle: 0 }
  });
  slide.addText('チーズホットドッグ', {
    x: 3.9, y: 2.08, w: 4.3, h: 0.45,
    fontSize: 16, bold: true, color: 'FFD700', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FFD700', blur: 8, offset: 0, angle: 0 }
  });
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 4.0, 2.55, 3.8, 2.8, {
      shadow: { type: 'outer', color: 'FFD700', blur: 22, offset: 0, angle: 0 }
    });
  }
  slide.addText('¥300', {
    x: 4.0, y: 5.2, w: 4.1, h: 1.5,
    fontSize: 100, bold: true, color: 'FFD700', fontFace: 'Impact', rotate: 3,
    shadow: { type: 'outer', color: 'FFD700', blur: 22, offset: 0, angle: 0 }
  });

  // ─── 情報ゾーン ──────────────────────────────────────
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.1, w: W, h: H - 7.1,
    fill: { color: '000000', transparency: 20 }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.1, w: W, h: 0.06,
    fill: { color: 'FFFF00' }, line: { type: 'none' }
  });
  slide.addText('おいしいホットドック屋さん', {
    x: 0.2, y: 7.17, w: 7.87, h: 0.5,
    fontSize: 18, bold: true, color: 'FFFF00', fontFace: 'Impact', align: 'center'
  });
  slide.addText('外はぱりっ。チーズはとろ〜り。', {
    x: 0.2, y: 7.68, w: 7.87, h: 0.52,
    fontSize: 21, bold: true, color: 'FFFFFF',
    shadow: { type: 'outer', color: '000000', blur: 5, offset: 2, angle: 45 }
  });
  slide.addText('ケチャップ　マスタード　マヨネーズ　全部FREE', {
    x: 0.2, y: 8.22, w: 7.87, h: 0.52,
    fontSize: 20, bold: true, color: 'FFFF00', fontFace: 'Impact'
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 8.78, w: W, h: 0.04,
    fill: { color: 'FFFF00' }, line: { type: 'none' }
  });
  slide.addText('10月16日（土）', {
    x: 0.2, y: 8.85, w: 7.87, h: 0.9,
    fontSize: 46, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });
  slide.addText('4年S科教室　／　現金のみ', {
    x: 0.2, y: 9.77, w: 7.87, h: 0.42,
    fontSize: 24, bold: true, color: 'FFFF00', fontFace: 'Impact'
  });
}

// ══════════════════════════════════════════════════════════════
// v4  ドドン深紅 — 左右分割
// LEFT: ノーマル（人物と共存）  RIGHT: チーズ（¥300ドン）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const SP4 = 4.2;

  // 深紅全面
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '8B0000' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '000000', transparency: 50 }, line: { type: 'none' }
  });

  // ゾーン右側をわずかに明るく（チーズ空間）
  slide.addShape(pptx.ShapeType.rect, {
    x: SP4, y: 0, w: W - SP4, h: H * 0.65,
    fill: { color: 'AA1500', transparency: 42 }, line: { type: 'none' }
  });

  // 中央縦区切り（ゴールド）
  slide.addShape(pptx.ShapeType.rect, {
    x: SP4 - 0.04, y: 0, w: 0.08, h: H * 0.82,
    fill: { color: 'FFE600' }, line: { type: 'none' }
  });

  // ─── LEFT: ノーマル ──────────────────────────────────
  slide.addText('パリッと', {
    x: 0.2, y: 0.08, w: 3.9, h: 1.0,
    fontSize: 52, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 8, offset: 3, angle: 45 }
  });
  slide.addText('ホットドッグ', {
    x: 0.2, y: 1.08, w: 3.9, h: 0.45,
    fontSize: 17, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 3, offset: 2, angle: 45 }
  });
  if (plainHotdog) {
    addContain(slide, plainHotdog, 0.1, 1.55, 3.8, 2.8, {
      shadow: { type: 'outer', color: 'FFFFFF', blur: 10, offset: 0, angle: 0 }
    });
  }
  slide.addText('¥200', {
    x: 0.2, y: 4.2, w: 3.8, h: 1.5,
    fontSize: 100, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 10, offset: 4, angle: 45 }
  });

  // ─── RIGHT: チーズ ───────────────────────────────────
  slide.addText('とろ〜り', {
    x: 4.3, y: 0.08, w: 3.9, h: 1.0,
    fontSize: 52, bold: true, color: 'FFE600', fontFace: 'Impact', rotate: 4,
    shadow: { type: 'outer', color: 'FFE600', blur: 16, offset: 0, angle: 0 }
  });
  slide.addText('チーズホットドッグ', {
    x: 4.3, y: 1.08, w: 3.9, h: 0.45,
    fontSize: 17, bold: true, color: 'FFE600', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 3, offset: 2, angle: 45 }
  });
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 4.3, 0.05, 3.8, 2.8);
  }
  // ¥300 二重（縁取り効果）
  slide.addText('¥300', {
    x: 4.3, y: 4.2, w: 3.8, h: 1.5,
    fontSize: 100, bold: true, color: 'FFE600', fontFace: 'Impact', rotate: -4,
    shadow: { type: 'outer', color: '000000', blur: 12, offset: 5, angle: 40 }
  });
  slide.addText('¥300', {
    x: 4.3, y: 4.2, w: 3.8, h: 1.5,
    fontSize: 100, bold: true, color: 'FFE600', fontFace: 'Impact', rotate: -4,
    shadow: { type: 'outer', color: 'FFFFFF', blur: 3, offset: 0, angle: 0 }
  });

  // 人物（左寄り全高・両ゾーンまたぐ）
  const p4 = peopleImgs[4] || peopleImgs[0];
  if (p4) {
    addContain(slide, p4, -1.0, 0.0, 7.8, H, {
      hAlign: 'left', vAlign: 'top',
      shadow: { type: 'outer', color: 'FFFFFF', blur: 22, offset: 0, angle: 0 }
    });
  }

  // ─── 情報ゾーン（白背景）────────────────────────────
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 8.4, w: W, h: H - 8.4,
    fill: { color: 'FFFFFF' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 8.4, w: W, h: 0.06,
    fill: { color: '8B0000' }, line: { type: 'none' }
  });
  slide.addText('かじった瞬間、じゅわっとあふれる。', {
    x: 0.3, y: 8.48, w: 7.67, h: 0.5,
    fontSize: 19, bold: true, color: '1A1A1A'
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.3, y: 9.02, w: 7.67, h: 0,
    line: { color: '8B0000', width: 1.2 }
  });
  slide.addText('TOPPING  ALL  FREE', {
    x: 0.3, y: 9.08, w: 7.67, h: 0.58,
    fontSize: 27, bold: true, color: '40E0D0', fontFace: 'Impact'
  });
  slide.addText('ケチャップ　マスタード　マヨネーズ', {
    x: 0.3, y: 9.68, w: 7.67, h: 0.46,
    fontSize: 21, bold: true, color: '1A1A1A', fontFace: 'Impact'
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.3, y: 10.17, w: 7.67, h: 0,
    line: { color: 'AAAAAA', width: 0.8 }
  });
  slide.addText('10月16日（土）', {
    x: 0.3, y: 10.22, w: 7.67, h: 0.72,
    fontSize: 38, bold: true, color: '1A1A1A', fontFace: 'Impact'
  });
  slide.addText('4年S科教室　／　現金のみ', {
    x: 0.3, y: 10.95, w: 7.67, h: 0.38,
    fontSize: 19, color: '555555', fontFace: 'Impact'
  });
}

// ══════════════════════════════════════════════════════════════
// v5  アメリカンコミック — 左右分割
// LEFT: ノーマル（POW!ゾーン）  RIGHT: チーズ（BAM!ゾーン）
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const SP5 = 4.0;

  // 赤全面
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: 'FF0000' }, line: { type: 'none' }
  });

  // ベンデイ点（黄・千鳥）
  const DOT_R = 0.16;
  for (let row = 0; row < 33; row++) {
    for (let col = 0; col < 24; col++) {
      const x = col * 0.36 + (row % 2 === 0 ? 0 : 0.18);
      const y = row * 0.36;
      slide.addShape(pptx.ShapeType.ellipse, {
        x, y, w: DOT_R * 2, h: DOT_R * 2,
        fill: { color: 'FFFF00' }, line: { type: 'none' }
      });
    }
  }

  // 人物：全面メイン（白リムライト）
  const comicP = peopleImgs[5] || peopleImgs[1] || peopleImgs[0];
  if (comicP) {
    addContain(slide, comicP, 0, 0, W, H, {
      vAlign: 'top',
      shadow: { type: 'outer', color: 'FFFFFF', blur: 20, offset: 0, angle: 0 }
    });
  }

  // 人物背後わずかに暗転
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '000000', transparency: 74 }, line: { type: 'none' }
  });

  // 中央黒ストリップ区切り（白縁）
  slide.addShape(pptx.ShapeType.rect, {
    x: SP5 - 0.09, y: 0, w: 0.18, h: H,
    fill: { color: '000000' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.line, {
    x: SP5 - 0.1, y: 0, w: 0, h: H,
    line: { color: 'FFFFFF', width: 2 }
  });
  slide.addShape(pptx.ShapeType.line, {
    x: SP5 + 0.1, y: 0, w: 0, h: H,
    line: { color: 'FFFFFF', width: 2 }
  });

  // ─── LEFT: ノーマル ──────────────────────────────────
  // POW! 爆発バブル
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 0.1, y: 0.1, w: 3.6, h: 1.65,
    fill: { color: 'FFFF00' }, line: { color: '000000', width: 5 }
  });
  slide.addText('POW!', {
    x: 0.1, y: 0.1, w: 3.6, h: 1.65,
    fontSize: 68, bold: true, fontFace: 'Impact', color: '000000',
    align: 'center', valign: 'middle',
    shadow: { type: 'outer', color: '000000', blur: 0, offset: 4, angle: 45 }
  });
  // パリッと！
  slide.addText('パリッと！', {
    x: 0.05, y: 1.88, w: 3.85, h: 1.0,
    fontSize: 52, bold: true, fontFace: 'Impact', color: 'FFFFFF', rotate: -8,
    shadow: { type: 'outer', color: '000000', blur: 0, offset: 5, angle: 45 }
  });
  if (plainHotdog) {
    addContain(slide, plainHotdog, 0.1, 2.95, 3.6, 3.6, {
      shadow: { type: 'outer', color: '000000', blur: 0, offset: 6, angle: 45 }
    });
  }
  // ¥200 バブル
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 0.1, y: 6.4, w: 3.6, h: 1.5,
    fill: { color: 'FFFF00' }, line: { color: '000000', width: 5 }
  });
  slide.addText('¥200', {
    x: 0.1, y: 6.4, w: 3.6, h: 1.5,
    fontSize: 60, bold: true, fontFace: 'Impact', color: '000000',
    align: 'center', valign: 'middle',
    shadow: { type: 'outer', color: '000000', blur: 0, offset: 3, angle: 45 }
  });

  // ─── RIGHT: チーズ ───────────────────────────────────
  // BAM! 爆発バブル
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 4.2, y: 0.1, w: 3.97, h: 1.65,
    fill: { color: '0000FF' }, line: { color: '000000', width: 5 }
  });
  slide.addText('BAM!', {
    x: 4.2, y: 0.1, w: 3.97, h: 1.65,
    fontSize: 68, bold: true, fontFace: 'Impact', color: 'FFFFFF',
    align: 'center', valign: 'middle',
    shadow: { type: 'outer', color: '000000', blur: 0, offset: 4, angle: 45 }
  });
  // とろ〜り！
  slide.addText('とろ〜り！', {
    x: 4.25, y: 1.88, w: 3.95, h: 1.0,
    fontSize: 52, bold: true, fontFace: 'Impact', color: 'FFE600', rotate: 8,
    shadow: { type: 'outer', color: '000000', blur: 0, offset: 5, angle: 45 }
  });
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 4.3, 2.95, 3.6, 3.6, {
      shadow: { type: 'outer', color: '000000', blur: 0, offset: 6, angle: 45 }
    });
  }
  // チーズ¥300 バブル
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 4.3, y: 6.4, w: 3.8, h: 1.5,
    fill: { color: 'FFFFFF' }, line: { color: '000000', width: 5 }
  });
  slide.addText('チーズ¥300', {
    x: 4.3, y: 6.4, w: 3.8, h: 1.5,
    fontSize: 44, bold: true, fontFace: 'Impact', color: '000000',
    align: 'center', valign: 'middle',
    shadow: { type: 'outer', color: '000000', blur: 0, offset: 3, angle: 45 }
  });

  // ─── 情報ゾーン（黒帯）──────────────────────────────
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: H - 2.7, w: W, h: 2.7,
    fill: { color: '000000' }, line: { type: 'none' }
  });
  slide.addText('10月16日（土）　4年S科教室', {
    x: 0.15, y: H - 2.62, w: 8.0, h: 0.78,
    fontSize: 34, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });
  slide.addText('TOPPING ALL FREE!!', {
    x: 0.15, y: H - 1.78, w: 8.0, h: 0.62,
    fontSize: 30, bold: true, color: 'FFFF00', fontFace: 'Impact'
  });
  slide.addText('ケチャップ　マスタード　マヨネーズ', {
    x: 0.15, y: H - 1.12, w: 6.5, h: 0.5,
    fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });
  slide.addText('現金のみ', {
    x: 6.8, y: H - 1.12, w: 1.3, h: 0.5,
    fontSize: 16, bold: true, color: 'FFFF00', fontFace: 'Impact', align: 'right'
  });
  slide.addText('おいしいホットドック屋さん', {
    x: 0.15, y: H - 0.58, w: 8.0, h: 0.42,
    fontSize: 18, bold: true, color: '888888', fontFace: 'Impact'
  });
}

pptx.writeFile({ fileName: 'flyers/hotdog-all.pptx' })
  .then(() => console.log('✅ flyers/hotdog-all.pptx を生成しました'))
  .catch(err => { console.error('❌ エラー:', err); process.exit(1); });
