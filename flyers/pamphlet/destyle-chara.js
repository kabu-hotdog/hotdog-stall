// 生成イラストの「AIっぽさ」を落とす後処理。
// AI感の主因は ①キラキラの星 ②てかった多階調の影 ③彩度の高い肌 なので、
// 星を消し、色を減らし（ポスタライズ）、彩度を落として、フラットな版画/シール調に寄せる。
//
// 使い方:
//   node flyers/pamphlet/destyle-chara.js flat      … 色数を落としてフラット化（既定）
//   node flyers/pamphlet/destyle-chara.js duotone   … 2色（濃紺＋生成り）の刷り物風
// 出力: images/chara/flat/ または images/chara/duotone/
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = 'images/chara/final';
const mode = process.argv[2] || 'flat';
const OUT = mode === 'duotone' ? 'images/chara/duotone' : 'images/chara/flat';
fs.mkdirSync(OUT, { recursive: true });

// ① キラキラの星（黄色い小さな塊）を消す
function removeSparkles(png) {
  const { width: W, height: H, data } = png;
  const yellow = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const j = i * 4, r = data[j], g = data[j + 1], b = data[j + 2], a = data[j + 3];
    if (a > 100 && r > 235 && g > 195 && b < 120 && r - b > 130 && g - b > 80) yellow[i] = 1;
  }
  const seen = new Uint8Array(W * H);
  let removed = 0;
  for (let s = 0; s < W * H; s++) {
    if (!yellow[s] || seen[s]) continue;
    const cells = [s]; seen[s] = 1; let head = 0;
    while (head < cells.length) {
      const p = cells[head++], px = p % W, py = (p - px) / W;
      for (const q of [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, py > 0 ? p - W : -1, py < H - 1 ? p + W : -1]) {
        if (q >= 0 && yellow[q] && !seen[q]) { seen[q] = 1; cells.push(q); }
      }
    }
    // 小さい塊だけ消す（枕やホットドッグのような大きい黄色は残す）
    if (cells.length < W * H * 0.0025) {
      for (const p of cells) data[p * 4 + 3] = 0;
      removed++;
    }
  }
  return removed;
}

const rgb2hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (mx === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
};
const hsl2rgb = (h, s, l) => {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
};

const INK = [26, 32, 46], PAPER = [250, 246, 236];   // duotone用（濃紺＋生成り）

function processFile(file) {
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, file)));
  const { width: W, height: H, data } = png;
  const sparkles = removeSparkles(png);

  for (let i = 0; i < W * H; i++) {
    const j = i * 4;
    if (data[j + 3] < 30) continue;
    const r = data[j], g = data[j + 1], b = data[j + 2];
    if (mode === 'duotone') {
      // 明度だけ見て2色に割り当てる（3段階の刷り物風）
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const step = lum < 0.32 ? 0 : lum < 0.68 ? 0.45 : 1;
      for (let c = 0; c < 3; c++) data[j + c] = Math.round(INK[c] + (PAPER[c] - INK[c]) * step);
    } else {
      // ② 階調を5段に落とす（グラデの「てかり」を消す）＋ ③ 彩度を少し下げる
      let [h, s, l] = rgb2hsl(r, g, b);
      s = Math.min(1, s * 0.78);
      l = Math.round(l * 4) / 4;                 // 5段
      l = Math.min(1, l * 0.96 + 0.05);          // 全体を少し明るく、コントラストを緩める
      const [nr, ng, nb] = hsl2rgb(h, s, l);
      data[j] = nr; data[j + 1] = ng; data[j + 2] = nb;
    }
  }
  fs.writeFileSync(path.join(OUT, file), PNG.sync.write(png));
  console.log(`${file}: 星を${sparkles}個削除 -> ${path.join(OUT, file)}`);
}

fs.readdirSync(SRC).filter(f => f.endsWith('.png')).forEach(processFile);
