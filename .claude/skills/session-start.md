# session-start.md — 新規セッション開始プロンプト

このファイルを `.claude/skills/` に置いておき、Claude Code の新規セッション開始時にコピペして使う。

---

## 📋 コピペ用プロンプト（index.html 更新）

```
.claude/skills/stall-info.md と .claude/skills/poster-prompt.md を読んだあと、
flyers/ ディレクトリ内のファイルを全部リストアップして、
index.html の GENERATED_FLYERS_START〜END と GENERATED_STAFF_START〜END の間を
実際に存在するファイルへのリンクカードに書き換えてください。

カードの形式：
- flyers/ 内の *.html → 「フライヤー」セクション
- flyers/ 内の *staff*.html, *recipe*.html, *shift*.html → 「スタッフ資料」セクション
- 存在しないカテゴリは placeholder カード（pointer-events:none）のまま残す

カードの情報として含めること：
- ファイル名から推測した日本語タイトル
- 簡単な説明（1行）
- タグ：完成済み → tag-done「完成」
```

---

## 📋 コピペ用プロンプト（フライヤー新規作成）

```
.claude/skills/stall-info.md と .claude/skills/poster-prompt.md を読んで、
[ここに作りたいもの。例：A4カラーフライヤー / SNS用バナー / スマートボード用メニュー]
を作成してください。

出力先：flyers/[ファイル名].html
完成後：index.html を更新して新しいカードを追加してください。
```

---

## 📋 コピペ用プロンプト（セッション最初の一回・初期設定）

```
CLAUDE.md と .claude/skills/ フォルダ内のすべての .md ファイルを読んでください。
その後、このセッションで何を作るか教えてください。
```

---

## ファイル・フォルダ構成の確認

```
hotdog-stall/           ← GitHubリポジトリroot
├── CLAUDE.md           ← Claude Code が自動で読む
├── index.html          ← GitHub Pages トップ（このファイル）
├── flyers/             ← 生成した全HTMLをここに置く
│   ├── color-a4.html
│   ├── sns-banner.html
│   ├── smartboard-menu.html
│   └── staff-recipe-card.html
└── .claude/
    └── skills/
        ├── stall-info.md      ← 屋台基本情報（様式03/04/05）
        ├── poster-prompt.md   ← フライヤー生成テンプレート集
        └── session-start.md   ← このファイル
```

## GitHub Pages 有効化手順

1. GitHub でリポジトリ作成（public）
2. Settings → Pages → Source: `main` ブランチ、`/ (root)`
3. `https://[username].github.io/[repo-name]/` でアクセス可能
4. 幹事を Collaborators に追加 → Settings → Collaborators

## ファイル命名ルール

| 用途 | ファイル名 |
|---|---|
| A4カラーフライヤー | `flyers/flyer-color-a4.html` |
| A4白黒フライヤー | `flyers/flyer-mono-a4.html` |
| SNS正方形バナー | `flyers/banner-sns-square.html` |
| スマートボード用 | `flyers/menu-smartboard.html` |
| 調理手順カード | `flyers/staff-recipe-card.html` |
| シフト表 | `flyers/staff-shift.html` |
