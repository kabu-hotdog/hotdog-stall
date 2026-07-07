# CLAUDE.md

旭川高専 文化祭屋台「おいしいホットドック屋さん」の制作補助プロジェクト。

## このプロジェクトでやること

- フライヤー・ポスター生成（pptxgenjs → .pptx 出力）
- SNS投稿文・告知文作成
- スタッフ向け資料・シフト表

## 読むべきファイル

| やりたいこと | 読むファイル |
|---|---|
| **作業の進め方・品質基準（全作業共通の行動規範）** | `.claude/skills/context-framework.md` |
| 屋台の基本情報・メニュー・設備 | `.claude/skills/stall-info.md` |
| ポスター・フライヤーを作る | `.claude/skills/poster/poster-prompt.md` |
| **制作ノウハウ（実制作で得た知見・技術Tips・QAチェックリスト）** | `.claude/skills/poster/poster-knowhow.md` |

## 出力の基本ルール

- 生成した .pptx は `flyers/` に保存する
- `index.html` のカード追加・JPG変換は、ユーザーが完成版を明示的に承認したときだけ行う（承認前に書き換えない）
- 日本語メイン、高専生らしくポップに
- 画像素材：`images/hotdog/`（ホットドッグ）、`images/people/`（人物）に追加する
- **pptxを再生成する前に、必ず `scripts/check-flyer-hash.ps1` で手動編集されていないか確認する。PowerPointが開いていて再生成できない時は、理由を決めつけて無断でプロセスを閉じるな。必ずユーザーに聞く。** 過去にこれを怠ってユーザーの手動編集を握りつぶした事故がある（詳細は`.claude/skills/poster/poster-knowhow.md` §7）。例外なし。
- **これはコードでも強制されている**：生成スクリプトは `pptx-safe-write.js` の `safeWriteFile()` 経由でしか書き込まず、ハッシュ不一致なら Claude の判断に関係なく書き込みを拒否する。ただし「承認記録なし」の場合はコードでは判断できないので、事前照合とユーザーへの確認は引き続き必須
