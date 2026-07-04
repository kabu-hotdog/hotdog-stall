// 全10案スクリプト（Fable自由制作版）
// 出力: flyers/hotdog-nine.pptx （新規ファイル・既存pptxは上書きしない）
// v1: ダイナー（確定版再現） v2: ネオンWANTED（確認済み）
// v3: 号外新聞（新規） v4: チーズ勲章＋価格ホール（新規） v5: 選挙（磨き込み）
// v6: プレミアム濃紺×金 v7: ナチュラルカフェ円形散らし v8: Y2Kステッカー v9: 和モダン「旨」
// v10: ドパガキ（ショート動画フィードUIパロディ）
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
  return { x, y, w, h };
}

// pptxgenjsのsizing:{type:'cover'}は実画像サイズを読まずボックスサイズをそのまま使うため、
// アスペクト比が違う画像で「クロップ」ではなく「引き伸ばし」になるバグがある。
// 実寸(getPngSize)を渡してcrop計算だけ正しくさせ、最終配置は常にboxピッタリにする。
function addCover(slide, imgPath, x, y, w, h, opts = {}) {
  const dims = getPngSize(imgPath);
  const natW = dims ? dims.width : w;
  const natH = dims ? dims.height : h;
  slide.addImage({
    path: imgPath, x, y, w: natW / 300, h: natH / 300,
    sizing: { type: 'cover', w, h },
    ...opts
  });
}

function scanImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
    .map(f => path.join(dir, f).replace(/\\/g, '/'));
}

const hotdogImgs = scanImages('images/hotdog');
// 人物画像は images/people/cropped/（透明余白を除去済み。crop-people-images.js で生成）を優先使用。
// 元画像は removebg 由来で余白が大きく、contain-fit がキャンバス全体基準になるため
// 人物が意図より小さく縮小される問題があった（v2:55%, v3:48%しか実際は写っていなかった）。
const peopleImgs = scanImages('images/people/cropped');
// 人物写真はファイル番号で解決する（ディレクトリのファイル増減でインデックスがずれる事故防止）
const personByNum = n => peopleImgs.find(p => p.includes(n));
const cheeseHotdog = hotdogImgs[0];
const plainHotdog  = hotdogImgs[1] || hotdogImgs[0];

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'A4', width: 8.27, height: 11.69 });
pptx.layout = 'A4';
const W = 8.27, H = 11.69;

// 放射状スピードライン（中心から外へ伸びる細い三角形）
function addRadialLines(slide, cx, cy, count, rInner, rOuter, colors, opts = {}) {
  const { widthDeg = 2.2, transparency = 0 } = opts;
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i;
    const a1 = (angle - widthDeg) * Math.PI / 180;
    const a2 = (angle + widthDeg) * Math.PI / 180;
    const x1 = cx + rInner * Math.cos(a1), y1 = cy + rInner * Math.sin(a1) * 1.41;
    const x2 = cx + rOuter * Math.cos(a1), y2 = cy + rOuter * Math.sin(a1) * 1.41;
    const x3 = cx + rOuter * Math.cos(a2), y3 = cy + rOuter * Math.sin(a2) * 1.41;
    const x4 = cx + rInner * Math.cos(a2), y4 = cy + rInner * Math.sin(a2) * 1.41;
    const minX = Math.min(x1, x2, x3, x4), maxX = Math.max(x1, x2, x3, x4);
    const minY = Math.min(y1, y2, y3, y4), maxY = Math.max(y1, y2, y3, y4);
    slide.addShape(pptx.ShapeType.triangle, {
      x: minX, y: minY, w: Math.max(maxX - minX, 0.02), h: Math.max(maxY - minY, 0.02),
      fill: { color: colors[i % colors.length], transparency },
      line: { type: 'none' }, rotate: angle
    });
  }
}

// ハーフトーン/ドットパターン（汎用）
function addDotField(slide, x0, y0, cols, rows, pitch, dotR, color, transparency) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * pitch + (r % 2 === 0 ? 0 : pitch / 2);
      const y = y0 + r * pitch;
      slide.addShape(pptx.ShapeType.ellipse, {
        x, y, w: dotR * 2, h: dotR * 2,
        fill: { color, transparency }, line: { type: 'none' }
      });
    }
  }
}

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
    x: -0.1, y: 0.08, w: 4.6, h: 1.0, wrap: false,
    fontSize: 60, bold: true, color: 'FFFFFF', fontFace: 'Impact', rotate: -6,
    shadow: { type: 'outer', color: '000000', blur: 5, offset: 3, angle: 45 }
  });
  if (plainHotdog) {
    addContain(slide, plainHotdog, -0.3, 1.75, 4.3, 3.2, { vAlign: 'center' }); // チーズ側と同寸に統一
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
    addContain(slide, cheeseHotdog, 3.95, 1.75, 4.3, 3.2, { vAlign: 'center' }); // ノーマル側と同寸に統一
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

  // 人物はブロック末尾で描画（確定版ダイナー.jpgでは右下・情報ゾーンの前面）

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
  // USAバッジ（確定版に合わせて中央寄り・人物と重ならない位置）
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 4.35, y: 6.82, w: 1.5, h: 1.5,
    fill: { color: '40E0D0' }, line: { color: 'FFFFFF', width: 2.5 }
  });
  slide.addText('★ USA ★\nHOT DOG', {
    x: 4.35, y: 6.88, w: 1.5, h: 1.14,
    fontSize: 18, bold: true, color: '1A1A1A', align: 'center', valign: 'middle',
    fontFace: 'Impact', lineSpacing: 21
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
  slide.addText('4年S科教室　／　現金のみ', {
    x: 0.2, y: 11.36, w: 5.5, h: 0.33, wrap: false,
    fontSize: 20, bold: true, color: 'FFFFFF', fontFace: 'Impact'
  });

  // 人物（確定版ダイナー.jpgの配置を再現: 右下・全要素の前面・右端は断ち落とし）
  const p1 = personByNum('1000019031');
  if (p1) {
    const dims = getPngSize(p1);
    const h1 = 5.42;
    const w1 = dims ? h1 * (dims.width / dims.height) : 4.43;
    slide.addImage({ path: p1, x: W - w1 + 0.55, y: H - h1, w: w1, h: h1 });
  }
}

// ══════════════════════════════════════════════════════════════
// v2  ネオンサイバー ＋ ダブルリムライト／WANTED風パロディ
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const SP2 = 4.0;

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H, fill: { color: '0A0012' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SP2, h: H, fill: { color: '002A2A', transparency: 60 }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: SP2, y: 0, w: W - SP2, h: H, fill: { color: '2A1A00', transparency: 60 }, line: { type: 'none' }
  });

  // スキャンライン（2層・半ピッチずらしでちらつき感を追加）
  for (let y = 0; y < 11.7; y += 0.28) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y, w: W, h: 0, line: { color: 'B026FF', width: 0.3, transparency: 88 }
    });
  }
  for (let y = 0.14; y < 11.7; y += 0.28) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y, w: W, h: 0, line: { color: 'FF2D78', width: 0.2, transparency: 93 }
    });
  }

  [
    { y: 6.0, t: 84 }, { y: 6.8, t: 78 }, { y: 7.5, t: 72 },
    { y: 8.1, t: 66 }, { y: 8.6, t: 60 }, { y: 9.05, t: 54 },
    { y: 9.42, t: 48 }, { y: 9.74, t: 42 }, { y: 10.0, t: 36 },
    { y: 10.24, t: 30 }, { y: 10.44, t: 24 }, { y: 10.62, t: 18 },
    { y: 10.78, t: 13 }, { y: 10.92, t: 9 }, { y: 11.04, t: 6 },
    { y: 11.15, t: 4 }, { y: 11.25, t: 2 }, { y: 11.34, t: 1 },
  ].forEach(({ y, t }) => {
    slide.addShape(pptx.ShapeType.line, { x: 0, y, w: W, h: 0, line: { color: '00F5FF', width: 0.6, transparency: t } });
  });
  [1.24, 2.48, 4.135, 5.79, 7.03].forEach(x => {
    slide.addShape(pptx.ShapeType.line, { x, y: 6.0, w: 0, h: 5.69, line: { color: 'B026FF', width: 0.4, transparency: 72 } });
  });

  slide.addShape(pptx.ShapeType.rect, { x: SP2 - 0.06, y: 0, w: 0.12, h: H, fill: { color: 'B026FF', transparency: 35 }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.rect, { x: SP2 - 0.01, y: 0, w: 0.02, h: H, fill: { color: 'FFFFFF' }, line: { type: 'none' } });

  // ─── WANTED風パロディ帯（最上部・全幅）─── 人物は「指名手配写真」として活用 ─
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 1.5, fill: { color: '000000', transparency: 20 }, line: { color: 'CCFF00', width: 0.75, transparency: 30 }
  });
  slide.addText('WANTED', {
    x: 1.35, y: 0.03, w: W - 1.45, h: 0.5,
    fontSize: 30, bold: true, color: 'CCFF00', fontFace: 'Consolas', align: 'left',
    charSpacing: 2, shadow: { type: 'outer', color: 'CCFF00', blur: 10, offset: 0, angle: 0 }
  });
  slide.addText('THE BEST HOT DOG IN ASAHIKAWA', {
    x: 1.35, y: 0.55, w: W - 1.45, h: 0.34,
    fontSize: 13, bold: true, color: 'FFFFFF', fontFace: 'Consolas', align: 'left', charSpacing: 1
  });
  slide.addText('LOCK-ON  HOT-DOG.exe  99.8%\nTEMP 87℃  JUICE 98%  CRISP A+', {
    x: 1.35, y: 0.95, w: W - 1.45, h: 0.5,
    fontSize: 9, color: '00F5FF', fontFace: 'Consolas', align: 'left',
    shadow: { type: 'outer', color: '00F5FF', blur: 6, offset: 0, angle: 0 }
  });

  // 指名手配写真（人物バスト・正方形cover＋スキャンUIのターゲットサークルを重ねる）
  const neonP = personByNum('1000019038');
  const mugX = 0.15, mugY = 0.15, mugSize = 1.2;
  if (neonP) {
    addCover(slide, neonP, mugX, mugY, mugSize, mugSize, {
      shadow: { type: 'outer', color: '00F5FF', blur: 10, offset: 0, angle: 0 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: mugX, y: mugY, w: mugSize, h: mugSize, fill: { type: 'none' },
      line: { color: 'CCFF00', width: 1.5 }
    });
    // ターゲットサークル（写真の中心に重ねてスキャン中UI風に）
    const tcx = mugX + mugSize / 2, tcy = mugY + mugSize / 2;
    [0.55, 0.4].forEach((r, i) => {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: tcx - r, y: tcy - r, w: r * 2, h: r * 2,
        fill: { type: 'none' }, line: { color: '00F5FF', width: i === 1 ? 1 : 0.6, transparency: 30 + i * 15 }
      });
    });
  }

  // ─── LEFT: ノーマル（シアン）─────────────────────────
  slide.addText('ぱりっ', {
    x: -0.2, y: 1.65, w: 4.4, h: 1.15,
    fontSize: 78, bold: true, color: '00F5FF', rotate: -5,
    shadow: { type: 'outer', color: '00F5FF', blur: 30, offset: 0, angle: 0 }
  });
  if (plainHotdog) {
    addContain(slide, plainHotdog, 0.1, 2.85, 3.8, 2.3, {
      shadow: { type: 'outer', color: '00F5FF', blur: 28, offset: 0, angle: 0 }
    });
    // シアン反射光オーバーレイ
    slide.addShape(pptx.ShapeType.rect, { x: 0.1, y: 2.85, w: 3.8, h: 2.3, fill: { color: '00F5FF', transparency: 88 }, line: { type: 'none' } });
  }
  slide.addText('ホットドッグ', {
    x: 0.1, y: 5.15, w: 3.8, h: 0.48,
    fontSize: 16, bold: true, color: '00F5FF', fontFace: 'Consolas', align: 'center',
    shadow: { type: 'outer', color: '00F5FF', blur: 8, offset: 0, angle: 0 }
  });
  slide.addText('¥200', {
    x: 0.05, y: 5.55, w: 3.8, h: 1.3,
    fontSize: 90, bold: true, color: 'FFFFFF', fontFace: 'Consolas',
    shadow: { type: 'outer', color: '00F5FF', blur: 34, offset: 0, angle: 0 }
  });

  // ─── RIGHT: チーズ（ゴールド）────────────────────────
  slide.addText('とろ〜り', {
    x: 4.1, y: 1.65, w: 4.1, h: 1.15,
    fontSize: 66, bold: true, color: 'FFD700', rotate: 5,
    shadow: { type: 'outer', color: 'FFD700', blur: 28, offset: 0, angle: 0 }
  });
  if (cheeseHotdog) {
    addContain(slide, cheeseHotdog, 4.1, 2.85, 3.8, 2.3, {
      shadow: { type: 'outer', color: 'FFD700', blur: 28, offset: 0, angle: 0 }
    });
    // マゼンタ反射光オーバーレイ
    slide.addShape(pptx.ShapeType.rect, { x: 4.1, y: 2.85, w: 3.8, h: 2.3, fill: { color: 'FF2D78', transparency: 88 }, line: { type: 'none' } });
  }
  slide.addText('チーズホットドッグ', {
    x: 4.1, y: 5.15, w: 3.9, h: 0.48,
    fontSize: 16, bold: true, color: 'FFD700', fontFace: 'Consolas', align: 'center',
    shadow: { type: 'outer', color: 'FFD700', blur: 8, offset: 0, angle: 0 }
  });
  slide.addText('¥300', {
    x: 4.2, y: 5.55, w: 3.8, h: 1.3,
    fontSize: 90, bold: true, color: 'FFD700', fontFace: 'Consolas',
    shadow: { type: 'outer', color: 'FFD700', blur: 34, offset: 0, angle: 0 }
  });

  // ─── 情報ゾーン：ダークパネルを敷いて文字を浮かせる ─────
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.1, y: 6.75, w: W - 0.2, h: 4.8,
    fill: { color: '000000', transparency: 38 }, line: { color: 'B026FF', width: 1, transparency: 55 },
    rectRadius: 0.12
  });
  slide.addText('おいしいホットドック屋さん', {
    x: 0.25, y: 6.85, w: 5.5, h: 0.5,
    fontSize: 16, bold: true, color: '00F5FF', fontFace: 'Consolas',
    shadow: { type: 'outer', color: '00F5FF', blur: 10, offset: 0, angle: 0 }
  });
  slide.addText('外はぱりっ、チーズはとろ〜り。', {
    x: 0.25, y: 7.35, w: 6.5, h: 0.5,
    fontSize: 18, bold: true, color: 'FFFFFF',
    shadow: { type: 'outer', color: 'FF2D78', blur: 8, offset: 0, angle: 0 }
  });
  ['ケチャップ', 'マスタード', 'マヨネーズ'].forEach((t, i) => {
    slide.addText(t, {
      x: 0.2 + i * 2.68, y: 7.9, w: 2.6, h: 0.6,
      fontSize: 22, bold: true, color: '00F5FF', fontFace: 'Consolas', align: 'center',
      shadow: { type: 'outer', color: '00F5FF', blur: 14, offset: 0, angle: 0 }
    });
  });
  slide.addText('▶  ALL FREE  ◀', {
    x: 0.25, y: 8.55, w: 7.77, h: 0.75,
    fontSize: 34, bold: true, color: 'CCFF00', fontFace: 'Consolas', align: 'center',
    shadow: { type: 'outer', color: 'CCFF00', blur: 20, offset: 0, angle: 0 }
  });
  slide.addText('10月16日（土）', {
    x: 0.25, y: 9.35, w: 7.77, h: 0.85,
    fontSize: 40, bold: true, color: 'FF2D78', fontFace: 'Consolas', align: 'center',
    shadow: { type: 'outer', color: 'FF2D78', blur: 22, offset: 0, angle: 0 }
  });
  slide.addText('4年S科教室', {
    x: 0.25, y: 10.22, w: 5.3, h: 0.6,
    fontSize: 27, bold: true, color: 'FFFFFF', fontFace: 'Consolas',
    shadow: { type: 'outer', color: '00F5FF', blur: 12, offset: 0, angle: 0 }
  });
  slide.addText('現金のみ', {
    x: 5.6, y: 10.22, w: 2.32, h: 0.6,
    fontSize: 22, bold: true, color: 'CCFF00', fontFace: 'Consolas', align: 'right',
    shadow: { type: 'outer', color: 'CCFF00', blur: 10, offset: 0, angle: 0 }
  });
  slide.addText('旭川高専 システム制御情報工学科 4年', {
    x: 0.25, y: 10.9, w: 7.77, h: 0.4,
    fontSize: 12, bold: true, color: 'B026FF', align: 'center',
    shadow: { type: 'outer', color: 'B026FF', blur: 8, offset: 0, angle: 0 }
  });
}

// ─────────────────────────────────────────────────────────────
// 縦書きヘルパー：eaVertは促音で蛇行するため1文字ずつ積む。
// 促音・拗音は小さく、長音「ー」「〜」は90度回転。
function vText(slide, text, x, topY, opts = {}) {
  const {
    fontSize = 60, color = '1A1A1A', fontFace = 'HGMinchoE',
    bold = false, charH = null, smallRatio = 0.75, transparency
  } = opts;
  const SMALL = 'っゃゅょぁぃぅぇぉッャュョ';
  const ROT = 'ー〜―…';
  const PUNCT = '、。';
  let y = topY;
  for (const ch of text) {
    const isSmall = SMALL.includes(ch);
    const isPunct = PUNCT.includes(ch);
    const fs = isSmall ? Math.round(fontSize * smallRatio) : fontSize;
    const baseH = charH != null ? charH : fontSize / 72 * 1.18;
    const h = isPunct ? baseH * 0.5 : (isSmall ? baseH * smallRatio : baseH);
    const o = {
      x, y, w: fontSize / 72 * 1.5, h, wrap: false,
      fontSize: fs, color, fontFace, bold,
      // 縦組の句読点はマスの右上に寄せるのが正式
      align: isPunct ? 'right' : 'center',
      valign: isPunct ? 'top' : 'middle'
    };
    if (transparency != null) o.transparency = transparency;
    if (ROT.includes(ch)) o.rotate = 90;
    slide.addText(ch, o);
    y += h;
  }
  return y; // 次のY（列の下端）
}

// ══════════════════════════════════════════════════════════════
// v3  号外新聞 ──「伝説の一本、上陸」を報じる特別號。
//     屋台情報を新聞の文法（見出し・記事・特報）に翻訳する。
//     白×墨×朱のみ。縦書き特大見出しが柱。
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const PAPER = 'F7F3E8', SUMI = '1A1A1A', AKA = 'C1272D';

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: PAPER }, line: { type: 'none' } });

  // ─ 題字（マストヘッド）─ 二重罫線に挟む
  slide.addShape(pptx.ShapeType.line, { x: 0.3, y: 0.5, w: 7.67, h: 0, line: { color: SUMI, width: 2.5 } });
  slide.addShape(pptx.ShapeType.line, { x: 0.3, y: 0.58, w: 7.67, h: 0, line: { color: SUMI, width: 0.75 } });
  slide.addText('旭川高専日刊　ホットドッグ新聞', {
    x: 0.3, y: 0.66, w: 7.67, h: 0.62, wrap: false,
    fontSize: 28, bold: true, color: SUMI, fontFace: 'HGMinchoE', align: 'center', charSpacing: 4
  });
  slide.addShape(pptx.ShapeType.line, { x: 0.3, y: 1.36, w: 7.67, h: 0, line: { color: SUMI, width: 0.75 } });
  slide.addShape(pptx.ShapeType.line, { x: 0.3, y: 1.44, w: 7.67, h: 0, line: { color: SUMI, width: 2.5 } });
  slide.addText('2026年（令和8年）10月16日　土曜日', {
    x: 0.35, y: 1.5, w: 4.4, h: 0.34, wrap: false,
    fontSize: 12, color: SUMI, fontFace: 'BIZ UDPMincho Medium'
  });
  slide.addText('特別號・無料配布', {
    x: 5.6, y: 1.5, w: 2.37, h: 0.34, wrap: false,
    fontSize: 12, color: AKA, fontFace: 'BIZ UDPMincho Medium', align: 'right'
  });

  // ─ 号外スタンプ（朱・左上・傾き）─
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 2.15, w: 2.7, h: 1.55, rotate: -5,
    fill: { color: AKA }, line: { type: 'none' },
    shadow: { type: 'outer', color: '000000', blur: 6, offset: 3, angle: 45 }
  });
  slide.addText('号外', {
    x: 0.5, y: 2.15, w: 2.7, h: 1.55, rotate: -5, wrap: false,
    fontSize: 76, bold: true, color: 'FFFFFF', fontFace: 'HGMinchoE',
    align: 'center', valign: 'middle', charSpacing: 8
  });

  // ─ 縦書き特大見出し（右端の柱・7字に凝縮して帯の手前で止める）─
  vText(slide, '伝説の一本上陸', 6.85, 1.8, { fontSize: 62, fontFace: 'HGMinchoE', bold: true, color: SUMI });

  // ─ 報道写真（黒罫の額）＋キャプション ─
  {
    const pw = 3.6, ph = pw / 0.91; // kamehameha aspect 0.910
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.42, y: 4.18, w: pw + 0.16, h: ph + 0.16,
      fill: { color: 'FFFFFF' }, line: { color: SUMI, width: 1.5 }
    });
    const p3 = personByNum('1000019040');
    if (p3) slide.addImage({ path: p3, x: 0.5, y: 4.26, w: pw, h: ph });
    // 手の輪の中にノーマルホットドッグを持たせる（写真の手位置に実測合わせ）
    if (plainHotdog) {
      slide.addImage({
        path: plainHotdog, x: 0.68, y: 6.1, w: 1.6, h: 1.07, rotate: -18,
        shadow: { type: 'outer', color: '555555', blur: 6, offset: 2, angle: 90 }
      });
    }
    slide.addText('一本を構える店主・佐藤保成さん（S科4年）＝10月、旭川市内で', {
      x: 0.42, y: 4.26 + ph + 0.12, w: pw + 0.16, h: 0.5,
      fontSize: 10.5, color: SUMI, fontFace: 'BIZ UDPMincho Medium'
    });
  }

  // ─ 記事（横小見出し＋段組風本文・縦罫）─
  slide.addShape(pptx.ShapeType.line, { x: 4.32, y: 4.2, w: 0, h: 4.9, line: { color: SUMI, width: 0.75 } });
  slide.addText('文化祭に本格派あらわる', {
    x: 4.5, y: 4.22, w: 2.1, h: 0.42, wrap: false,
    fontSize: 15, bold: true, color: AKA, fontFace: 'HGMinchoE'
  });
  slide.addText(
    '　十月十六日、旭川高専文化祭にて「おいしいホットドック屋さん」が開店する。外はぱりっと、中からじゅわり。チーズはまるごと一個分とろける。\n' +
    '　店主の佐藤保成さんは「トッピングは全部無料」と強気の構え。ケチャップ、マスタード、マヨネーズが選び放題。会場は4年S科教室、現金のみ。売り切れ次第終了という。（本紙特報部）',
    {
      x: 4.5, y: 4.72, w: 2.0, h: 5.0,
      fontSize: 12.5, color: SUMI, fontFace: 'BIZ UDPMincho Medium', lineSpacing: 19
    }
  );

  // ─ 下部・特報帯（墨ベタ＋特大価格）─
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 9.35, w: W, h: H - 9.35, fill: { color: SUMI }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 9.7, w: 1.45, h: 1.45, fill: { color: AKA }, line: { type: 'none' }
  });
  slide.addText('特報', {
    x: 0.4, y: 9.7, w: 1.45, h: 1.45, wrap: false,
    fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'HGMinchoE', align: 'center', valign: 'middle'
  });
  slide.addText('ノーマル ¥200', {
    x: 2.1, y: 9.55, w: 5.9, h: 0.95, wrap: false,
    fontSize: 46, bold: true, color: 'FFFFFF', fontFace: 'HGMinchoE'
  });
  slide.addText('チーズ ¥300', {
    x: 2.1, y: 10.5, w: 5.9, h: 0.95, wrap: false,
    fontSize: 46, bold: true, color: PAPER, fontFace: 'HGMinchoE'
  });
  slide.addText('会場・4年S科教室｜現金のみ', {
    x: 4.9, y: 11.22, w: 3.1, h: 0.36, wrap: false,
    fontSize: 13, color: 'FFFFFF', fontFace: 'BIZ UDPMincho Medium', align: 'right'
  });
}

// ══════════════════════════════════════════════════════════════
// v4  チーズ（再構築）── 勲章構図。白リングの中心に人物を据え、
//     「チーズの穴に価格を入れる」仕掛けで情報をモチーフに翻訳。
//     仕上げに実測フィット済みのチーズ枠（AI生成素材）を纏わせる。
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const BASE = 'FCDB66', DEEP = 'E0932A', BROWN = '6B3A0A', CREAM = 'FFF3D6';

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: BASE }, line: { type: 'none' } });

  // キャッチ（上部・ポップ体）
  slide.addText('チーズ、まるごと一個分。', {
    x: 0.6, y: 1.0, w: 7.07, h: 0.85, wrap: false,
    fontSize: 38, bold: true, color: BROWN, fontFace: 'HGSoeiKakupoptai', align: 'center'
  });
  slide.addText('のびます。とろけます。祭りです。', {
    x: 0.6, y: 1.85, w: 7.07, h: 0.5, wrap: false,
    fontSize: 18, bold: true, color: DEEP, fontFace: 'HGSoeiKakupoptai', align: 'center', charSpacing: 3
  });

  // ─ 勲章リング＋人物（丸を抱えるポーズが勲章の中心に）─
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 1.68, y: 2.75, w: 4.9, h: 4.9,
    fill: { color: CREAM }, line: { color: 'FFFFFF', width: 6 },
    shadow: { type: 'outer', color: 'B8860B', blur: 18, offset: 5, angle: 90 }
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 1.9, y: 2.97, w: 4.46, h: 4.46,
    fill: { type: 'none' }, line: { color: DEEP, width: 1.5, dashType: 'dash' }
  });
  {
    const p4 = personByNum('1000019062'); // ball-hug aspect 0.531
    if (p4) {
      const ph = 5.9, pw = ph * 0.531;
      slide.addImage({
        path: p4, x: (W - pw) / 2, y: 2.35, w: pw, h: ph,
        shadow: { type: 'outer', color: '8B6914', blur: 12, offset: 4, angle: 90 }
      });
    }
  }

  // ─ チーズの穴＝価格（大胆な仕掛け）─
  // 小穴（リズム用・無地）
  [[0.85, 2.5, 0.5], [7.0, 3.1, 0.42], [0.72, 5.9, 0.36], [7.3, 6.6, 0.3]].forEach(([cx, cy, r]) => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: cx - r, y: cy - r, w: r * 2, h: r * 2,
      fill: { color: DEEP, transparency: 30 }, line: { type: 'none' }
    });
  });
  // 価格穴・ノーマル（※inner shadowはpptxgenjsが壊れたXMLを吐くため使用禁止）
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 0.65, y: 7.5, w: 2.55, h: 2.55,
    fill: { color: DEEP }, line: { color: BROWN, width: 2 }
  });
  slide.addText('ノーマル\n¥200', {
    x: 0.65, y: 7.5, w: 2.55, h: 2.55,
    fontSize: 30, bold: true, color: 'FFFFFF', fontFace: 'HGSoeiKakupoptai',
    align: 'center', valign: 'middle', lineSpacing: 34
  });
  // 価格穴・チーズ（主役なので大きく）
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 4.95, y: 7.3, w: 2.75, h: 2.75,
    fill: { color: BROWN }, line: { color: DEEP, width: 2.5 }
  });
  slide.addText('チーズ\n¥300', {
    x: 4.95, y: 7.3, w: 2.75, h: 2.75,
    fontSize: 34, bold: true, color: 'FFE066', fontFace: 'HGSoeiKakupoptai',
    align: 'center', valign: 'middle', lineSpacing: 38
  });

  // ─ 下部情報（帯なし・茶文字2行・右下のフレーム絵柄を避けて左寄りセンター）─
  slide.addText('10月16日（土）　4年S科教室', {
    x: 0.55, y: 10.14, w: 5.8, h: 0.48, wrap: false,
    fontSize: 19, bold: true, color: BROWN, fontFace: 'HGSoeiKakupoptai', align: 'center'
  });
  slide.addText('トッピング全部無料・現金のみ', {
    x: 0.55, y: 10.62, w: 5.8, h: 0.42, wrap: false,
    fontSize: 15, bold: true, color: BROWN, fontFace: 'HGSoeiKakupoptai', align: 'center'
  });

  // ─ チーズ枠（最前面・実測窓フィット）─
  const cheeseFrame = 'images/cheese-frame.png';
  if (fs.existsSync(cheeseFrame)) {
    const dims = getPngSize(cheeseFrame);
    if (dims) {
      const fL = 156 / dims.width, fR = 868 / dims.width;
      const fT = 193 / dims.height, fB = 1240 / dims.height;
      const border = 0.42;
      const boxW = (W - 2 * border) / (fR - fL);
      const boxH = (H - 2 * border) / (fB - fT);
      slide.addImage({ path: cheeseFrame, x: border - fL * boxW, y: border - fT * boxH, w: boxW, h: boxH });
    }
  }
}

// ══════════════════════════════════════════════════════════════
// v5  選挙ポスター風（磨き込み）── 名前をさらに太く・特大に、
//     「必勝」朱印と比例ジョーク帯を追加。定石の記号を増やす。
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const NAVY = '1B3F8F', RED = 'D7000F', INK = '1A1A1A';

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: 'FFFFFF' }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 8.45, w: W, h: H - 8.45, fill: { color: NAVY }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: -1.6, y: -1.6, w: 4.4, h: 4.4, fill: { color: RED, transparency: 88 }, line: { type: 'none' }
  });

  // 選挙名の帯（最上部・「スローガン上」レイアウトの定石）
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.46, fill: { color: RED }, line: { type: 'none' } });
  slide.addText('第1回 旭川高専文化祭 総選挙　─ 味の政権交代、始まる ─', {
    x: 0, y: 0, w: W, h: 0.46, wrap: false,
    fontSize: 16, bold: true, color: 'FFFFFF', fontFace: 'BIZ UDGothic', align: 'center', valign: 'middle', charSpacing: 2
  });

  // キャッチコピー
  slide.addText('うまさに、一票を。', {
    x: 0.35, y: 0.6, w: 7.6, h: 0.95, wrap: false,
    fontSize: 44, bold: true, color: INK, fontFace: 'BIZ UDGothic', charSpacing: 4
  });
  slide.addShape(pptx.ShapeType.rect, { x: 0.38, y: 1.6, w: 3.6, h: 0.1, fill: { color: RED }, line: { type: 'none' } });
  // 演説ジョーク（右上の余白を締める）
  slide.addText('演説は店頭にて随時開催中', {
    x: 4.1, y: 1.58, w: 3.0, h: 0.35, wrap: false,
    fontSize: 12, bold: true, color: NAVY, fontFace: 'BIZ UDGothic', align: 'left', charSpacing: 2
  });

  // 候補者写真（バストアップ・紺帯に接地）
  {
    const p5 = personByNum('1000019031');
    if (p5) {
      const dims = getPngSize(p5);
      const bh = 7.0;
      const bw = dims ? bh * (dims.width / dims.height) : bh * 0.82;
      slide.addImage({
        path: p5, x: W - bw + 0.45, y: 8.45 - bh, w: bw, h: bh,
        shadow: { type: 'outer', color: '888888', blur: 14, offset: 4, angle: 90 }
      });
    }
  }

  // たすき
  slide.addShape(pptx.ShapeType.rect, {
    x: 3.5, y: 6.15, w: 5.3, h: 0.7, rotate: 20,
    fill: { color: RED }, line: { color: 'FFFFFF', width: 2.5 }
  });
  slide.addText('本格派・初出馬', {
    x: 3.5, y: 6.15, w: 5.3, h: 0.7, rotate: 20, wrap: false,
    fontSize: 25, bold: true, color: 'FFFFFF', fontFace: 'BIZ UDGothic',
    align: 'center', valign: 'middle', charSpacing: 3
  });

  // 候補者名（特大・太く）
  {
    const chars = ['ほ', 'っ', 'と', 'ど', 'っ', 'ぐ'];
    let ny = 1.82;
    chars.forEach(ch => {
      const isSmall = ch === 'っ';
      const chH = isSmall ? 0.86 : 1.18;
      slide.addText(ch, {
        x: 0.22, y: ny, w: 1.72, h: chH, wrap: false,
        fontSize: isSmall ? 56 : 78, bold: true, color: INK, fontFace: 'HGGothicE',
        align: 'center', valign: 'middle'
      });
      ny += chH;
    });
  }

  // 必勝の朱印（右上・傾き・定石）
  slide.addShape(pptx.ShapeType.rect, {
    x: 2.15, y: 1.85, w: 1.25, h: 1.25, rotate: 7,
    fill: { type: 'none' }, line: { color: RED, width: 3.5 }
  });
  slide.addText('必勝', {
    x: 2.15, y: 1.85, w: 1.25, h: 1.25, rotate: 7, wrap: false,
    fontSize: 34, bold: true, color: RED, fontFace: 'HGSeikaishotaiPRO',
    align: 'center', valign: 'middle'
  });

  // 党名バッジ
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 2.2, y: 3.55, w: 1.3, h: 1.3, fill: { color: NAVY }, line: { color: RED, width: 3 }
  });
  slide.addText('ホット\nドッグ党', {
    x: 2.2, y: 3.55, w: 1.3, h: 1.3,
    fontSize: 13, bold: true, color: 'FFFFFF', fontFace: 'BIZ UDGothic',
    align: 'center', valign: 'middle'
  });

  // 公約ゾーン
  slide.addText('公約', {
    x: 0.35, y: 8.62, w: 1.3, h: 0.62,
    fontSize: 30, bold: true, color: NAVY, fontFace: 'BIZ UDGothic',
    align: 'center', valign: 'middle', fill: { color: 'FFFFFF' }
  });
  slide.addText('一、パリッとホットドッグ\n一、とろ〜りチーズ\n一、トッピング全部無料を実現します', {
    x: 1.85, y: 8.58, w: 5.0, h: 1.5,
    fontSize: 19, bold: true, color: 'FFFFFF', fontFace: 'BIZ UDGothic', lineSpacing: 30
  });
  slide.addText('¥200\n¥300', {
    x: 6.6, y: 8.58, w: 1.35, h: 1.0,
    fontSize: 19, bold: true, color: 'FFFFFF', fontFace: 'BIZ UDGothic', align: 'right', lineSpacing: 30
  });
  slide.addShape(pptx.ShapeType.line, { x: 0.35, y: 10.2, w: 7.57, h: 0, line: { color: 'FFFFFF', width: 1, transparency: 40 } });
  slide.addText('投票日：10月16日（土）　投票所：4年S科教室', {
    x: 0.35, y: 10.3, w: 7.57, h: 0.55, wrap: false,
    fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'BIZ UDGothic'
  });
  slide.addText('※現金のみ・お一人様何票でも歓迎　／　おいしいホットドック屋さん', {
    x: 0.35, y: 10.9, w: 7.57, h: 0.38, wrap: false,
    fontSize: 13, color: 'FFFFFF', fontFace: 'BIZ UDGothic', transparency: 15
  });
  // 比例ジョーク帯（赤・最下部）
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 11.36, w: W, h: 0.33, fill: { color: RED }, line: { type: 'none' } });
  slide.addText('比例は「ホットドッグ党」と書いてください。', {
    x: 0, y: 11.36, w: W, h: 0.33, wrap: false,
    fontSize: 13, bold: true, color: 'FFFFFF', fontFace: 'BIZ UDGothic', align: 'center', valign: 'middle'
  });
}

// ══════════════════════════════════════════════════════════════
// v6  プレミアム ── 濃紺×金×生成り。縦書き明朝の柱、金枠額装、
//     行書のサイン。価格は静かに漢数字で。余白を贅沢に使う。
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const NAVY = '0B1526', GOLD = 'C9A227', CREAM = 'F5EFE2';

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { type: 'none' } });
  // 内枠（細い金の縁）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.28, y: 0.28, w: W - 0.56, h: H - 0.56,
    fill: { type: 'none' }, line: { color: GOLD, width: 1 }
  });

  // 金の紋章（左上）
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 0.75, y: 0.75, w: 1.3, h: 1.3, fill: { type: 'none' }, line: { color: GOLD, width: 2 }
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 0.87, y: 0.87, w: 1.06, h: 1.06, fill: { type: 'none' }, line: { color: GOLD, width: 0.75 }
  });
  slide.addText('旭川\n高専', {
    x: 0.75, y: 0.75, w: 1.3, h: 1.3,
    fontSize: 15, bold: true, color: GOLD, fontFace: 'Yu Mincho Demibold',
    align: 'center', valign: 'middle', lineSpacing: 17
  });

  // 縦書きの柱（右）
  vText(slide, '一本に、宿る誇り', 6.95, 0.95, { fontSize: 58, fontFace: 'Yu Mincho Demibold', color: CREAM });
  vText(slide, '旭川高専文化祭限定', 6.22, 1.25, { fontSize: 20, fontFace: 'Yu Mincho Demibold', color: GOLD });

  // 金枠の額装（ノーマル1枚をヒーローに・余白を活かす＝高級の定石）
  {
    const pw = 5.0, ph = pw / 1.5;
    const fx = 0.75, fy = 3.0, pad = 0.22;
    slide.addShape(pptx.ShapeType.rect, {
      x: fx, y: fy, w: pw + pad * 2, h: ph + pad * 2,
      fill: { color: NAVY }, line: { color: GOLD, width: 2.5 },
      shadow: { type: 'outer', color: '000000', blur: 18, offset: 6, angle: 90 }
    });
    if (plainHotdog) slide.addImage({ path: plainHotdog, x: fx + pad, y: fy + pad, w: pw, h: ph });
  }

  // 行書のサイン（店名）※はみ出しカットの下端(約7.5)より下げて重なりを防ぐ
  slide.addText('おいしいホットドック屋さん', {
    x: 0.75, y: 7.25, w: 5.4, h: 0.75, wrap: false,
    fontSize: 30, color: GOLD, fontFace: 'HGGyoshotai'
  });
  // 静かな説明
  slide.addText('外は静かに割れ、中から肉汁。\nチーズは、惜しみなく一個分。', {
    x: 0.75, y: 8.2, w: 5.2, h: 0.95,
    fontSize: 16, color: CREAM, fontFace: 'Yu Mincho', lineSpacing: 26
  });
  // 価格（漢数字・控えめに品良く）
  slide.addText('ホットドッグ　二〇〇円', {
    x: 0.75, y: 9.45, w: 4.4, h: 0.48, wrap: false,
    fontSize: 20, color: CREAM, fontFace: 'Yu Mincho Demibold', charSpacing: 2
  });
  slide.addText('チーズホットドッグ　三〇〇円', {
    x: 0.75, y: 9.95, w: 4.9, h: 0.48, wrap: false,
    fontSize: 20, color: GOLD, fontFace: 'Yu Mincho Demibold', charSpacing: 2
  });

  // 下部情報（金罫＋一行）
  slide.addShape(pptx.ShapeType.line, { x: 0.75, y: 10.68, w: 6.77, h: 0, line: { color: GOLD, width: 1 } });
  slide.addText('十月十六日（土）｜四年S科教室｜現金のみ・トッピング無料', {
    x: 0.75, y: 10.8, w: 6.77, h: 0.5, wrap: false,
    fontSize: 15, color: CREAM, fontFace: 'Yu Mincho', align: 'center', charSpacing: 2
  });
}

// ══════════════════════════════════════════════════════════════
// v7  ナチュラルカフェ ── オフホワイトに「円形の台紙＋非破壊の写真」を
//     有機的に散らす。写真はクロップせず全体を見せる（transparent PNGを
//     円形台紙の上に載せてはみ出させる＝ステッカー感）。
//     マスタードの差し色・ドゥードルで「ちょい地味」を解消。
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const PAPER = 'FFF9F0', KRAFT = 'C9A876', BROWN = '6B4A2B', SOFT = 'F0E4D0', MUST = 'F5B916';

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: PAPER }, line: { type: 'none' } });
  // やわらかい色斑（背景の呼吸）
  slide.addShape(pptx.ShapeType.ellipse, { x: -1.4, y: -1.6, w: 5.2, h: 5.2, fill: { color: SOFT, transparency: 45 }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 5.4, y: 8.6, w: 4.6, h: 4.6, fill: { color: SOFT, transparency: 45 }, line: { type: 'none' } });

  // ─ 円形台紙①＋かじりつき写真（主役・クロップせず全体を載せる）─
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 0.5, y: 1.15, w: 3.95, h: 3.95, fill: { color: 'FFFFFF' }, line: { color: KRAFT, width: 2.5 },
    shadow: { type: 'outer', color: 'C4B49A', blur: 14, offset: 4, angle: 90 }
  });
  const eatP = personByNum('1000019035');
  if (eatP) {
    // 円形台紙にきっちり収まるようcover+rounding（顔が中央に来る構図なので中央クロップでOK）
    addCover(slide, eatP, 0.5, 1.15, 3.95, 3.95, {
      rounding: true,
      shadow: { type: 'outer', color: 'C4B49A', blur: 10, offset: 3, angle: 90 }
    });
  }
  slide.addText('ぱくっ。', {
    x: 4.65, y: 1.55, w: 2.4, h: 0.65, wrap: false, rotate: -4,
    fontSize: 30, bold: true, color: BROWN, fontFace: 'HGKyokashotai'
  });
  // マスタードの手描き風下線
  slide.addShape(pptx.ShapeType.rect, {
    x: 4.68, y: 2.18, w: 1.55, h: 0.09, rotate: -4, fill: { color: MUST }, line: { type: 'none' }
  });

  // ─ 円形台紙②＋ホットドッグ（左右にはみ出す）─
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 4.85, y: 2.7, w: 2.85, h: 2.85, fill: { color: 'FFFFFF' }, line: { color: KRAFT, width: 2 },
    shadow: { type: 'outer', color: 'C4B49A', blur: 12, offset: 3, angle: 90 }
  });
  if (plainHotdog) {
    addCover(slide, plainHotdog, 4.85, 2.7, 2.85, 2.85, {
      rounding: true,
      shadow: { type: 'outer', color: 'C4B49A', blur: 8, offset: 3, angle: 90 }
    });
  }
  slide.addText('じゅわ〜', {
    x: 5.15, y: 5.65, w: 2.4, h: 0.6, wrap: false, rotate: 3,
    fontSize: 26, bold: true, color: BROWN, fontFace: 'HGKyokashotai'
  });
  // ¥200〜 マスタードバッジ
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 6.82, y: 2.15, w: 1.05, h: 1.05, rotate: 8, fill: { color: MUST }, line: { type: 'none' },
    shadow: { type: 'outer', color: 'C4B49A', blur: 8, offset: 2, angle: 90 }
  });
  slide.addText('¥200\nから', {
    x: 6.82, y: 2.15, w: 1.05, h: 1.05, rotate: 8,
    fontSize: 14, bold: true, color: 'FFFFFF', fontFace: 'HGKyokashotai',
    align: 'center', valign: 'middle', lineSpacing: 15
  });

  // ─ 円形台紙③＋店主（バストアップ・非破壊）─
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 0.95, y: 5.55, w: 2.7, h: 2.7, fill: { color: 'FFFFFF' }, line: { color: KRAFT, width: 2 },
    shadow: { type: 'outer', color: 'C4B49A', blur: 12, offset: 3, angle: 90 }
  });
  const tenshuP = personByNum('1000019038');
  if (tenshuP) {
    // 円形台紙にきっちり収まるようcover+rounding（バスト写真は顔が上寄りなのでvalign不要・中央クロップで収まる）
    addCover(slide, tenshuP, 0.95, 5.55, 2.7, 2.7, {
      rounding: true,
      shadow: { type: 'outer', color: 'C4B49A', blur: 8, offset: 3, angle: 90 }
    });
  }
  slide.addText('店主です。', {
    x: 0.75, y: 8.35, w: 3.1, h: 0.55, wrap: false, rotate: -3,
    fontSize: 22, bold: true, color: BROWN, fontFace: 'HGKyokashotai', align: 'center'
  });

  // ドゥードル（○と＋を散らして紙面に呼吸を）
  slide.addShape(pptx.ShapeType.ellipse, { x: 4.25, y: 0.7, w: 0.3, h: 0.3, fill: { type: 'none' }, line: { color: MUST, width: 2 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 7.6, y: 6.3, w: 0.24, h: 0.24, fill: { type: 'none' }, line: { color: KRAFT, width: 2 } });
  slide.addText('＋', { x: 0.35, y: 4.95, w: 0.4, h: 0.4, wrap: false, fontSize: 20, bold: true, color: MUST, fontFace: 'HGKyokashotai' });
  slide.addText('＋', { x: 7.85, y: 4.6, w: 0.4, h: 0.4, wrap: false, fontSize: 16, bold: true, color: KRAFT, fontFace: 'HGKyokashotai' });

  // タイトル（丸ゴシック・中央右・「。」が折り返さないようwrap:false＋幅余裕）
  slide.addText('きょうは、\nホットドッグの日。', {
    x: 3.85, y: 6.55, w: 4.45, h: 1.75, wrap: false,
    fontSize: 29, bold: true, color: BROWN, fontFace: 'HGMaruGothicMPRO', lineSpacing: 43
  });
  // タイトルへのマスタード下線
  slide.addShape(pptx.ShapeType.rect, {
    x: 3.95, y: 8.32, w: 3.3, h: 0.12, rotate: -1, fill: { color: MUST }, line: { type: 'none' }
  });
  slide.addText('ケチャップも、マスタードも、\nマヨネーズも。ぜんぶ無料です。', {
    x: 3.95, y: 8.62, w: 3.9, h: 0.95,
    fontSize: 15, color: BROWN, fontFace: 'HGKyokashotai', lineSpacing: 24
  });

  // クラフト紙カード（情報・少し傾ける）
  slide.addShape(pptx.ShapeType.rect, {
    x: 4.35, y: 9.75, w: 3.35, h: 1.75, rotate: 2,
    fill: { color: KRAFT }, line: { type: 'none' },
    shadow: { type: 'outer', color: 'A08A68', blur: 10, offset: 4, angle: 90 }
  });
  slide.addText('10月16日（土）4年S科教室\nノーマル ¥200／チーズ ¥300\n現金のみ・売り切れごめん', {
    x: 4.35, y: 9.75, w: 3.35, h: 1.75, rotate: 2,
    fontSize: 14, bold: true, color: '3F2E1B', fontFace: 'UD Digi Kyokasho N',
    align: 'center', valign: 'middle', lineSpacing: 24
  });

  // 店名（さりげなく左下）
  slide.addText('おいしいホットドック屋さん', {
    x: 0.55, y: 10.85, w: 3.6, h: 0.45, wrap: false,
    fontSize: 14, color: BROWN, fontFace: 'HGMaruGothicMPRO'
  });
}

// ══════════════════════════════════════════════════════════════
// v8  Y2Kビビッド ── 斜めの色面が画面を割り、極太タイポが横断。
//     写真はステッカー化して貼る。情報は白カードで可読性を担保。
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const MUSTARD = 'FFD400', PINK = 'FF4FA0', LIME = 'CCFF00', INK = '111111';

  // 斜め色面分割
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: MUSTARD }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.rect, {
    x: -2.5, y: 6.4, w: 14, h: 9, rotate: -16, fill: { color: PINK }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: -2.5, y: 5.62, w: 14, h: 0.35, rotate: -16, fill: { color: LIME }, line: { type: 'none' }
  });
  // チェッカー帯（Y2Kの記号・下部に水平で一筋）
  for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) {
      slide.addShape(pptx.ShapeType.rect, {
        x: i * (W / 20), y: 9.58, w: W / 20, h: 0.2,
        fill: { color: INK }, line: { type: 'none' }
      });
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: i * (W / 20), y: 9.58, w: W / 20, h: 0.2,
        fill: { color: 'FFFFFF' }, line: { type: 'none' }
      });
    }
  }
  // ピクセルドット・クラスタ（右上）
  [[7.5,2.7],[7.75,2.7],[7.5,2.95],[7.75,2.95],[8.0,2.95],[7.75,3.2]].forEach(([px,py]) => {
    slide.addShape(pptx.ShapeType.rect, { x: px, y: py, w: 0.2, h: 0.2, fill: { color: INK }, line: { type: 'none' } });
  });
  // リング（ドーナツ・右サイドのアクセント）
  slide.addShape(pptx.ShapeType.donut, {
    x: 7.62, y: 4.05, w: 0.8, h: 0.8, rotate: 0, fill: { color: 'FFFFFF' }, line: { color: INK, width: 2 }
  });
  // スパークル（Y2Kの星屑・star4シェイプ。テキスト✦はフォント非対応で棒に化けるため禁止）
  [[3.95, 4.3, 0.55, 'FFFFFF'], [2.85, 8.95, 0.42, 'FFFFFF'], [7.55, 5.6, 0.5, '111111'], [0.5, 0.6, 0.45, '111111']].forEach(([sx, sy, ssz, sc]) => {
    slide.addShape(pptx.ShapeType.star4, {
      x: sx, y: sy, w: ssz, h: ssz, rotate: 15,
      fill: { color: sc }, line: { type: 'none' }
    });
  });

  // 極太タイポ（2層重ねでステッカー縁）
  const bigType = (txt, x, y, size, fillCol) => {
    slide.addText(txt, {
      x: x + 0.05, y: y + 0.05, w: 8.5, h: size / 72 * 1.4, wrap: false, rotate: -8,
      fontSize: size, bold: true, color: INK, fontFace: 'Impact'
    });
    slide.addText(txt, {
      x, y, w: 8.5, h: size / 72 * 1.4, wrap: false, rotate: -8,
      fontSize: size, bold: true, color: fillCol, fontFace: 'Impact'
    });
  };
  bigType('HOT', -0.25, 0.75, 135, 'FFFFFF');
  bigType('DOG!!', 1.3, 2.75, 135, LIME);

  // 日本語サブ（ポップ体ステッカー）※右の写真ステッカーに食い込まない幅に
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.3, y: 5.5, w: 3.85, h: 0.8, rotate: -8,
    fill: { color: 'FFFFFF' }, line: { color: INK, width: 2.5 },
    shadow: { type: 'outer', color: '000000', blur: 0, offset: 4, angle: 45 }
  });
  slide.addText('ホットドッグ、きたる。', {
    x: 0.3, y: 5.5, w: 3.85, h: 0.8, rotate: -8, wrap: false,
    fontSize: 21, bold: true, color: INK, fontFace: 'HGSoeiKakupoptai',
    align: 'center', valign: 'middle'
  });

  // 写真ステッカー①（食べてる瞬間・白縁）
  {
    const pw = 3.5, ph = pw / 0.96;
    slide.addShape(pptx.ShapeType.rect, {
      x: 4.15, y: 4.65, w: pw + 0.3, h: ph + 0.3, rotate: -7,
      fill: { color: 'FFFFFF' }, line: { type: 'none' },
      shadow: { type: 'outer', color: '000000', blur: 12, offset: 5, angle: 60 }
    });
    const stickerP = personByNum('1000019035');
    if (stickerP) slide.addImage({ path: stickerP, x: 4.3, y: 4.8, w: pw, h: ph, rotate: -7 });
  }
  // 写真ステッカー②（チーズホットドッグ）
  {
    const pw = 3.0, ph = pw / 1.5;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45, y: 6.75, w: pw + 0.26, h: ph + 0.26, rotate: 9,
      fill: { color: 'FFFFFF' }, line: { type: 'none' },
      shadow: { type: 'outer', color: '000000', blur: 12, offset: 5, angle: 60 }
    });
    if (cheeseHotdog) slide.addImage({ path: cheeseHotdog, x: 0.58, y: 6.88, w: pw, h: ph, rotate: 9 });
  }

  // バッジ（星・価格）
  slide.addShape(pptx.ShapeType.star8, {
    x: 6.35, y: 0.55, w: 1.75, h: 1.75, rotate: 12,
    fill: { color: LIME }, line: { color: INK, width: 2.5 }
  });
  slide.addText('¥200\nから', {
    x: 6.35, y: 0.55, w: 1.75, h: 1.75, rotate: 12,
    fontSize: 17, bold: true, color: INK, fontFace: 'HGSoeiKakupoptai',
    align: 'center', valign: 'middle', lineSpacing: 19
  });
  slide.addShape(pptx.ShapeType.star8, {
    x: 0.35, y: 4.05, w: 1.5, h: 1.5, rotate: -10,
    fill: { color: PINK }, line: { color: INK, width: 2.5 }
  });
  slide.addText('10.16\nSAT', {
    x: 0.35, y: 4.05, w: 1.5, h: 1.5, rotate: -10,
    fontSize: 15, bold: true, color: 'FFFFFF', fontFace: 'Impact',
    align: 'center', valign: 'middle', lineSpacing: 17
  });

  // しずるオノマトペ（飛ばす）
  slide.addText('パリッ★', {
    x: 5.55, y: 3.55, w: 2.6, h: 0.6, wrap: false, rotate: 8,
    fontSize: 26, bold: true, color: INK, fontFace: 'HGSoeiKakupoptai'
  });
  slide.addText('とろ〜り♪', {
    x: 3.4, y: 8.9, w: 2.9, h: 0.6, wrap: false, rotate: -6,
    fontSize: 26, bold: true, color: 'FFFFFF', fontFace: 'HGSoeiKakupoptai'
  });

  // 情報カード（白・黒文字で可読性）
  slide.addShape(pptx.ShapeType.rect, {
    x: 1.0, y: 10.0, w: 6.27, h: 1.35, rotate: -2,
    fill: { color: 'FFFFFF' }, line: { color: INK, width: 2.5 },
    shadow: { type: 'outer', color: '000000', blur: 0, offset: 5, angle: 45 }
  });
  slide.addText('10月16日(土) 4年S科教室｜ノーマル¥200・チーズ¥300\nトッピング全部無料！ 現金のみ｜おいしいホットドック屋さん', {
    x: 1.0, y: 10.0, w: 6.27, h: 1.35, rotate: -2,
    fontSize: 15, bold: true, color: INK, fontFace: 'HGSoeiKakupoptai',
    align: 'center', valign: 'middle', lineSpacing: 24
  });
}

// ══════════════════════════════════════════════════════════════
// v9  和モダン ── 深藍×生成り×金。特大「旨」一文字が画面の核。
//     縦書き二列と徹底した間。写真は下部に端正な帯で沈める。
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const AI = '13293D', KINARI = 'FFF1CF', KIN = 'C9A227', SHU = 'C1272D';

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: AI }, line: { type: 'none' } });

  // 市松（上端に一筋だけ）
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      slide.addShape(pptx.ShapeType.rect, {
        x: i * (W / 12), y: 0, w: W / 12, h: 0.32,
        fill: { color: KIN, transparency: 30 }, line: { type: 'none' }
      });
    }
  }

  // 特大の一文字「旨」（墨のように・淡く）
  slide.addText('旨', {
    x: -0.25, y: 1.1, w: 6.4, h: 6.4, wrap: false,
    fontSize: 380, bold: true, color: KINARI, fontFace: 'HGMinchoE',
    align: 'center', valign: 'middle', transparency: 12
  });
  // 朱印（本気）
  slide.addShape(pptx.ShapeType.rect, {
    x: 4.75, y: 5.9, w: 1.05, h: 1.05, rotate: -6,
    fill: { color: SHU }, line: { type: 'none' }
  });
  slide.addText('本気', {
    x: 4.75, y: 5.9, w: 1.05, h: 1.05, rotate: -6, wrap: false,
    fontSize: 26, bold: true, color: KINARI, fontFace: 'HGSeikaishotaiPRO',
    align: 'center', valign: 'middle'
  });

  // 縦書き二列（右・段違い）
  vText(slide, '外はぱりり', 7.15, 0.95, { fontSize: 44, fontFace: 'Yu Mincho Demibold', color: KINARI });
  vText(slide, '中はじゅわり', 6.3, 2.05, { fontSize: 44, fontFace: 'Yu Mincho Demibold', color: KINARI });
  // 落款「保成」（縦copy列の下・本人の名を刻む）
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.42, y: 6.42, w: 0.62, h: 0.98, rotate: 3, fill: { color: SHU }, line: { type: 'none' }
  });
  slide.addText('保\n成', {
    x: 6.42, y: 6.42, w: 0.62, h: 0.98, rotate: 3,
    fontSize: 21, bold: true, color: KINARI, fontFace: 'HGSeikaishotaiPRO',
    align: 'center', valign: 'middle', lineSpacing: 23
  });
  // 金箔フレーク（旨の周囲に少量・上品に）
  [[0.55,1.35,0.22,-15,35],[5.75,1.7,0.16,20,45],[1.0,6.85,0.19,40,30],[5.95,4.75,0.13,-30,50]].forEach(([fx,fy,fsz,frot,ftr]) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: fx, y: fy, w: fsz, h: fsz, rotate: frot,
      fill: { color: KIN, transparency: ftr }, line: { type: 'none' }
    });
  });

  // 店名（行書・左下の柱）※生成り帯に飲まれない高さから開始
  vText(slide, 'おいしいホットドック屋さん', 0.42, 6.55, { fontSize: 17, fontFace: 'HGGyoshotai', color: KIN });

  // 写真帯（端正に整列・金罫）
  slide.addShape(pptx.ShapeType.line, { x: 0.7, y: 7.62, w: 6.87, h: 0, line: { color: KIN, width: 1 } });
  if (plainHotdog) slide.addImage({ path: plainHotdog, x: 1.15, y: 7.8, w: 2.85, h: 1.9 });
  if (cheeseHotdog) slide.addImage({ path: cheeseHotdog, x: 4.35, y: 7.8, w: 2.85, h: 1.9 });
  // 半透明の地色を写真の裾に被せて沈める（テキストは載せない）
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.7, y: 9.05, w: 6.87, h: 0.65, fill: { color: AI, transparency: 45 }, line: { type: 'none' }
  });
  // 品名・価格は写真の下の藍地に（読みやすさ優先）
  slide.addText('ほっとどっぐ　二〇〇円', {
    x: 1.15, y: 9.78, w: 2.85, h: 0.42, wrap: false,
    fontSize: 15, color: KINARI, fontFace: 'Yu Mincho Demibold', align: 'center'
  });
  slide.addText('ちーずほっとどっぐ　三〇〇円', {
    x: 4.35, y: 9.78, w: 2.85, h: 0.42, wrap: false,
    fontSize: 15, color: KINARI, fontFace: 'Yu Mincho Demibold', align: 'center'
  });

  // 生成りの帯（下部・情報）
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 10.3, w: W, h: H - 10.3, fill: { color: KINARI }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.line, { x: 0, y: 10.3, w: W, h: 0, line: { color: KIN, width: 2 } });
  slide.addText('十月十六日（土曜）　四年S科教室にて', {
    x: 0.4, y: 10.5, w: 7.47, h: 0.55, wrap: false,
    fontSize: 24, bold: true, color: AI, fontFace: 'Yu Mincho Demibold', align: 'center', charSpacing: 4
  });
  slide.addText('薬味三種（ケチャップ・マスタード・マヨネーズ）無料　／　現金のみ', {
    x: 0.4, y: 11.1, w: 7.47, h: 0.4, wrap: false,
    fontSize: 14, color: AI, fontFace: 'Yu Mincho', align: 'center', charSpacing: 1
  });
}

// ══════════════════════════════════════════════════════════════
// v10  ドパガキ（新テーマ・最終案）
//     定義：「ドーパミン中毒のガキ」の略。ショート動画・通知・ガチャ・
//     推し活など即時報酬の刺激に慣れきり、我慢や集中が続かない若年層を
//     指す自虐的ネットスラング（2025〜2026年に急拡散）。
//     ポスターへの応用例は前例がないため、スマホのショート動画フィードの
//     UIそのものをパロディ化。人物写真6枚全部を「おすすめ動画」の
//     サムネイルとして使い倒し、グリッチ二重露光タイトル・通知バッジ・
//     エンゲージメント数字で「見た人も思わずスクロールが止まる」派手さを狙う。
// ══════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  const INK = '0B0B0F', CYAN = '25F4EE', PINK = 'FE2C55', WHITE = 'FFFFFF', GRAY = '8A8A93';

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: INK }, line: { type: 'none' } });

  // ─ 疑似ステータスバー（スマホ画面のフリ） ─────────────────
  slide.addText('23:47', {
    x: 0.35, y: 0.1, w: 1.2, h: 0.3, wrap: false,
    fontSize: 13, bold: true, color: WHITE, fontFace: 'Yu Gothic', align: 'left'
  });
  [0.15, 0.22, 0.29, 0.36].forEach((h, i) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: 7.05 + i * 0.16, y: 0.38 - h, w: 0.11, h, fill: { color: WHITE }, line: { type: 'none' }
    });
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 7.75, y: 0.14, w: 0.42, h: 0.2, fill: { type: 'none' }, line: { color: WHITE, width: 1.2 }, rectRadius: 0.04
  });
  slide.addShape(pptx.ShapeType.rect, { x: 7.79, y: 0.17, w: 0.3, h: 0.14, fill: { color: WHITE }, line: { type: 'none' } });

  // ─ タブ（おすすめ／フォロー中） ─────────────────────────
  slide.addText('おすすめ', {
    x: 2.2, y: 0.42, w: 2.0, h: 0.4, wrap: false,
    fontSize: 17, bold: true, color: WHITE, fontFace: 'Yu Gothic', align: 'center'
  });
  slide.addShape(pptx.ShapeType.rect, { x: 2.55, y: 0.82, w: 1.3, h: 0.045, fill: { color: WHITE }, line: { type: 'none' } });
  slide.addText('フォロー中', {
    x: 4.4, y: 0.42, w: 2.0, h: 0.4, wrap: false,
    fontSize: 17, bold: true, color: GRAY, fontFace: 'Yu Gothic', align: 'center'
  });

  // ─ グリッチ二重露光タイトル（黒本体＋シアン/ピンクの色ズレ） ──
  const glitchTitle = (txt, x, y, w, h, size) => {
    slide.addText(txt, { x: x - 0.045, y: y - 0.03, w, h, wrap: false, fontSize: size, bold: true, color: CYAN, fontFace: 'HGSoeiKakugothicUB', align: 'center' });
    slide.addText(txt, { x: x + 0.045, y: y + 0.03, w, h, wrap: false, fontSize: size, bold: true, color: PINK, fontFace: 'HGSoeiKakugothicUB', align: 'center' });
    slide.addText(txt, { x, y, w, h, wrap: false, fontSize: size, bold: true, color: WHITE, fontFace: 'HGSoeiKakugothicUB', align: 'center' });
  };
  glitchTitle('沼、見つかる。', 0.2, 1.0, 7.87, 0.85, 36);

  // ─ ヒーロー動画カード（かめはめ波＝一番"バズって見える"写真） ──
  const heroX = 0.5, heroY = 2.0, heroW = 7.27, heroH = 5.55;
  slide.addShape(pptx.ShapeType.rect, { x: heroX, y: heroY, w: heroW, h: heroH, fill: { color: '1A1A22' }, line: { color: GRAY, width: 0.75 } });
  const heroP = personByNum('1000019040');
  if (heroP) {
    addCover(slide, heroP, heroX, heroY, heroW, heroH);
  }
  // 手の間にホットドッグを合成（持ちポーズ×商品オーバーレイ）。演出は消してホットドッグ自体をフレームからはみ出すほど巨大に
  const dogGX = 0.05, dogGY = heroY + 1.55, dogGW = 4.05, dogGH = 2.55;
  if (plainHotdog) {
    addContain(slide, plainHotdog, dogGX, dogGY, dogGW, dogGH, {
      rotate: -6,
      shadow: { type: 'outer', color: '000000', blur: 14, offset: 3, angle: 90 }
    });
  }
  // 再生プレイボタン（半透明の白い三角）
  slide.addShape(pptx.ShapeType.triangle, {
    x: heroX + heroW / 2 - 0.5, y: heroY + heroH / 2 - 0.5, w: 1.0, h: 1.0, rotate: 90,
    fill: { color: 'FFFFFF', transparency: 55 }, line: { type: 'none' }
  });
  // LIVE/RECバッジ
  slide.addShape(pptx.ShapeType.roundRect, {
    x: heroX + 0.2, y: heroY + 0.2, w: 1.0, h: 0.4, fill: { color: PINK }, line: { type: 'none' }, rectRadius: 0.06
  });
  slide.addText('● LIVE', {
    x: heroX + 0.2, y: heroY + 0.2, w: 1.0, h: 0.4, wrap: false,
    fontSize: 14, bold: true, color: WHITE, fontFace: 'Yu Gothic', align: 'center', valign: 'middle'
  });
  // 視聴数バッジ
  slide.addText('12.4万回視聴', {
    x: heroX + heroW - 2.1, y: heroY + 0.25, w: 1.9, h: 0.35, wrap: false,
    fontSize: 13, bold: true, color: WHITE, fontFace: 'Yu Gothic', align: 'right',
    shadow: { type: 'outer', color: '000000', blur: 4, offset: 1, angle: 45 }
  });
  // 右サイドのエンゲージメント（いいね・コメント・シェア／背後の黒丸バッジは廃止。視認性はドロップシャドウで確保）
  const badgeX = heroX + heroW - 0.85;
  const badgeNum = (y, num) => slide.addText(num, {
    x: badgeX - 0.2, y: y + 0.48, w: 1.02, h: 0.24, wrap: false,
    fontSize: 10, bold: true, color: WHITE, fontFace: 'Yu Gothic', align: 'center',
    shadow: { type: 'outer', color: '000000', blur: 4, offset: 1, angle: 45 }
  });
  // プロフィールアイコン＋フォローバッジ（実際のTikTok系UIでもエンゲージメント列の最上部に来る要素）
  // 5個（アバター・いいね・コメント・ブクマ・シェア）並べるため視聴数バッジ直下から開始
  const avatarY = heroY + 0.75, avatarSize = 0.62;
  const avatarP = personByNum('1000019038');
  slide.addShape(pptx.ShapeType.ellipse, { x: badgeX, y: avatarY, w: avatarSize, h: avatarSize, fill: { color: 'FFFFFF' }, line: { color: WHITE, width: 2 } });
  if (avatarP) addCover(slide, avatarP, badgeX, avatarY, avatarSize, avatarSize, { rounding: true });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: badgeX + avatarSize / 2 - 0.13, y: avatarY + avatarSize - 0.13, w: 0.26, h: 0.26,
    fill: { color: PINK }, line: { color: '1A1A22', width: 1.5 }
  });
  slide.addShape(pptx.ShapeType.rect, { x: badgeX + avatarSize / 2 - 0.08, y: avatarY + avatarSize - 0.005, w: 0.16, h: 0.03, fill: { color: WHITE }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.rect, { x: badgeX + avatarSize / 2 - 0.015, y: avatarY + avatarSize - 0.075, w: 0.03, h: 0.16, fill: { color: WHITE }, line: { type: 'none' } });

  // 注意：shadowオブジェクトはpptxgenjsが呼び出しごとに破壊的変換(pt→EMU)を行うため、
  // 同一オブジェクトを複数shapeで使い回すと2回目以降が二重変換され値が指数的に爆発し
  // 「ファイル破損」の原因になる（実際に踏んだ）。必ず呼び出しごとに新しいリテラルを渡す。
  const mkIconShadow = () => ({ type: 'outer', color: '000000', blur: 5, offset: 1, angle: 45 });
  // いいね（PowerPointプリセットのハート図形をそのまま使用）
  const heartY = avatarY + 0.78;
  slide.addShape(pptx.ShapeType.heart, {
    x: badgeX + 0.09, y: heartY + 0.06, w: 0.44, h: 0.4,
    fill: { color: PINK }, line: { type: 'none' }, shadow: mkIconShadow()
  });
  badgeNum(heartY, '8.9万');
  // コメント（PowerPointプリセットの丸吹き出しを使用＋横3点「…」で入力中感を出す）
  const commentY = heartY + 0.78;
  slide.addShape(pptx.ShapeType.wedgeEllipseCallout, {
    x: badgeX + 0.08, y: commentY + 0.02, w: 0.46, h: 0.38,
    fill: { color: WHITE }, line: { type: 'none' }, shadow: mkIconShadow()
  });
  [0, 1, 2].forEach(i => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: badgeX + 0.2 + i * 0.09, y: commentY + 0.16, w: 0.05, h: 0.05,
      fill: { color: '1A1A22' }, line: { type: 'none' }
    });
  });
  badgeNum(commentY, '2,341');
  // ブクマ（保存＝リボン形。白い縦長四角の下端を背景色の三角でV字に切り欠く）
  const bookmarkY = commentY + 0.78;
  slide.addShape(pptx.ShapeType.rect, {
    x: badgeX + 0.2, y: bookmarkY + 0.02, w: 0.22, h: 0.32,
    fill: { color: WHITE }, line: { type: 'none' }, shadow: mkIconShadow()
  });
  slide.addShape(pptx.ShapeType.triangle, {
    x: badgeX + 0.2, y: bookmarkY + 0.22, w: 0.22, h: 0.14, rotate: 180,
    fill: { color: '1A1A22' }, line: { type: 'none' }
  });
  badgeNum(bookmarkY, 'ブクマ');
  // シェア（TikTok実機の"曲がった矢印"に合わせ、pptxgenjs標準プリセットのcurvedRightArrowを使用）
  const shareY = bookmarkY + 0.78;
  slide.addShape(pptx.ShapeType.curvedRightArrow, {
    x: badgeX + 0.13, y: shareY + 0.05, w: 0.36, h: 0.32, rotate: -20,
    fill: { color: WHITE }, line: { type: 'none' }, shadow: mkIconShadow()
  });
  badgeNum(shareY, 'シェア');
  // キャプション（アカウント名＋一言）
  slide.addText('@oishii_hotdog', {
    x: heroX + 0.25, y: heroY + heroH - 1.35, w: 4.5, h: 0.35, wrap: false,
    fontSize: 15, bold: true, color: WHITE, fontFace: 'Yu Gothic'
  });
  slide.addText('この一本、3秒で沼る。', {
    x: heroX + 0.25, y: heroY + heroH - 0.95, w: 4.8, h: 0.4, wrap: false,
    fontSize: 16, bold: true, color: WHITE, fontFace: 'Yu Gothic'
  });
  // シークバー
  slide.addShape(pptx.ShapeType.rect, { x: heroX, y: heroY + heroH - 0.06, w: heroW, h: 0.06, fill: { color: 'FFFFFF', transparency: 70 }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.rect, { x: heroX, y: heroY + heroH - 0.06, w: heroW * 0.62, h: 0.06, fill: { color: PINK }, line: { type: 'none' } });
  slide.addShape(pptx.ShapeType.ellipse, { x: heroX + heroW * 0.62 - 0.06, y: heroY + heroH - 0.11, w: 0.16, h: 0.16, fill: { color: PINK }, line: { type: 'none' } });

  // ─ 「次のおすすめ」サムネイルの列（残り5枚の人物写真を使い倒す） ──
  slide.addText('つぎのおすすめ ▶', {
    x: 0.5, y: 7.72, w: 4.0, h: 0.35, wrap: false,
    fontSize: 13, bold: true, color: GRAY, fontFace: 'Yu Gothic'
  });
  const thumbNums = ['1000019031', '1000019035', '1000019036', '1000019038', '1000019062'];
  const thumbY = 8.12, thumbH = 1.95, gap = 0.12;
  const thumbW = (7.27 - gap * 4) / 5;
  thumbNums.forEach((num, i) => {
    const tx = 0.5 + i * (thumbW + gap);
    const tp = personByNum(num);
    slide.addShape(pptx.ShapeType.rect, { x: tx, y: thumbY, w: thumbW, h: thumbH, fill: { color: '1A1A22' }, line: { color: GRAY, width: 0.5 } });
    if (tp) {
      addCover(slide, tp, tx, thumbY, thumbW, thumbH);
    }
    // 小さい再生三角
    slide.addShape(pptx.ShapeType.triangle, {
      x: tx + thumbW / 2 - 0.13, y: thumbY + thumbH / 2 - 0.13, w: 0.26, h: 0.26, rotate: 90,
      fill: { color: 'FFFFFF', transparency: 45 }, line: { type: 'none' }
    });
    // 視聴数（小）
    slide.addText(`${(3 + i * 2.3).toFixed(1)}万`, {
      x: tx + 0.04, y: thumbY + thumbH - 0.32, w: thumbW - 0.08, h: 0.28, wrap: false,
      fontSize: 9, bold: true, color: WHITE, fontFace: 'Yu Gothic', align: 'left',
      shadow: { type: 'outer', color: '000000', blur: 3, offset: 1, angle: 45 }
    });
  });

  // ─ 通知風カード（日時・価格） ────────────────────────────
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 10.35, w: 7.27, h: 1.0, fill: { color: '1E1E26' }, line: { type: 'none' }, rectRadius: 0.14,
    shadow: { type: 'outer', color: '000000', blur: 10, offset: 3, angle: 90 }
  });
  slide.addShape(pptx.ShapeType.ellipse, { x: 0.68, y: 10.53, w: 0.64, h: 0.64, fill: { color: PINK }, line: { type: 'none' } });
  // ミニホットドッグアイコン（絵文字はフォント非対応で黒棒化するリスクがあるため図形で描く）
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.83, y: 10.75, w: 0.34, h: 0.15, rotate: -8, rectRadius: 0.07,
    fill: { color: 'E8C27A' }, line: { type: 'none' }
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.86, y: 10.71, w: 0.28, h: 0.11, rotate: -8, rectRadius: 0.055,
    fill: { color: 'B5451B' }, line: { type: 'none' }
  });
  slide.addText('おいしいホットドック屋さん・たった今', {
    x: 1.55, y: 10.44, w: 6.0, h: 0.32, wrap: false,
    fontSize: 12, bold: true, color: GRAY, fontFace: 'Yu Gothic'
  });
  slide.addText('¥200のドーパミン、キテる。', {
    x: 1.55, y: 10.72, w: 6.05, h: 0.4, wrap: false,
    fontSize: 18, bold: true, color: WHITE, fontFace: 'Yu Gothic'
  });
  slide.addText('10/16(土) 4年S科教室 ／ 現金のみ ／ トッピング全部無料', {
    x: 0.5, y: 11.42, w: 7.27, h: 0.24, wrap: false,
    fontSize: 11, bold: true, color: GRAY, fontFace: 'Yu Gothic', align: 'center'
  });
}

pptx.writeFile({ fileName: 'flyers/hotdog-nine.pptx' })
  .then(() => console.log('✅ flyers/hotdog-nine.pptx を生成しました'))
  .catch(err => { console.error('❌ エラー:', err); process.exit(1); });
