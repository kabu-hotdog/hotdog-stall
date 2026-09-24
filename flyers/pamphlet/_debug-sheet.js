// デバッグ用：バスト切り出しの結果を1枚の一覧画像にする（顔矩形の実測用）。
// build-pattern.js の ITEMS と同じ顔矩形を読み、赤枠付きで並べる。
// 実行: node flyers/pamphlet/_debug-sheet.js
const fs = require('fs');
const { PNG } = require('pngjs');
const SRC = 'images/people/cropped';
const OUT = 'flyers/pamphlet/_assets/_debug-sheet.png';
const ITEMS = JSON.parse(fs.readFileSync('flyers/pamphlet/_face-rects.json', 'utf8'));
const BUST = { up: 0.45, down: 1.2, side: 1.2 };
const CELL = 300, COLS = 4;
const rows = Math.ceil(ITEMS.length / COLS);
const out = new PNG({ width: CELL * COLS, height: CELL * rows });
for (let i = 0; i < out.width * out.height; i++) {
  out.data[i * 4] = 232; out.data[i * 4 + 1] = 232; out.data[i * 4 + 2] = 240; out.data[i * 4 + 3] = 255;
}
const put = (x, y, r, g, b) => {
  if (x < 0 || y < 0 || x >= out.width || y >= out.height) return;
  const di = (y * out.width + x) * 4;
  out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b;
};
ITEMS.forEach((it, n) => {
  const png = PNG.sync.read(fs.readFileSync(`${SRC}/${it.file}`));
  const [ox, oy, ow, oh] = it.face;
  const bx = Math.round(ox + ow / 2 - oh * BUST.side);
  const by = Math.round(oy - oh * BUST.up);
  const bw = Math.round(oh * BUST.side * 2);
  const bh = Math.round(oh * (BUST.up + 1 + BUST.down));
  const s = Math.min(CELL / bw, CELL / bh);
  const gx = (n % COLS) * CELL, gy = Math.floor(n / COLS) * CELL;
  for (let y = 0; y < Math.round(bh * s); y++) for (let x = 0; x < Math.round(bw * s); x++) {
    const sx = bx + Math.round(x / s), sy = by + Math.round(y / s);
    if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) continue;
    const si = (sy * png.width + sx) * 4, a = png.data[si + 3] / 255;
    if (a < 0.02) continue;
    const di = ((gy + y) * out.width + gx + x) * 4;
    for (let c = 0; c < 3; c++) out.data[di + c] = Math.round(png.data[si + c] * a + out.data[di + c] * (1 - a));
  }
  // 顔矩形を赤枠で表示
  const fx0 = gx + Math.round((ox - bx) * s), fy0 = gy + Math.round((oy - by) * s);
  const fw = Math.round(ow * s), fh = Math.round(oh * s);
  for (let x = 0; x <= fw; x++) { put(fx0 + x, fy0, 255, 0, 0); put(fx0 + x, fy0 + fh, 255, 0, 0); }
  for (let y = 0; y <= fh; y++) { put(fx0, fy0 + y, 255, 0, 0); put(fx0 + fw, fy0 + y, 255, 0, 0); }
  // セルの枠
  for (let x = 0; x < CELL; x++) { put(gx + x, gy, 120, 120, 140); put(gx + x, gy + CELL - 1, 120, 120, 140); }
  for (let y = 0; y < CELL; y++) { put(gx, gy + y, 120, 120, 140); put(gx + CELL - 1, gy + y, 120, 120, 140); }
});
fs.writeFileSync(OUT, PNG.sync.write(out));
console.log('wrote', OUT, '順番:', ITEMS.map(i => i.file.slice(0, 10)).join(' '));
