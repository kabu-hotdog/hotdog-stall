// G：保成づくし・デフォルメ版（フラット加工）。背景は images/chara/flat を敷き詰めたもの。
// 背景パターンは flyers/pamphlet/build-pattern.js で合成したPNGを全面に敷く
// （pptxgenjs の図形配置では参考柄のような密度が出せないため）。
// ユーザー指示：朱帯なし／店名の裏の白帯なし／右下の落款なし／価格文言なし。
// 実行: node flyers/pamphlet/build-pattern.js && CHARA=1 node flyers/pamphlet/build-pattern.js && node flyers/pamphlet/generate-cut-f.js
const L = require('./_lib');
const { pptx, slide, W, H } = L.newCut();

const INK = '1A1A1A';
const PAPER = 'FFFFFF';
const PATTERN = 'flyers/pamphlet/_assets/hosei-pattern-chara-flat.png';

// 背景：顔を敷き詰めたパターンを全面に（断ち落とし）
slide.addImage({ path: PATTERN, x: 0, y: 0, w: W, h: H });

// 主役：「保成」を縦に2文字。背景が賑やかなので白の太フチで必ず分離する。
// outlinedText は8方向オフセット複製なので、stroke幅＝フチの太さ（インチ）。
const bigOpts = {
  w: W - 1.0, h: 3.05, wrap: false, fontSize: 200, fontFace: 'HGGyoshotai',
  bold: true, color: INK, align: 'center', valign: 'middle',
};
L.outlinedText(slide, '保', { x: 0.62, y: -0.10, ...bigOpts }, { color: PAPER, width: 0.075 });
L.outlinedText(slide, '成', { x: 0.62, y:  2.92, ...bigOpts }, { color: PAPER, width: 0.075 });

// 店名：左端に縦書き。裏に帯は敷かず、白フチだけで背景から分離させる。
// vText は1文字ずつ置くため、フチは各文字の8方向複製で自前に作る。
function outlinedVText(text, x, topY, opts, stroke) {
  const d = stroke.width;
  for (const [dx, dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
    L.vText(slide, text, x + dx * d, topY + dy * d, { ...opts, color: stroke.color });
  }
  L.vText(slide, text, x, topY, opts);
}
outlinedVText('おいしいホットドック屋さん', 0.16, 0.30,
  { fontSize: 27, fontFace: 'HGSoeiKakugothicUB', color: INK, bold: true },
  { color: PAPER, width: 0.022 });

L.save(pptx, 'flyers/pamphlet/cut-g.pptx');
