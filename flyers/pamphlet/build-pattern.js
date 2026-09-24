// 「保成づくし」背景パターンを1枚のPNGとして合成する（cut-e 用）。
// 参考：キャラクターグッズの総柄（顔がぎっしり並んだ柄）。
//
// リサーチで分かった「自然な敷き詰め」の条件：
//   1. 繰り返しの単位を1つに決め、その大きさをそろえる（あの柄は「顔」が全部同じ大きさ）
//      → 写真の大きさではなく【顔の高さ】をそろえる
//   2. 向きをそろえる（全部同じ向きに立っている。傾きはごくわずか）
//   3. 1枚ずつ白フチを付ける（重なっても輪郭が分離する）
//   4. 密度を均一にする（等間隔に置くのではなく、空いている所から埋める＝ブルーノイズ的）
//      → 未カバー領域の距離変換の最大点に次を置く、を繰り返す
//   5. 端は断ち落とす（画面外にはみ出させて隙間を作らない）
//
// 出力: flyers/pamphlet/_assets/hosei-pattern.png
// 実行: node flyers/pamphlet/build-pattern.js [seed] [顔の高さpx]
const fs = require('fs');
const { PNG } = require('pngjs');

const SRC = 'images/people/cropped';
const OUT = process.env.CHARA === '1' ? 'flyers/pamphlet/_assets/hosei-pattern-chara.png' : 'flyers/pamphlet/_assets/hosei-pattern.png';
const SIZE = 2400;            // 6in × 400dpi
const BG = [191, 227, 245];   // 淡い水色 BFE3F5（隙間から覗く地色）
const HALO = 6;               // 白フチ（px）

// 素材と、その画像内の「顔」の矩形 [x, y, w, h]（cropped 画像内のピクセル）。
// 顔矩形は「顔の高さをそろえる」ためと「配置の基準点（顔の中心）」のために使う。描画は全身。
// tilt は上下の向きをそろえた上での微傾斜。
const ITEMS = [
  { file: '1000019031-removebg-preview (1).png', face: [205, 15, 228, 275], tilt: -5 },
  { file: '1000019035-removebg-preview.png',     face: [250, 55, 163, 215], tilt:  4 },
  { file: '1000019036-removebg-preview.png',     face: [ 85,  8, 100, 110], tilt: -3 },
  { file: '1000019038-removebg-preview.png',     face: [ 50,  0, 160, 150], tilt:  5 },
  { file: '1000019040-removebg-preview (1).png', face: [200, 35, 150, 170], tilt: -4 },
  { file: '1000019062-removebg-preview.png',     face: [ 75,  5, 155, 175], tilt:  3 },
  { file: '1000019756-removebg-preview.png',     face: [ 85,  0, 130, 145], tilt: -6 },
  { file: '1000023102-removebg-preview.png',     face: [ 55,  0, 185, 165], tilt:  6 },
];

function readPng(p) { return PNG.sync.read(fs.readFileSync(p)); }

function crop(img, [x, y, w, h]) {
  const out = { width: w, height: h, data: Buffer.alloc(w * h * 4) };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx = x + i, sy = y + j, di = (j * w + i) * 4;
    if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) { out.data[di + 3] = 0; continue; }
    img.data.copy(out.data, di, (sy * img.width + sx) * 4, (sy * img.width + sx) * 4 + 4);
  }
  return out;
}

// 透明余白を詰める。詰めた量（左上のオフセット）も返す＝顔矩形の座標を追従させるため
function trim(img) {
  let minX = img.width, maxX = -1, minY = img.height, maxY = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (img.data[(y * img.width + x) * 4 + 3] > 24) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { img: crop(img, [minX, minY, maxX - minX + 1, maxY - minY + 1]), dx: minX, dy: minY };
}

// 輪郭に白フチを焼き込む（条件3）
function addHalo(img, r) {
  const w = img.width + r * 2, h = img.height + r * 2;
  const out = { width: w, height: h, data: Buffer.alloc(w * h * 4) };
  const solid = (x, y) => (x >= 0 && y >= 0 && x < img.width && y < img.height) &&
    img.data[(y * img.width + x) * 4 + 3] > 96;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x - r, sy = y - r, di = (y * w + x) * 4;
    if (solid(sx, sy)) {
      img.data.copy(out.data, di, (sy * img.width + sx) * 4, (sy * img.width + sx) * 4 + 4);
      out.data[di + 3] = 255;
      continue;
    }
    let near = false;
    for (let dy = -r; dy <= r && !near; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r && solid(sx + dx, sy + dy)) { near = true; break; }
    }
    if (near) { out.data[di] = 255; out.data[di + 1] = 255; out.data[di + 2] = 255; out.data[di + 3] = 255; }
  }
  return out;
}

// バスト切り出しの直線的な切り口を、角丸で「シールの形」にする。
// そのままだと写真の四角い断片に見えて、柄として不自然になる。
function roundCorners(img, radiusRatio = 0.22) {
  const { width: w, height: h, data } = img;
  const r = Math.round(Math.min(w, h) * radiusRatio);
  const corners = [[r, r], [w - r, r], [r, h - r], [w - r, h - r]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const inX = x > r && x < w - r, inY = y > r && y < h - r;
    if (inX || inY) continue;
    const c = corners[(x < r ? 0 : 1) + (y < r ? 0 : 2)];
    const d = Math.hypot(x - c[0], y - c[1]);
    const di = (y * w + x) * 4;
    if (d > r) data[di + 3] = 0;
    else if (d > r - 2) data[di + 3] = Math.round(data[di + 3] * (r - d) / 2);
  }
  return img;
}

// 回転＋拡縮して合成（逆写像＋バイリニア）。anchor は画像内の基準点（顔の中心）。
// faceOnly を渡すと、その楕円の内側だけを描く（顔だけを上から描き直す用）。
function drawRotated(canvas, img, anchor, cx, cy, scale, angleDeg, cov, covScale, faceOnly, under) {
  const a = angleDeg * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const reach = Math.ceil(Math.hypot(img.width, img.height) * scale) + 2;
  for (let y = Math.max(0, Math.floor(cy - reach)); y < Math.min(canvas.height, cy + reach); y++) {
    for (let x = Math.max(0, Math.floor(cx - reach)); x < Math.min(canvas.width, cx + reach); x++) {
      const dx = x - cx, dy = y - cy;
      const ux = (dx * cos + dy * sin) / scale + anchor.x;
      const uy = (-dx * sin + dy * cos) / scale + anchor.y;
      if (ux < 0 || uy < 0 || ux >= img.width - 1 || uy >= img.height - 1) continue;
      let edgeFade = 1;
      if (faceOnly) {
        const nx = (ux - faceOnly.x) / faceOnly.rx, ny = (uy - faceOnly.y) / faceOnly.ry;
        const n = Math.hypot(nx, ny);
        if (n > 1) continue;
        if (n > 0.8) edgeFade = (1 - n) / 0.2;   // 境目に線が出ないようふちをぼかす
      }
      const x0 = Math.floor(ux), y0 = Math.floor(uy), fx = ux - x0, fy = uy - y0;
      const px = [0, 0, 0, 0];
      for (let ch = 0; ch < 4; ch++) {
        const p00 = img.data[(y0 * img.width + x0) * 4 + ch];
        const p10 = img.data[(y0 * img.width + x0 + 1) * 4 + ch];
        const p01 = img.data[((y0 + 1) * img.width + x0) * 4 + ch];
        const p11 = img.data[((y0 + 1) * img.width + x0 + 1) * 4 + ch];
        px[ch] = p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy;
      }
      const alpha = (px[3] / 255) * edgeFade;
      if (alpha < 0.02) continue;
      // under: すでに写真が乗っている画素には描かない＝下にもぐり込ませる（隙間埋め用）
      if (under && under.mask[y * canvas.width + x]) continue;
      const di = (y * canvas.width + x) * 4;
      for (let ch = 0; ch < 3; ch++) canvas.data[di + ch] = Math.round(px[ch] * alpha + canvas.data[di + ch] * (1 - alpha));
      canvas.data[di + 3] = 255;
      if (alpha > 0.5) {
        cov.data[Math.floor(y / covScale) * cov.w + Math.floor(x / covScale)] = 1;
        if (cov.full) cov.full[y * canvas.width + x] = 1;
      }
    }
  }
}

// 未カバー領域の距離変換（2パス・チャンファー）。最も広く空いている点とその距離を返す
function farthestUncovered(cov) {
  const { w, h, data } = cov;
  const INF = 1e9;
  const d = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = data[i] ? 0 : INF;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1);
    if (y > 0) d[i] = Math.min(d[i], d[i - w] + 1);
    if (x > 0 && y > 0) d[i] = Math.min(d[i], d[i - w - 1] + 1.414);
    if (x < w - 1 && y > 0) d[i] = Math.min(d[i], d[i - w + 1] + 1.414);
  }
  let best = -1, bx = 0, by = 0;
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (x < w - 1) d[i] = Math.min(d[i], d[i + 1] + 1);
    if (y < h - 1) d[i] = Math.min(d[i], d[i + w] + 1);
    if (x < w - 1 && y < h - 1) d[i] = Math.min(d[i], d[i + w + 1] + 1.414);
    if (x > 0 && y < h - 1) d[i] = Math.min(d[i], d[i + w - 1] + 1.414);
    if (d[i] > best) { best = d[i]; bx = x; by = y; }
  }
  return { x: bx, y: by, dist: best };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = Number(process.argv[2] || 7);
const FACE_H = Number(process.argv[3] || 400);   // そろえる顔の高さ（px）＝柄の単位
const rng = mulberry32(seed);

// 写真は一切切らない。1枚まるごとを部品として、上へ上へと重ねる。
// 縦横比もそのまま。ただし倍率は写真ごとに変えて、【顔の高さ】を FACE_H にそろえる。
// CHARA=1 を付けると、写真の代わりに保成のデフォルメキャラ（draw-hosei.js）を部品にする
const CHARA = process.env.CHARA === '1';
const SOURCES = CHARA
  ? require('./draw-hosei').makeVariants().map(v => ({ file: `chara:${v.name}`, face: v.face, tilt: v.tilt, preloaded: v.img }))
  : ITEMS;

console.log(`素材を読み込み中（${CHARA ? 'デフォルメキャラ' : '写真'}・顔の高さを ${FACE_H}px にそろえる）...`);
const items = SOURCES.map(it => {
  const { img: trimmed, dx, dy } = trim(it.preloaded || readPng(`${SRC}/${it.file}`));
  const img = addHalo(trimmed, HALO);
  // 顔矩形を「トリム分」と「フチ分」ずらして、合成後の画像内座標に直す
  const [ox, oy, ow, oh] = it.face;
  const anchor = { x: ox - dx + HALO + ow / 2, y: oy - dy + HALO + oh / 2 };  // 顔の中心＝配置の基準点
  const scale = FACE_H / oh;                    // ← 顔の高さをそろえるための倍率（写真ごとに違う）
  const faceR = Math.max(ow, oh) / 2 * scale;   // 顔の半径（キャンバス上のpx）
  // 顔を前面に出す仕上げ用の楕円（画像内の座標。髪・あごまで入るよう少し広め）
  const faceOnly = { x: anchor.x, y: anchor.y, rx: ow * 0.62, ry: oh * 0.66 };
  console.log(`  ${it.file}: ${img.width}x${img.height} / 顔高 ${oh} -> ×${scale.toFixed(2)} = ${Math.round(img.width * scale)}x${Math.round(img.height * scale)} (${it.tilt}°)`);
  return { img, anchor, scale, tilt: it.tilt, faceR, faceOnly };
});

// キャンバス（地色）
const canvas = { width: SIZE, height: SIZE, data: Buffer.alloc(SIZE * SIZE * 4) };
for (let i = 0; i < SIZE * SIZE; i++) {
  canvas.data[i * 4] = BG[0]; canvas.data[i * 4 + 1] = BG[1]; canvas.data[i * 4 + 2] = BG[2]; canvas.data[i * 4 + 3] = 255;
}

// カバレッジマップ（1/8解像度）
const covScale = 8;
const cov = { w: Math.ceil(SIZE / covScale), h: Math.ceil(SIZE / covScale) };
cov.data = new Uint8Array(cov.w * cov.h);
cov.full = new Uint8Array(SIZE * SIZE);   // 実解像度の被覆マスク（もぐり込ませ描画で使う）

// 配置：最も広く空いている所に次の1枚を置く、を繰り返す（条件4）。基準点は顔の中心。
const placed = [];
const MAX_ITEMS = 60;
const STOP_DIST = (FACE_H * 0.30) / covScale;   // これ以上の空白が無くなったら終了

// 新しく置く写真が、すでに置いた顔を覆ってしまわないか判定する。
// 写真は切らずにそのまま重ねるので、「顔を優先して上に」＝顔を踏む位置には置かない、で守る。
function coversExistingFace(it, cx, cy) {
  const halfW = it.img.width * it.scale / 2, halfH = it.img.height * it.scale / 2;
  // 回転は小さいので、外接矩形を少し縮めた矩形で近似する
  const a = it.tilt * Math.PI / 180, cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a));
  const rx = halfW * cos + halfH * sin, ry = halfW * sin + halfH * cos;
  // 写真内の「顔の中心から見た画像中心」のズレ（＝顔基準で置いたときの矩形の中心）
  const ox = (it.img.width / 2 - it.anchor.x) * it.scale;
  const oy = (it.img.height / 2 - it.anchor.y) * it.scale;
  const mx = cx + ox * Math.cos(a) - oy * Math.sin(a);
  const my = cy + ox * Math.sin(a) + oy * Math.cos(a);
  return placed.some(p => {
    const pit = items[p.idx];
    return Math.abs(p.cx - mx) < rx - pit.faceR * 0.3 && Math.abs(p.cy - my) < ry - pit.faceR * 0.3;
  });
}

// 同じ写真どうしは「斜めに」離す（真横・真上に同じ顔が並ぶと繰り返しが目立つため）。
// 距離が近すぎる、または並びが水平・垂直に近い場合はやり直す。
function badRepeat(idx, cx, cy) {
  return placed.some(p => {
    if (p.idx !== idx) return false;
    const dx = Math.abs(p.cx - cx), dy = Math.abs(p.cy - cy);
    const dist = Math.hypot(dx, dy);
    if (dist < FACE_H * 3.2) return true;                       // 近すぎる
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;             // 0°=真横, 90°=真上
    return ang < 25 || ang > 65;                                // 斜め(25〜65°)以外は不可
  });
}

// 文字（「保成」と左の縦書き店名）が乗る場所。ここに「完全に見せたい顔」を置かない。
// generate-cut-e.js の座標（インチ）に合わせている。1in = SIZE/6 px。
const IN = SIZE / 6;
const TEXT_ZONES = [
  { x0: 1.45 * IN, y0: 0,        x1: 4.55 * IN, y1: 6 * IN },   // 中央の「保成」
  { x0: 0,        y0: 0.2 * IN,  x1: 0.75 * IN, y1: 5.7 * IN }, // 左の縦書き店名
];
const hitsText = (cx, cy, r) => TEXT_ZONES.some(z =>
  cx + r > z.x0 && cx - r < z.x1 && cy + r > z.y0 && cy - r < z.y1);

// パス0：まず各写真を1枚ずつ、顔が画面内に完全に収まり、かつ文字にも重ならない位置に置く。
// これで「顔が端で切れているだけで、どこにも完全な顔が無い写真」が無くなる。
const anchorsSpread = [];
for (let gy = 0; gy < 4; gy++) for (const gx of [0.5, 5.5]) {   // 文字を避けた左右の帯
  anchorsSpread.push({ x: SIZE * gx / 6, y: SIZE * (gy + 0.6) / 4 });
}
for (let i = anchorsSpread.length - 1; i > 0; i--) {   // シャッフル
  const j = Math.floor(rng() * (i + 1));
  [anchorsSpread[i], anchorsSpread[j]] = [anchorsSpread[j], anchorsSpread[i]];
}
items.forEach((it, idx) => {
  const margin = it.faceR * 1.15;   // 顔が切れないための余白
  let best = null;
  for (const a of anchorsSpread) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const cx = Math.min(SIZE - margin, Math.max(margin, a.x + (rng() - 0.5) * FACE_H * 1.2));
      const cy = Math.min(SIZE - margin, Math.max(margin, a.y + (rng() - 0.5) * FACE_H * 1.2));
      if (hitsText(cx, cy, it.faceR)) continue;
      if (placed.some(p => Math.hypot(p.cx - cx, p.cy - cy) < FACE_H * 1.8)) continue;
      if (coversExistingFace(it, cx, cy)) continue;
      best = { cx, cy, idx };
      break;
    }
    if (best) break;
  }
  if (!best) {
    // 顔が大きくて文字を完全には避けられない場合は、
    // 「顔が画面内に収まる」ことを最優先に、文字との重なりが最小の位置を選ぶ。
    const overlapArea = (cx, cy) => {
      const r = it.faceR;
      return TEXT_ZONES.reduce((sum, z) => {
        const w = Math.min(cx + r, z.x1) - Math.max(cx - r, z.x0);
        const h = Math.min(cy + r, z.y1) - Math.max(cy - r, z.y0);
        return sum + (w > 0 && h > 0 ? w * h : 0);
      }, 0);
    };
    let bestScore = Infinity;
    for (let t = 0; t < 600; t++) {
      const cx = margin + rng() * (SIZE - margin * 2), cy = margin + rng() * (SIZE - margin * 2);
      const nearPenalty = placed.some(p => Math.hypot(p.cx - cx, p.cy - cy) < FACE_H * 0.9) ? 1e7 : 0;
      const score = overlapArea(cx, cy) + nearPenalty;
      if (score < bestScore) { bestScore = score; best = { cx, cy, idx }; }
      if (bestScore === 0) break;
    }
  }
  placed.push(best);   // 描画はまだしない（重なり順を後で計算する）
});
console.log(`  顔が完全に写る1枚目を各写真ぶん配置: ${placed.length}枚`);

// パス1：同じ写真の繰り返しは「決まった距離・決まった角度」の格子に置く。
// 基準の1枚（パス0）から、v = (REPEAT_DIST, REPEAT_ANGLE) と、それを90°回した w だけずらして並べる。
// つまり同じ写真どうしの間隔は常に REPEAT_DIST、方向は常に REPEAT_ANGLE か REPEAT_ANGLE+90°。
// 間隔は写真ごとに変える。全写真を同じ間隔にすると、大きい写真だけ自分自身と重なって
// 「真隣に同じ人」に見えてしまうため（実際にそうなった）。
// 各写真の間隔 d_i = k × (その写真の長辺)。k は、全写真の合計被覆率が COVER_TARGET 倍に
// なるように計算する（大きい写真は広く、小さい写真は細かく散る）。
const REPEAT_ANGLE = Number(process.argv[5] || 34);
const COVER_TARGET = 3.0;   // キャンバス面積の何倍ぶん置くか（重なりしろ）
const sumRatio = items.reduce((s, it) => {
  const w = it.img.width * it.scale, h = it.img.height * it.scale;
  return s + (w * h) / Math.pow(Math.max(w, h), 2);
}, 0);
const K = Math.max(1.05, Math.sqrt(sumRatio / COVER_TARGET));   // 1.05未満＝自分自身と接触するので下限
items.forEach(it => {
  const longSide = Math.max(it.img.width * it.scale, it.img.height * it.scale);
  it.repeatDist = K * longSide;
});
const th = REPEAT_ANGLE * Math.PI / 180;
const base = placed.slice();   // パス0で置いた各写真の基準点
let lattice = 0;
const jobs = [];
base.forEach(b => {
  const d = items[b.idx].repeatDist;
  const vx = d * Math.cos(th), vy = d * Math.sin(th);
  const wx = -vy, wy = vx;   // vを90°回転
  const span = Math.ceil(SIZE * 1.8 / d) + 1;
  for (let m = -span; m <= span; m++) for (let n = -span; n <= span; n++) {
    if (m === 0 && n === 0) continue;
    const cx = b.cx + m * vx + n * wx, cy = b.cy + m * vy + n * wy;
    const r = items[b.idx].faceR;
    if (cx < -r * 3 || cy < -r * 3 || cx > SIZE + r * 3 || cy > SIZE + r * 3) continue;
    jobs.push({ cx, cy, idx: b.idx, d: Math.hypot(m, n) });
  }
});
jobs.sort((a, b) => a.d - b.d);   // 基準に近い順
for (const j of jobs) { placed.push(j); lattice++; }
console.log(`  格子状に繰り返した枚数: ${lattice}（角度 ${REPEAT_ANGLE}° / 係数k=${K.toFixed(2)}）`);

// ── 重なり順の決定 ───────────────────────────────────────────
// 写真は加工せず、どれを下に敷くかだけで顔の見える量を最大化する。
// 「自分の体が他人の顔をどれだけ隠すか」を全ペアで計算し、
// たくさん隠す写真ほど先に描く（＝下に敷く）。最後に描いた写真がいちばん手前。
function bodyRect(p) {
  const it = items[p.idx];
  const a = it.tilt * Math.PI / 180, cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a));
  const halfW = it.img.width * it.scale / 2, halfH = it.img.height * it.scale / 2;
  const ox = (it.img.width / 2 - it.anchor.x) * it.scale;
  const oy = (it.img.height / 2 - it.anchor.y) * it.scale;
  return {
    cx: p.cx + ox * Math.cos(a) - oy * Math.sin(a),
    cy: p.cy + ox * Math.sin(a) + oy * Math.cos(a),
    rx: halfW * cos + halfH * sin,
    ry: halfW * sin + halfH * cos,
  };
}
// 体の矩形が、相手の顔（円を正方形で近似）をどれだけ覆うか
function faceHidden(coverer, target) {
  if (coverer === target) return 0;
  const b = bodyRect(coverer), r = items[target.idx].faceR;
  const w = Math.min(b.cx + b.rx, target.cx + r) - Math.max(b.cx - b.rx, target.cx - r);
  const h = Math.min(b.cy + b.ry, target.cy + r) - Math.max(b.cy - b.ry, target.cy - r);
  return w > 0 && h > 0 ? w * h : 0;
}
const remaining = placed.map((p, i) => i);
const drawOrder = [];
while (remaining.length) {
  let worst = 0, worstScore = -1;
  for (let a = 0; a < remaining.length; a++) {
    let s = 0;
    for (const b of remaining) s += faceHidden(placed[remaining[a]], placed[b]);
    if (s > worstScore) { worstScore = s; worst = a; }
  }
  drawOrder.push(remaining[worst]);   // 他人の顔をいちばん隠す写真を、いちばん下へ
  remaining.splice(worst, 1);
}
let hiddenSum = 0;
drawOrder.forEach((pi, order) => {
  for (let k = order + 1; k < drawOrder.length; k++) hiddenSum += faceHidden(placed[drawOrder[k]], placed[pi]);
});
for (const pi of drawOrder) {
  const p = placed[pi], it = items[p.idx];
  drawRotated(canvas, it.img, it.anchor, p.cx, p.cy, it.scale, it.tilt, cov, covScale);
}
console.log(`  重なり順を計算（顔が隠れる合計面積 ${Math.round(hiddenSum / 1000)}k px²）`);
items.forEach((it,i)=>console.log(`    ${ITEMS[i].file.slice(0,10)}: 写真 ${Math.round(it.img.width*it.scale)}x${Math.round(it.img.height*it.scale)} -> 同一写真の間隔 ${Math.round(it.repeatDist)}px`));

// 仕上げ：残った地色の隙間を、写真を「下にもぐり込ませて」埋める。
// 上に重ねると顔を隠してしまうので、すでに写真が乗っている画素には描かない。
let filled = 0;
for (let n = 0; n < 60; n++) {
  const spot = farthestUncovered(cov);
  if (spot.dist < STOP_DIST * 0.6) break;
  const cx = (spot.x + 0.5) * covScale, cy = (spot.y + 0.5) * covScale;
  const order = items.map((_, i) => i);
  let idx = order[Math.floor(rng() * order.length)];
  for (let k = 0; k < order.length; k++) {   // ここでも同じ写真の並びが縦横にならないようにする
    const cand = order[(idx + k) % order.length];
    if (!badRepeat(cand, cx, cy)) { idx = cand; break; }
  }
  const it = items[idx];
  drawRotated(canvas, it.img, it.anchor, cx, cy, it.scale, it.tilt, cov, covScale, null, { mask: cov.full });
  placed.push({ cx, cy, idx });
  filled++;
}
console.log(`  もぐり込ませて隙間を埋めた枚数: ${filled}`);

// 仕上げ：全体を白に寄せて明るくする（黒い服・暗い髪と「保成」の黒文字のコントラストを確保）
const BRIGHTEN = Number(process.argv[6] === undefined ? 0.22 : process.argv[6]);
if (BRIGHTEN > 0) {
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (let c = 0; c < 3; c++) {
      const di = i * 4 + c;
      canvas.data[di] = Math.round(canvas.data[di] + (255 - canvas.data[di]) * BRIGHTEN);
    }
  }
}

const png = new PNG({ width: SIZE, height: SIZE });
canvas.data.copy(png.data);
fs.writeFileSync(OUT, PNG.sync.write(png));
const rest = cov.data.reduce((a, v) => a + (v ? 0 : 1), 0) / (cov.w * cov.h);
console.log(`wrote ${OUT} (${SIZE}px, seed=${seed}, 顔高=${FACE_H}px, ${placed.length}枚, 地色の残り ${(rest * 100).toFixed(1)}%)`);
