// Geminiからダウンロードした画像は、透過部分が市松模様として焼き込まれたJPEGになる。
// その背景を消して透過に戻す。
//
// 方式：画像の端から「明るい無彩色（市松の白と灰、および元の白フチ）」をたどって塗りつぶし、
//       そこをアルファ0にする。JPEG圧縮で市松の周期が崩れていても効く。
//       白フチごと消えるが、敷き詰め時に build-pattern.js が白フチを付け直すので問題ない。
//       内側の白（目・歯・ロゴなど）は端とつながっていないので残る。
// 実行: node flyers/pamphlet/unbake-checker.js images/chara/dl-01.png ...
const fs = require('fs');
const { PNG } = require('pngjs');

function processFile(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width: W, height: H, data } = png;

  // 背景候補：無彩色で明るい画素
  const bgish = (p) => {
    const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx - mn <= 14 && mn >= 196;
  };

  const bg = new Uint8Array(W * H);
  const stack = [];
  const push = (p) => { if (!bg[p] && bgish(p)) { bg[p] = 1; stack.push(p); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const p = stack.pop(), px = p % W, py = (p - px) / W;
    if (px > 0) push(p - 1);
    if (px < W - 1) push(p + 1);
    if (py > 0) push(p - W);
    if (py < H - 1) push(p + W);
  }

  // 取りこぼした市松の残り（背景に囲まれた小さな塊）も消す：
  // 背景でない画素の連結成分のうち、小さすぎるものは捨てる
  const seen = new Uint8Array(W * H);
  const comps = [];
  for (let s = 0; s < W * H; s++) {
    if (bg[s] || seen[s]) continue;
    const cells = [s]; seen[s] = 1; let head = 0;
    while (head < cells.length) {
      const p = cells[head++], px = p % W, py = (p - px) / W;
      for (const q of [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, py > 0 ? p - W : -1, py < H - 1 ? p + W : -1]) {
        if (q >= 0 && !bg[q] && !seen[q]) { seen[q] = 1; cells.push(q); }
      }
    }
    comps.push(cells);
  }
  comps.sort((a, b) => b.length - a.length);
  const keep = new Uint8Array(W * H);
  const minSize = W * H * 0.002;   // 全体の0.2%未満の塊はゴミとして捨てる
  let kept = 0;
  for (const c of comps) {
    if (c.length < minSize && kept > 0) continue;
    for (const p of c) keep[p] = 1;
    kept += c.length;
  }

  for (let p = 0; p < W * H; p++) data[p * 4 + 3] = keep[p] ? 255 : 0;

  const out = file.replace(/\.png$/, '-cut.png');
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log(`${file}: 不透明 ${(kept / (W * H) * 100).toFixed(1)}% -> ${out}`);
}

process.argv.slice(2).forEach(processFile);
