# CLAUDE.md

旭川高専 文化祭屋台「おいしいホットドック屋さん」の制作補助プロジェクト。

## このプロジェクトでやること

- フライヤー・ポスター生成（pptxgenjs → .pptx 出力）
- SNS投稿文・告知文作成
- スタッフ向け資料・シフト表

## 読むべきファイル

| やりたいこと | 読むファイル |
|---|---|
| 屋台の基本情報・メニュー・設備 | `.claude/skills/stall-info.md` |
| ポスター・フライヤーを作る | `.claude/skills/poster/poster-prompt.md` |
| デザインスタイル参考（GPTリサーチ済） | `.claude/skills/poster/01_american-diner.md` `.claude/skills/poster/02_chalkboard-chalk-art.md` `.claude/skills/poster/03_neon-cyber.md` |
| 新規セッション開始・index更新 | `.claude/skills/session-start.md` |

## 出力の基本ルール

- 生成した .pptx は `flyers/` に保存、`index.html` のカードも更新する
- 日本語メイン、高専生らしくポップに
- 画像素材：`images/hotdog/`（ホットドッグ）、`images/people/`（人物）に追加する
