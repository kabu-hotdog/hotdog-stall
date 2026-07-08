# 高専生にちゃにちゃレポート（集計スクリプト） 設計仕様書

- 日付: 2026-07-08
- 対象: `pos/scripts/`、`pos/server/reportStats.js`
- ステータス: 設計承認済み・実装計画待ち

## 背景・目的

文化祭終了後、売上データから面白い統計を出して盛り上がりたい（「高専生にちゃにちゃレポート」）。現状の売上集計（`pos/server/salesStats.js`）は累計額・本数・時間帯別・履歴という最低限の情報のみで、ランキングや混雑度などの「見て楽しい」統計は出せない。文化祭後に手動実行する集計スクリプトを追加し、`pos/data/state.json`から詳細な統計を含むHTMLレポートを生成できるようにする。

## スコープ

含む:
- `pos/data/state.json`を読み込み、HTMLレポートファイルを生成するスクリプト
- レポート内容: トッピング組み合わせランキング、10分刻みの注文件数グラフ
- 初日・2日目それぞれの内訳、および2日合計の両方を出す
- レポート生成時に`state.json`のタイムスタンプ付きバックアップコピーを作成する
- 集計ロジック（`pos/server/reportStats.js`）はTDDでテストする

含まない:
- POSアプリ本体（レジ・客表示・厨房・smartboard・サーバー）への変更
- 新しいデータ収集項目の追加（スタッフ別売上など、既存データに含まれない情報）
- レポートのリアルタイム表示・Webサーバー配信（あくまで文化祭後に手動実行する静的HTML生成）
- グラフ描画ライブラリの導入（外部依存を増やさず、CSSのみで棒グラフを表現する）

## 前提条件

- 対象注文は既存の`salesStats.js`と同じ基準（`status`が`cart`・`cancelled`以外）に揃える
- トッピング組み合わせは「ホットドッグ1本単位」で集計する。チーズホットドッグは「チーズ」を1つのトッピング次元として扱い、商品種別（ホットドッグ/チーズホットドッグ）＋ケチャップ＋マスタード＋マヨネーズの4項目の組み合わせをキーとする
- 時間帯グラフは10分刻み（例: 10:00-10:10, 10:10-10:20, ...）で注文件数（本数ではなく注文単位）を集計する
- 日付ごとの集計は`Order.day`フィールド（`ordersByDay`のキー）を基準にする

## 設計

### ファイル構成
```
pos/server/reportStats.js         # 集計ロジック（純粋関数、テスト対象）
pos/test/reportStats.test.js      # reportStats.js のテスト
pos/scripts/generate-report.js    # state.json読み込み・バックアップ・HTML生成・書き出し（CLIエントリポイント）
```

### 集計ロジック（`pos/server/reportStats.js`）

```
computeToppingRanking(orders): Array<{ label: string, count: number }>
```
- 対象注文の全アイテムをフラット化し、`{product, toppings}`からラベル文字列（例: `"チーズホットドッグ / ケチャップ:多め / マスタード:なし / マヨネーズ:普通"`）を生成
- ラベルごとに出現回数を集計し、多い順にソートして返す

```
computeTimeBuckets(orders): Array<{ bucketStart: string, count: number }>
```
- 対象注文の`paidAt`を10分単位のバケット（例: `"10:00"`）に丸めて注文件数を集計
- バケット開始時刻の昇順で返す（データがない時間帯のバケットは含めない）

```
computeReportData(ordersByDay): { days: Array<{ day, toppingRanking, timeBuckets }>, combined: { toppingRanking, timeBuckets } }
```
- `ordersByDay`（`OrderStore.toJSON()`の`ordersByDay`そのもの）を受け取り、日付ごとの集計と全日合計の集計をまとめて返す
- 各日・合計それぞれで`status`が`cart`・`cancelled`の注文を除外してから`computeToppingRanking`・`computeTimeBuckets`を呼ぶ

### CLIスクリプト（`pos/scripts/generate-report.js`）

1. `pos/data/state.json`を読み込む（存在しない場合はエラーメッセージを出して終了）
2. `pos/data/state-backup-<ISO日時>.json`としてバックアップコピーを書き出す
3. `computeReportData()`で集計する
4. HTML文字列を組み立てる（トッピングランキングは表、時間帯グラフはCSSのdiv幅で表現する簡易棒グラフ）
5. `pos/data/report.html`に書き出す
6. コンソールに生成完了メッセージと出力先パスを表示する

実行方法: `cd pos && node scripts/generate-report.js`

### エラーハンドリング
- `state.json`が存在しない、またはJSONとして壊れている場合はエラーメッセージを表示してスクリプトを終了する（バックアップ・レポート生成は行わない）
- 注文が1件もない日は、その日のセクションを「データなし」として表示する（グラフ・ランキングは空配列として扱う）

### テスト
- `reportStats.js`の3関数（`computeToppingRanking`, `computeTimeBuckets`, `computeReportData`）をTDDでテストする
- `generate-report.js`自体（ファイルI/O・HTML生成部分）は自動テストなし。実際に`state.json`を用意して手動実行し、生成された`report.html`をブラウザで確認する
