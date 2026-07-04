// images/people/ の透過PNGを、実際に人物が写っているアルファ範囲だけにクロップして
// images/people/cropped/ に保存する。removebg画像は透明な余白が大きく、
// addContain の contain-fit がキャンバス全体サイズを基準に計算されるため
// 余白込みで縮小され、人物が意図より小さく配置される問題があった。
// 事前にクロップしておくことでこの問題を解消する。
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC_DIR = 'images/people';
const OUT_DIR = path.join(SRC_DIR, 'cropped');
const ALPHA_THRESHOLD = 20;
const PADDING_PCT = 0.02; // bboxの外側に2%だけ余白を残す（発光shadowが窮屈にならないよう）

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function findAlphaBBox(png) {
  const { width: W, height: H, data } = png;
  let minX = W, maxX = -1, minY = H, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const alpha = data[(W * y + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY, W, H };
}

const files = fs.readdirSync(SRC_DIR).filter(f => /\.png$/i.test(f));

files.forEach(f => {
  const srcPath = path.join(SRC_DIR, f);
  const png = PNG.sync.read(fs.readFileSync(srcPath));
  const { minX, maxX, minY, maxY, W, H } = findAlphaBBox(png);

  if (maxX < 0) {
    console.log(`skip (fully transparent?): ${f}`);
    return;
  }

  const padX = Math.round((maxX - minX) * PADDING_PCT);
  const padY = Math.round((maxY - minY) * PADDING_PCT);
  const cropX = Math.max(0, minX - padX);
  const cropY = Math.max(0, minY - padY);
  const cropW = Math.min(W, maxX + padX + 1) - cropX;
  const cropH = Math.min(H, maxY + padY + 1) - cropY;

  const out = new PNG({ width: cropW, height: cropH });
  PNG.bitblt(png, out, cropX, cropY, cropW, cropH, 0, 0);

  const outPath = path.join(OUT_DIR, f);
  fs.writeFileSync(outPath, PNG.sync.write(out));

  const beforePct = ((maxX - minX) / W * 100).toFixed(1) + 'x' + ((maxY - minY) / H * 100).toFixed(1);
  console.log(`${f}: canvas ${W}x${H} -> cropped ${cropW}x${cropH} (旧占有率 ${beforePct}%)`);
});
