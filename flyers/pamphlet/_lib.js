// パンフ用カット共通ヘルパー（generate-nine.js の実績ヘルパーを移植）
// 使い方: const L = require('./_lib'); const { pptx, slide, W, H } = L.newCut();
// 実行はプロジェクトルートから: node flyers/pamphlet/generate-cut-a.js
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const { safeWriteFile } = require('../../pptx-safe-write');

const W = 6, H = 6; // 1:1 正方形（インチ）

function newCut() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'SQ6', width: W, height: H });
  pptx.layout = 'SQ6';
  const slide = pptx.addSlide();
  return { pptx, slide, W, H };
}

function getPngSize(filePath) {
  const buf = Buffer.alloc(24);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// 透過PNGを比率を保ってボックス内に収める。戻り値は実際の配置矩形
function addContain(slide, imgPath, boxX, boxY, boxW, boxH, opts = {}) {
  const { hAlign = 'center', vAlign = 'center', ...rest } = opts;
  const d = getPngSize(imgPath);
  const s = Math.min(boxW / d.width, boxH / d.height);
  const w = d.width * s, h = d.height * s;
  const x = hAlign === 'left' ? boxX : hAlign === 'right' ? boxX + boxW - w : boxX + (boxW - w) / 2;
  const y = vAlign === 'top' ? boxY : vAlign === 'bottom' ? boxY + boxH - h : boxY + (boxH - h) / 2;
  slide.addImage({ path: imgPath, x, y, w, h, ...rest });
  return { x, y, w, h };
}

// 比率を保って指定の高さ（または幅）で置く。はみ出し・断ち落とし用
function addByHeight(slide, imgPath, x, y, h, opts = {}) {
  const d = getPngSize(imgPath);
  const w = h * d.width / d.height;
  slide.addImage({ path: imgPath, x, y, w, h, ...opts });
  return { x, y, w, h };
}
function addByWidth(slide, imgPath, x, y, w, opts = {}) {
  const d = getPngSize(imgPath);
  const h = w * d.height / d.width;
  slide.addImage({ path: imgPath, x, y, w, h, ...opts });
  return { x, y, w, h };
}

// pptxgenjs の cover は実寸を読まず引き伸ばすバグがあるため、実寸を渡してから box 指定する
function addCover(slide, imgPath, x, y, w, h, opts = {}) {
  const d = getPngSize(imgPath);
  slide.addImage({ path: imgPath, x, y, w: d.width / 300, h: d.height / 300, sizing: { type: 'cover', w, h }, ...opts });
}

// 人物写真はファイル番号で解決する（インデックス参照禁止）
const PEOPLE_DIR = 'images/people/cropped';
function person(num) {
  const f = fs.readdirSync(PEOPLE_DIR).find(n => n.includes(num));
  if (!f) throw new Error(`person ${num} not found in ${PEOPLE_DIR}`);
  return path.join(PEOPLE_DIR, f).split(path.sep).join('/');
}
const HOTDOG = 'images/hotdog/ホットドッグ.png';
const CHEESE_HOTDOG = 'images/hotdog/チーズホットドッグ.png';

// クッキリしたフチ文字（8方向オフセット複製）。ぼかし影とは併用しない
function outlinedText(slide, text, o, stroke = { color: 'FFFFFF', width: 0.04 }) {
  const { x, y, ...rest } = o;
  const d = stroke.width;
  for (const [dx, dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
    slide.addText(text, { x: x + dx * d, y: y + dy * d, ...rest, color: stroke.color });
  }
  slide.addText(text, { x, y, ...rest });
}

// 縦書き：eaVert は促音で蛇行するので1文字ずつ積む
function vText(slide, text, x, topY, opts = {}) {
  const { fontSize = 60, color = '1A1A1A', fontFace = 'HGMinchoE', bold = false, charH = null, smallRatio = 0.75 } = opts;
  const SMALL = 'っゃゅょぁぃぅぇぉッャュョ', ROT = 'ー〜―…', PUNCT = '、。';
  let y = topY;
  for (const ch of text) {
    const isSmall = SMALL.includes(ch), isPunct = PUNCT.includes(ch);
    const baseH = charH != null ? charH : fontSize / 72 * 1.18;
    const h = isPunct ? baseH * 0.5 : (isSmall ? baseH * smallRatio : baseH);
    const o = { x, y, w: fontSize / 72 * 1.5, h, wrap: false, fontSize: isSmall ? Math.round(fontSize * smallRatio) : fontSize,
      color, fontFace, bold, align: isPunct ? 'right' : 'center', valign: isPunct ? 'top' : 'middle' };
    if (ROT.includes(ch)) o.rotate = 90;
    slide.addText(ch, o);
    y += h;
  }
  return y;
}

// 集中線：四辺の等間隔点から焦点へ収束する線（中心から生やさない）
function addFocusLines(pptx, slide, fx, fy, count, color, opts = {}) {
  const { width = 1.5, transparency = 30, stopRatio = 0.55 } = opts;
  const pts = [];
  const per = Math.ceil(count / 4);
  for (let i = 0; i < per; i++) {
    const t = (i + 0.5) / per;
    pts.push([t * W, 0], [W, t * H], [W - t * W, H], [0, H - t * H]);
  }
  for (const [px, py] of pts) {
    const ex = px + (fx - px) * stopRatio, ey = py + (fy - py) * stopRatio;
    slide.addShape(pptx.ShapeType.line, {
      x: Math.min(px, ex), y: Math.min(py, ey), w: Math.abs(ex - px) || 0.001, h: Math.abs(ey - py) || 0.001,
      flipH: (ex < px) !== (ey < py), line: { color, width, transparency }
    });
  }
}

function save(pptx, fileName) {
  return safeWriteFile(pptx, fileName).then(() => console.log('wrote', fileName));
}

module.exports = { W, H, newCut, getPngSize, addContain, addByHeight, addByWidth, addCover, person, HOTDOG, CHEESE_HOTDOG,
  outlinedText, vText, addFocusLines, save };
