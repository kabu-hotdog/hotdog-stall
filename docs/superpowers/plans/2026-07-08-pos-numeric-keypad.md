# レジ画面：預かり金テンキー Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** レジ画面に電卓風のテンキー（0〜9・00・クリア）を追加し、預かり金クイックボタンでカバーしない半端な金額もタッチだけで入力できるようにする。

**Architecture:** フロントエンドのみの変更。テンキーの各ボタンは既存の `cart:setReceived` Socket.ioイベントを再利用して金額をサーバーに送るだけで、バックエンドの変更は不要。

**Tech Stack:** 素のHTML/CSS/JS（ビルドツールなし）。既存の `pos/public/pos/pos.js` / `pos/public/pos/index.html` と同じ構成。

参照仕様書: [docs/superpowers/specs/2026-07-08-pos-numeric-keypad-design.md](../specs/2026-07-08-pos-numeric-keypad-design.md)

前提: [docs/superpowers/plans/2026-07-08-pos-quick-cash-buttons.md](2026-07-08-pos-quick-cash-buttons.md) のクイックボタン（`#quickExact` / `#quick500` / `#quick1000`）が実装済みであること。

## Global Constraints

- 数字ボタンをタップするたびに、現在の預かり金の**末尾に桁を追加**する（電卓・レジのテンキーと同じ動作）。クイックボタンでセットした値の後にタップしても同様に末尾追加する（意図した仕様）。
- 「00」ボタンは0を2つまとめて末尾に追加する。
- 「クリア」ボタンは預かり金を0にリセットする。
- カートが空（`cart.items.length === 0`）のときテンキー12ボタン全てを無効化する。
- 既存の数値入力欄（`#received`）・クイックボタンはそのまま残し、変更しない。
- バックエンド（`pos/server/*.js`）は変更しない。既存の `cart:setReceived` イベントをそのまま使う。

---

## File Structure

```
pos/public/pos/index.html   # テンキー12ボタン＋CSSグリッドを追加（修正）
pos/public/pos/pos.js       # テンキークリックハンドラ、renderCart()に無効化ロジック追加（修正）
```

---

## Task 1: 預かり金テンキーの追加

**Files:**
- Modify: `pos/public/pos/index.html`
- Modify: `pos/public/pos/pos.js`

**Interfaces:**
- Consumes: 既存の `socket`（Socket.ioクライアント）、既存の `latestState`（`pos.js:14`で宣言済みのグローバル変数、`cart.received` を参照する）、既存の `cart:setReceived` イベント（`{ amount: number }`）
- Produces: なし（このタスクで完結）

- [ ] **Step 1: CSSにテンキーのグリッドスタイルを追加**

`pos/public/pos/index.html` の `<style>` ブロック内、`.checkout-row input { ... }` の行の直後に追加する:

```css
  .keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; max-width: 240px; margin-top: 12px; }
  .keypad button { font-size: 24px; padding: 16px; }
```

- [ ] **Step 2: HTMLにテンキー12ボタンを追加**

`pos/public/pos/index.html` の `.checkout-row` の `</div>`（閉じタグ）の直後、`.cart-panel` の `</div>` の直前に以下を追加する:

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

つまり、変更後の `.cart-panel` 内は次の構造になる:

```html
  <div class="cart-panel">
    <h1>レジ</h1>
    <div class="menu-buttons">
      <button id="addHotdog">ホットドッグ 200円を追加</button>
      <button id="addCheeseHotdog">チーズホットドッグ 300円を追加</button>
    </div>
    <div id="cartItems"></div>
    <div class="total-row">合計: <span id="total">0</span>円</div>
    <div class="checkout-row">
      預かり金: <input type="number" id="received" value="0">
      <button id="quickExact" disabled>ぴったり</button>
      <button id="quick500" disabled>500円</button>
      <button id="quick1000" disabled>1000円</button>
      おつり: <span id="change">0</span>円
      <button id="checkoutBtn" disabled>会計確定</button>
    </div>
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
  </div>
```

- [ ] **Step 3: JSにテンキーのクリックハンドラを追加**

`pos/public/pos/pos.js` の、既存の `document.getElementById('quick1000').addEventListener(...)` ブロックの直後、`document.getElementById('checkoutBtn').addEventListener(...)` の直前に以下を追加する:

```js
document.querySelectorAll('.key').forEach((btn) => {
  btn.addEventListener('click', () => {
    const digit = btn.dataset.digit;
    const current = String(latestState.cart.received);
    const amount = Number(current + digit);
    socket.emit('cart:setReceived', { amount });
  });
});

document.getElementById('keyClear').addEventListener('click', () => {
  socket.emit('cart:setReceived', { amount: 0 });
});
```

- [ ] **Step 4: renderCart()にテンキーの無効化ロジックを追加**

`pos/public/pos/pos.js` の `renderCart` 関数内、末尾の以下の行:

```js
  const cartEmpty = cart.items.length === 0;
  document.getElementById('checkoutBtn').disabled = cartEmpty || cart.received < cart.total;
  document.getElementById('quickExact').disabled = cartEmpty;
  document.getElementById('quick500').disabled = cartEmpty;
  document.getElementById('quick1000').disabled = cartEmpty;
}
```

を、以下に置き換える（テンキー全ボタンの無効化を追加）:

```js
  const cartEmpty = cart.items.length === 0;
  document.getElementById('checkoutBtn').disabled = cartEmpty || cart.received < cart.total;
  document.getElementById('quickExact').disabled = cartEmpty;
  document.getElementById('quick500').disabled = cartEmpty;
  document.getElementById('quick1000').disabled = cartEmpty;
  document.querySelectorAll('.keypad button').forEach((btn) => {
    btn.disabled = cartEmpty;
  });
}
```

- [ ] **Step 5: サーバーを起動しブラウザで確認**

Run: `cd pos && npm.cmd start`（PowerShellで実行ポリシーエラーが出る場合は `npm.cmd` を使う。他のサーバーがすでに3000番ポートを使っている場合は一旦止める）
ブラウザで `http://localhost:3000/pos/` を開く。

確認項目:
- カートが空の状態で、テンキー12ボタン全て（数字・00・クリア）がグレーアウトして押せないこと
- 商品を追加すると、テンキーが押せるようになること
- 「1」→「0」→「0」→「0」の順にタップすると、預かり金欄が最終的に1000円になること（1→10→100→1000と段階的に増えること）
- 「00」を1回タップすると2桁まとめて増えること（例: 1の状態で「00」→100になること）
- クイックボタン「500円」を押した直後にテンキー「1」を押すと5001円になること（末尾追加の仕様通り。上書きにならないこと）
- 「クリア」を押すと預かり金が0に戻ること
- クリア後、既存の数値入力欄をクリックしてキーボードで直接入力できること（テンキー追加で壊れていないこと）
- 会計確定が引き続き正常に動作すること（既存フローの回帰がないこと）

- [ ] **Step 6: Commit**

```bash
git add pos/public/pos/index.html pos/public/pos/pos.js
git commit -m "pos: レジ画面に預かり金テンキーを追加"
```

---

## Self-Review メモ

- **仕様書カバレッジ**: テンキー12ボタン追加→Step2、末尾桁追加動作→Step3、クリア→Step3、カート空時の無効化→Step4。仕様書の全項目に対応。
- **プレースホルダー確認**: 全ステップに完全なコードを記載済み。
- **型・シグネチャの一貫性**: `cart:setReceived` イベント名・ペイロード形（`{ amount: number }`）は既存のクイックボタン実装（`pos.js:28-38`）と完全に一致。`latestState.cart.received` は既存の `socket.on('state', ...)`（`pos.js:156-162`）で毎回更新される既存グローバル変数を利用しており、新しい状態管理を導入していない。`.keypad button` セレクタは `#keyClear` を含む12ボタン全てにマッチする（`#keyClear` も `.keypad` の子要素として配置しているため、個別のid参照なしで一括無効化できる）。
