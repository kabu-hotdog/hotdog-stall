# CLAUDE.md

旭川高専 文化祭屋台「おいしいホットドック屋さん」の制作補助プロジェクト。

## このプロジェクトでやること

- フライヤー・ポスター生成（HTML/SVG/React → スクショ運用）
- SNS投稿文・告知文作成
- スタッフ向け資料・シフト表

## 読むべきファイル

| やりたいこと | 読むファイル |
|---|---|
| 屋台の基本情報・メニュー・設備 | `.claude/skills/stall-info.md` |
| ポスター・フライヤーを作る | `.claude/skills/poster-prompt.md` |
| 新規セッション開始・index更新 | `.claude/skills/session-start.md` |

## 出力の基本ルール

- フライヤーは **カラー版と白黒印刷版の両方** を作る
- 生成したHTMLは必ず `flyers/` フォルダに保存する
- ファイル保存後は `index.html` のカードも更新する
- 日本語メイン、高専生らしくポップに

## フォルダ構成

```
hotdog-stall/
├── CLAUDE.md          ← ここ
├── index.html         ← GitHub Pages トップ（生成物一覧）
├── flyers/            ← 全HTMLをここに置く
└── .claude/skills/    ← 参照ドキュメント置き場
```
