// v1-2（黒板チョーク）単体生成スクリプト
// 生成後: hotdog-flyer-01.pptx のスライド2と差し替える
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

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'A4', width: 8.27, height: 11.69 });
pptx.layout = 'A4';

const W = 8.27, H = 11.69;

// ══════════════════════════════════════════════════════════════
// v1-2  黒板チョーク（完全再設計）
// ホットドッグ中央主役・人物は円形枠・情報ゾーンゆったり
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // 黒板グリーン全面
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '1E3A1E' }, line: { type: 'none' }
  });

  // 外枠2本（チョーク風）
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.16, y: 0.16, w: W - 0.32, h: H - 0.32,
    fill: { type: 'none' }, line: { color: 'FAF5E4', width: 2.8 }, rectRadius: 0.07
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.3, y: 0.3, w: W - 0.6, h: H - 0.6,
    fill: { type: 'none' }, line: { color: 'C8C2B0', width: 0.9 }, rectRadius: 0.06
  });

  // 縦書き「本日のメニュー」左端
  slide.addText('本日のメニュー', {
    x: 0.06, y: 2.0, w: 0.65, h: 5.5,
    fontSize: 13, color: 'FAF5E4',
    vert: 'eaVert', valign: 'top',
    shadow: { type: 'outer', color: 'FFFFFF', blur: 2, offset: 0, angle: 0 }
  });

  // 屋台名（上部中央）
  slide.addText('おいしいホットドック屋さん', {
    x: 0.8, y: 0.38, w: 5.2, h: 0.88,
    fontSize: 26, bold: true, color: 'FAF5E4', align: 'center',
    shadow: { type: 'outer', color: 'FFFFFF', blur: 5, offset: 0, angle: 0 }
  });

  // デコ星
  slide.addText('★', { x: 0.45, y: 0.52, w: 0.4, h: 0.4, fontSize: 16, color: '8DB36A' });
  slide.addText('★', { x: 6.05, y: 0.52, w: 0.4, h: 0.4, fontSize: 16, color: '8DB36A' });

  // 人物：右上 円形クロップ
  if (peopleImgs[1]) {
    slide.addImage({
      path: peopleImgs[1],
      x: 5.72, y: 0.42, w: 2.1, h: 2.1,
      sizing: { type: 'cover', w: 2.1, h: 2.1 },
      rounding: true
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 5.65, y: 0.35, w: 2.24, h: 2.24,
      fill: { type: 'none' }, line: { color: 'FAF5E4', width: 2.8 }
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 5.58, y: 0.28, w: 2.38, h: 2.38,
      fill: { type: 'none' }, line: { color: 'C8C2B0', width: 0.9 }
    });
  }

  // 「ほかほか」浮遊ビジュアル
  slide.addText('ほかほか', {
    x: 4.0, y: 1.32, w: 3.3, h: 0.88,
    fontSize: 36, bold: true, color: 'FFF9C4', rotate: 6,
    shadow: { type: 'outer', color: 'FFFFFF', blur: 6, offset: 0, angle: 0 }
  });

  // ホットドッグ：中央大判（主役）
  if (hotdogImgs[0]) {
    addContain(slide, hotdogImgs[0], 0.72, 1.55, 6.6, 5.2);
  }

  // チョーク二重矩形枠
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.62, y: 1.45, w: 6.8, h: 5.4,
    fill: { type: 'none' }, line: { color: 'FAF5E4', width: 3 }, rectRadius: 0.1
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 1.33, w: 7.04, h: 5.64,
    fill: { type: 'none' }, line: { color: 'C8C2B0', width: 1.1 }, rectRadius: 0.12
  });

  // ¥200（ホットドッグ上に透過かぶせ）
  slide.addText('¥200', {
    x: 0.75, y: 2.0, w: 3.6, h: 1.75,
    fontSize: 90, bold: true, color: 'FAF5E4', transparency: 14,
    shadow: { type: 'outer', color: 'FFFFFF', blur: 4, offset: 0, angle: 0 }
  });

  // 落書きデコ
  slide.addText('← コレ！ ★', {
    x: 0.35, y: 4.2, w: 1.8, h: 0.58,
    fontSize: 15, color: '8DB36A', rotate: -12
  });
  slide.addText('↑ うまっ！', {
    x: 3.2, y: 6.98, w: 2.5, h: 0.52,
    fontSize: 15, color: 'FAF5E4',
    shadow: { type: 'outer', color: 'FFFFFF', blur: 2, offset: 0, angle: 0 }
  });

  // ─── 情報ゾーン（y:7.15〜11.69・約4.5インチ）───

  // しずる
  slide.addText('もちふわパンに粗びきウィンナが暴れる。', {
    x: 0.78, y: 7.18, w: 6.72, h: 0.82,
    fontSize: 22, bold: true, color: 'FAF5E4', italic: true, align: 'center',
    shadow: { type: 'outer', color: 'FFFFFF', blur: 3, offset: 0, angle: 0 }
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.48, y: 8.1, w: 7.31, h: 0,
    line: { color: 'FAF5E4', width: 1.6, dashType: 'dash' }
  });

  // 日付
  slide.addText('10.16', {
    x: 0.58, y: 8.2, w: 3.8, h: 1.1,
    fontSize: 62, bold: true, color: 'FAF5E4', transparency: 12
  });
  slide.addText('（土）', {
    x: 3.7, y: 8.2, w: 1.5, h: 0.6,
    fontSize: 30, color: 'FAF5E4'
  });
  slide.addText('4年S科教室', {
    x: 3.7, y: 8.78, w: 3.8, h: 0.58,
    fontSize: 28, bold: true, color: 'FAF5E4'
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.48, y: 9.48, w: 7.31, h: 0,
    line: { color: 'C8C2B0', width: 1 }
  });

  // トッピング
  slide.addText('トッピング　ALL FREE！', {
    x: 0.78, y: 9.58, w: 6.72, h: 0.72,
    fontSize: 30, bold: true, color: '8DB36A', align: 'center',
    shadow: { type: 'outer', color: 'FFFFFF', blur: 4, offset: 0, angle: 0 }
  });
  slide.addText('ケチャップ　マスタード　マヨネーズ', {
    x: 0.78, y: 10.34, w: 6.72, h: 0.62,
    fontSize: 24, color: 'FAF5E4', align: 'center',
    shadow: { type: 'outer', color: 'FFFFFF', blur: 2, offset: 0, angle: 0 }
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 0.48, y: 11.04, w: 7.31, h: 0,
    line: { color: 'FAF5E4', width: 1.6, dashType: 'dash' }
  });

  slide.addText('現金のみ', {
    x: 0.78, y: 11.12, w: 2.5, h: 0.5,
    fontSize: 22, bold: true, color: 'FFF9C4'
  });
  slide.addText('おいしいホットドック屋さん', {
    x: 3.0, y: 11.12, w: 4.5, h: 0.5,
    fontSize: 16, color: 'C8C2B0', align: 'right'
  });
}

safeWriteFile(pptx, 'flyers/v1-2-new.pptx')
  .then(() => console.log('✅ flyers/v1-2-new.pptx を生成しました'))
  .catch(err => { console.error('❌ エラー:', err); process.exit(1); });
