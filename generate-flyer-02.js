// generate-flyer-02.js  — v2 刷新版（ディープリサーチ反映）
// 案①：本気系（漆黒×蛍光黄×人物全面 リムライト）
// 案②：ドドン深紅（¥200を手で持つ演出・傾き・縁取り）
// 案③：映画ポスターパロディ（シリアス×アクション×二度見ネタ）
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

const W = 8.27, H = 11.69;

// ══════════════════════════════════════════════════════════════
// v2-案①  本気系（漆黒×蛍光黄×人物全面）
// 視線誘導：コピーが主役、人物は迫力を添える舞台
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // 完全漆黒背景（灰色化禁止）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '111111' }, line: { type: 'none' }
  });

  // 人物：全面に大きく（contain・白リムライトで背景から分離）
  const p1 = peopleImgs[2] || peopleImgs[0];
  if (p1) {
    addContain(slide, p1, 0.0, 0.0, W, H, {
      vAlign: 'top',
      // 白いグローで人物の輪郭を黒背景から浮かせる
      shadow: { type: 'outer', color: 'FFFFFF', blur: 35, offset: 0, angle: 0 }
    });
  }

  // 上部黒帯（テキスト可読性確保・顔の上にテキスト乗せない）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 2.6,
    fill: { color: '000000', transparency: 30 }, line: { type: 'none' }
  });

  // 左縦黄ライン（視線誘導・アクセント）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.08, h: H,
    fill: { color: 'FFFF00' }, line: { type: 'none' }
  });

  // メインコピー「高専生が本気で焼いてます。」蛍光イエロー Impact
  // → 上部帯の中に配置（顔より上・テキスト可読性帯の中）
  slide.addText('高専生が本気で', {
    x: 0.25, y: 0.1, w: 7.8, h: 1.15,
    fontSize: 54, bold: true, color: 'FFFF00', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FFFF00', blur: 18, offset: 0, angle: 0 }
  });
  slide.addText('焼いてます。', {
    x: 0.25, y: 1.2, w: 7.8, h: 1.1,
    fontSize: 54, bold: true, color: 'FFFF00', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FFFF00', blur: 18, offset: 0, angle: 0 }
  });

  // ホットドッグ：右側エリア（人物の前景）
  if (hotdogImgs[0]) {
    addContain(slide, hotdogImgs[0], 3.8, 3.8, 4.47, 3.5, {
      shadow: { type: 'outer', color: 'FFFF00', blur: 22, offset: 0, angle: 0 }
    });
  }

  // ¥200 特大（左下・画面の40%占有・赤グロー）
  // 人物の顔や手と重ならない下半身エリアに配置
  slide.addText('¥200', {
    x: -0.2, y: 4.8, w: 6.5, h: 2.8,
    fontSize: 155, bold: true, color: 'FF2200', fontFace: 'Impact',
    shadow: { type: 'outer', color: 'FF2200', blur: 22, offset: 0, angle: 0 }
  });

  // 下部情報帯
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 8.7, w: W, h: H - 8.7,
    fill: { color: '000000', transparency: 20 }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 8.72, w: W, h: 0.04,
    fill: { color: 'FFFF00' }, line: { type: 'none' }
  });

  // しずる
  slide.addText('外はぱりっ、中はジューシー。', {
    x: 0.25, y: 8.82, w: 7.7, h: 0.68,
    fontSize: 26, bold: true, color: 'FFFFFF',
    shadow: { type: 'outer', color: '000000', blur: 5, offset: 2, angle: 45 }
  });

  // トッピング（1行・改行なし）
  slide.addText('ケチャップ　マスタード　マヨネーズ　全部FREE', {
    x: 0.25, y: 9.55, w: 7.7, h: 0.6,
    fontSize: 23, bold: true, color: 'FFFF00', fontFace: 'Impact'
  });

  // 日付 44pt
  slide.addText('10月16日（土）', {
    x: 0.25, y: 10.2, w: 7.7, h: 0.92,
    fontSize: 44, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // 場所・現金
  slide.addText('4年S科教室　/　現金のみ', {
    x: 0.25, y: 11.12, w: 7.7, h: 0.52,
    fontSize: 26, bold: true, color: 'FFFF00', fontFace: 'Impact'
  });
}

// ══════════════════════════════════════════════════════════════
// v2-案②  ドドン深紅（¥200を人物の手で"持つ"演出）
// 傾き＋縁取りで「ドンッ」感
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // 深紅全面（高級感・重厚感）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '8B0000' }, line: { type: 'none' }
  });

  // 暗い被せ（構図の引き締め）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '000000', transparency: 55 }, line: { type: 'none' }
  });

  // 対角グラデ風（右上から左下に向けて少し明るく）
  slide.addShape(pptx.ShapeType.rect, {
    x: 3.0, y: 0, w: W - 3.0, h: H * 0.4,
    fill: { color: 'AA0000', transparency: 40 }, line: { type: 'none' }
  });

  // ホットドッグ：右上（人物より先に配置・z-order下）
  if (hotdogImgs[0]) {
    addContain(slide, hotdogImgs[0], 3.5, 0.1, 4.77, 3.8);
  }

  // 人物：左寄り全高（contain・アスペクト比保持）
  const p2 = peopleImgs[4] || peopleImgs[0];
  if (p2) {
    addContain(slide, p2, -0.8, 0.0, 7.5, H, {
      hAlign: 'left', vAlign: 'top',
      shadow: { type: 'outer', color: 'FFFFFF', blur: 20, offset: 0, angle: 0 }
    });
  }

  // 上部コピー
  slide.addText('このホットドッグ、', {
    x: 0.3, y: 0.12, w: 7.7, h: 0.88,
    fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    shadow: { type: 'outer', color: '000000', blur: 10, offset: 4, angle: 45 }
  });
  slide.addText('本気です。', {
    x: 0.3, y: 0.95, w: 7.7, h: 0.95,
    fontSize: 52, bold: true, color: 'FFE600', fontFace: 'Impact',
    // 蛍光グロー
    shadow: { type: 'outer', color: 'FFE600', blur: 18, offset: 0, angle: 0 }
  });

  // ¥200 特大（人物の手の高さに・傾き・縁取り効果）
  // 縁取り代わりに下地黒shadow + 前景白shadow を重ねる
  slide.addText('¥200', {
    x: 0.5, y: 4.8, w: 7.5, h: 3.0,
    fontSize: 160, bold: true, color: 'FFE600', fontFace: 'Impact',
    rotate: -4,
    // 黒落ち影で読みやすさ確保（顔・手に重なっても可読）
    shadow: { type: 'outer', color: '000000', blur: 10, offset: 4, angle: 40 }
  });
  // 白グロー縁取り（2枚重ね）
  slide.addText('¥200', {
    x: 0.5, y: 4.8, w: 7.5, h: 3.0,
    fontSize: 160, bold: true, color: 'FFE600', fontFace: 'Impact',
    rotate: -4,
    transparency: 0,
    shadow: { type: 'outer', color: 'FFFFFF', blur: 3, offset: 0, angle: 0 }
  });

  // しずる
  slide.addText('かじった瞬間、じゅわっとあふれる。', {
    x: 0.3, y: 8.15, w: 7.7, h: 0.72,
    fontSize: 26, bold: true, color: 'FFFFFF',
    shadow: { type: 'outer', color: '000000', blur: 6, offset: 2, angle: 45 }
  });

  // 黄線
  slide.addShape(pptx.ShapeType.line, {
    x: 0.3, y: 9.0, w: 7.67, h: 0,
    line: { color: 'FFE600', width: 2.5 }
  });

  // TOPPING ALL FREE
  slide.addText('TOPPING  ALL  FREE', {
    x: 0.3, y: 9.1, w: 7.7, h: 0.65,
    fontSize: 32, bold: true, color: 'FFE600', fontFace: 'Impact'
  });

  // トッピング（1行・幅十分・改行なし）
  slide.addText('ケチャップ　　マスタード　　マヨネーズ', {
    x: 0.3, y: 9.78, w: 7.7, h: 0.65,
    fontSize: 28, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // 仕切り線
  slide.addShape(pptx.ShapeType.line, {
    x: 0.3, y: 10.52, w: 7.67, h: 0,
    line: { color: 'FFFFFF', width: 1, transparency: 40 }
  });

  // 日付 46pt
  slide.addText('10月16日（土）', {
    x: 0.3, y: 10.58, w: 7.7, h: 0.88,
    fontSize: 46, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // 場所・現金
  slide.addText('4年S科教室　/　現金のみ', {
    x: 0.3, y: 11.47, w: 7.7, h: 0.2,
    fontSize: 14, color: 'FFE600', fontFace: 'Impact'
  });
}

// ══════════════════════════════════════════════════════════════
// v2-案③  映画ポスターパロディ（シリアス×アクション×二度見ネタ）
// 本物の映画ポスター構成を忠実に再現し「ギャップ」で笑いを取る
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();

  // 背景：ほぼ黒
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: '080808' }, line: { type: 'none' }
  });

  // 人物：全面（最大限大きく・映画スター扱い）
  const p3 = peopleImgs[5] || peopleImgs[0];
  if (p3) {
    addContain(slide, p3, 0.0, 0.3, W, 9.5, {
      vAlign: 'top',
      shadow: { type: 'outer', color: 'CC0000', blur: 25, offset: 0, angle: 0 }
    });
  }

  // ホットドッグ：左上（フィルム的な配置）
  if (hotdogImgs[0]) {
    addContain(slide, hotdogImgs[0], 0.2, 0.3, 2.5, 1.9);
  }

  // 上部から下に向かう暗いグラデ（テキスト可読性）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 1.4,
    fill: { color: '000000', transparency: 25 }, line: { type: 'none' }
  });

  // 下部から上のドラマチックな赤グロー
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.2, w: W, h: 2.5,
    fill: { color: 'CC0000', transparency: 60 }, line: { type: 'none' }
  });

  // 最下部黒帯（クレジットゾーン）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 9.4, w: W, h: H - 9.4,
    fill: { color: '000000', transparency: 15 }, line: { type: 'none' }
  });

  // ─── 最上部：製作クレジット（本物映画ポスター風）───
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.38,
    fill: { color: '000000', transparency: 10 }, line: { type: 'none' }
  });
  slide.addText('旭川工業高等専門学校　システム制御情報工学科　4年生　制作・配給', {
    x: 0.2, y: 0.04, w: 7.87, h: 0.28,
    fontSize: 9.5, color: 'AAAAAA', align: 'center', letterSpacing: 1
  });

  // 「劇場版」ロゴ（映画冠詞）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2, y: 0.42, w: 1.0, h: 0.34,
    fill: { color: 'CC0000' }, line: { type: 'none' }
  });
  slide.addText('劇場版', {
    x: 0.2, y: 0.42, w: 1.0, h: 0.34,
    fontSize: 13, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Impact'
  });

  // ─── あおり文（映画風煽り×ホットドッグ文脈）───
  slide.addText('この 200円が、伝説となる。', {
    x: 0.25, y: 0.82, w: 7.77, h: 0.68,
    fontSize: 30, bold: true, color: 'FFFFFF', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: '000000', blur: 8, offset: 3, angle: 45 }
  });

  // ─── メインタイトル（大・下部・シリアス）───
  slide.addText('おいしいホットドック屋さん', {
    x: 0.15, y: 9.35, w: 7.97, h: 1.15,
    fontSize: 47, bold: true, color: 'FFFFFF', fontFace: 'Impact', align: 'center',
    shadow: { type: 'outer', color: 'CC0000', blur: 18, offset: 0, angle: 0 }
  });

  // サブタイトル（ネタ深度UP）
  slide.addText('〜 高専生が本気で焼く、青春の一皿 〜', {
    x: 0.3, y: 10.5, w: 7.67, h: 0.5,
    fontSize: 17, color: 'DDDDDD', align: 'center', italic: true
  });

  // ─── キャスト・監督クレジット（映画ポスター下部・本物再現）───
  slide.addShape(pptx.ShapeType.line, {
    x: 0.3, y: 11.05, w: 7.67, h: 0,
    line: { color: 'AAAAAA', width: 0.5, transparency: 30 }
  });
  slide.addText('出演：旭川高専4年生一同　特別出演：ホットドッグ（本人役）', {
    x: 0.3, y: 11.1, w: 7.67, h: 0.28,
    fontSize: 10, color: 'AAAAAA', align: 'center'
  });

  // 公開日・鑑賞料（映画ポスター形式）
  slide.addText('2026年10月16日（土）　絶賛公開中', {
    x: 0.3, y: 11.39, w: 4.3, h: 0.26,
    fontSize: 11, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });
  slide.addText('鑑賞料 ¥200（税込・現金のみ）', {
    x: 4.6, y: 11.39, w: 3.47, h: 0.26,
    fontSize: 10.5, bold: true, color: 'FFFFFF', fontFace: 'Impact', align: 'right'
  });

  // 上映場所（映画館名→教室名）
  slide.addText('上映場所：4年S科教室（全館解放）', {
    x: 0.3, y: 11.62, w: 7.67, h: 0.06,
    fontSize: 8, color: '888888', align: 'center'
  });
}

pptx.writeFile({ fileName: 'flyers/hotdog-flyer-02.pptx' })
  .then(() => console.log('✅ flyers/hotdog-flyer-02.pptx を生成しました'))
  .catch(err => { console.error('❌ エラー:', err); process.exit(1); });
