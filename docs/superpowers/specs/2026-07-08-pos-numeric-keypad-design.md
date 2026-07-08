# レジ画面：預かり金テンキー 設計仕様書

- 日付: 2026-07-08
- 対象: `pos/public/pos/` レジ画面
- ステータス: 設計承認済み・実装計画待ち

## 背景・目的

先行実装したクイックボタン（「ぴったり／500円／1000円」）に加えて、電卓・レジ風のテンキー（0〜9・00・クリア）を追加する。クイックボタンでカバーしない半端な金額（例: 350円、1200円など）も、オンスクリーンキーボードを呼び出さずタッチだけで入力できるようにする。

前提として [docs/superpowers/specs/2026-07-08-pos-quick-cash-buttons-design.md](2026-07-08-pos-quick-cash-buttons-design.md) で追加したクイックボタン（`#quickExact` / `#quick500` / `#quick1000`）は変更せずそのまま残す。

## スコープ

含む:
- 預かり金欄の下にテンキー（1〜9、0、00、クリア、計12ボタン）を追加
- 数字ボタンをタップするたびに預かり金の**末尾に桁を追加**する（電卓のテンキーと同じ動作）
- 「00」ボタンは0を2つまとめて末尾に追加する
- 「クリア」ボタンで預かり金を0にリセットする
- カートが空のときはテンキー全12ボタンを無効化する（既存のクイックボタン・会計確定ボタンと同じ扱い）

含まない:
- 既存の数値入力欄（`#received`）・クイックボタンの変更（そのまま共存）
- 小数点入力（円なので不要）
- バックスペース（1桁削除）ボタン（クリアで全消しのみとする、ユーザー判断により見送り）
- バックエンド（`pos/server/*.js`）の変更（既存の`cart:setReceived`イベントをそのまま再利用するため不要）

## 前提条件

- 「末尾に桁を追加」は、クイックボタンで金額をセットした直後でも同様に効く（例: 「500円」を押した後に「1」をタップすると5001円になる）。仕様として意図した動作であり、間違えたら「クリア」で0から打ち直す運用とする。
- 現在の預かり金の値は `#received` 入力欄のDOM表示値を文字列として扱い、末尾に桁を足した上で数値に変換してサーバーへ送る（サーバーからの確認応答を待つ`latestState`ではなくDOM値を直接読み書きすることで、連続タップ時のレース条件を避ける。実機検証で発見・修正）。

## 設計

### UI
`pos/public/pos/index.html` の `.checkout-row`（クイックボタンを含む行）の下に、テンキー用のブロックを追加する:
```html
<div class="keypad">
  <button class="key" data-digit="7" disabled>7</button>
  <button class="key" data-digit="8" disabled>8</button>
  <button class="key" data-digit="9" disabled>9</button>
  <button class="key" data-digit="4" disabled>4</button>
  <button class="key" data-digit="5" disabled>5</button>
  <button class="key" data-digit="6" disabled>6</button>
  <button class="key" data-digit="1" disabled>1</button>
  <button class="key" data-digit="2" disabled>2</button>
  <button class="key" data-digit="3" disabled>3</button>
  <button id="keyClear" disabled>クリア</button>
  <button class="key" data-digit="0" disabled>0</button>
  <button class="key" data-digit="00" disabled>00</button>
</div>
```
CSSで3列×4行のグリッド表示にする（`.keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; max-width: 240px; }` 程度）。

### 動作（`pos/public/pos/pos.js`）
- 数字ボタン（`.key[data-digit]`）のクリックハンドラは、`#received` 入力欄の現在のDOM表示値を文字列化して末尾にボタンの`data-digit`値を連結し、数値に変換して入力欄に即座に反映した上で `socket.emit('cart:setReceived', { amount })` を呼ぶ
  - 例: 現在500円のとき「1」ボタン → `'500' + '1'` → `'5001'` → `Number('5001')` → `5001`
  - 「00」ボタンも同じ仕組みで`data-digit="00"`を連結するだけで良い（追加ロジック不要）
  - サーバーの確認応答を待たずDOM値を直接書き換えるのは、連続タップ時のレース条件（前のタップのサーバー応答が来る前に次のタップが古い値を元に計算してしまう）を避けるため
- 「クリア」ボタン（`#keyClear`）は `#received` を即座に0にした上で `socket.emit('cart:setReceived', { amount: 0 })` を呼ぶ（数字ボタンと同じくDOM即時反映で一貫させる）
- `renderCart()` 内の既存の無効化ロジック（`cartEmpty` 判定）に、テンキー12ボタン全ての `disabled` 設定を追加する

### データフロー
既存のクイックボタンと全く同じ経路（`cart:setReceived` → サーバーの既存ハンドラ → 全クライアントへ `state` ブロードキャスト → `#received` の表示更新）を通るため、バックエンドの変更は不要。

### エラーハンドリング
既存の `OrderStore.setReceived()` のバリデーション（負数・非数値を拒否）がそのまま効く。テンキーは常に非負の整数文字列を生成するため、追加のバリデーションは不要。

### テスト
フロントエンドのみの変更のため、他のUIタスクと同様に自動テストは行わず、実ブラウザでの動作確認とする:
- カートが空の状態でテンキー12ボタン全てが無効化されていることを確認
- 商品追加後、テンキーが押せるようになることを確認
- 「1」→「0」→「0」→「0」の順にタップして預かり金が1000円になることを確認
- 「00」を1回タップして2桁まとめて追加されることを確認
- クイックボタン「500円」を押した直後にテンキー「1」を押すと5001円になる（末尾追加の仕様通り）ことを確認
- 「クリア」を押すと預かり金が0に戻ることを確認
- クリア後、手動キーボード入力も引き続きできることを確認
- 会計確定が引き続き正常に動作すること（既存フローの回帰がないこと）
