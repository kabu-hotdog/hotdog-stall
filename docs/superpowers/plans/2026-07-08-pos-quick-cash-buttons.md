# レジ画面：預かり金クイックボタン Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** レジ画面の預かり金入力に「ぴったり／500円／1000円」のクイックボタンを追加し、タッチ操作でもワンタップで入力できるようにする（既存のキーボード入力と共存）。

**Architecture:** フロントエンドのみの変更。3つのボタンが既存の `cart:setReceived` Socket.ioイベントを再利用して金額をサーバーに送るだけで、バックエンドの変更は不要。

**Tech Stack:** 素のHTML/CSS/JS（ビルドツールなし）。既存の `pos/public/pos/pos.js` / `pos/public/pos/index.html` と同じ構成。

参照仕様書: [docs/superpowers/specs/2026-07-08-pos-quick-cash-buttons-design.md](../specs/2026-07-08-pos-quick-cash-buttons-design.md)

## Global Constraints

- ボタンを押したら預かり金欄をその金額に**上書き**する（加算ではない）。
- 「ぴったり」はカート合計金額（`cart.total`）と同額。500円・1000円は固定値。
- カートが空（`cart.items.length === 0`）のとき3ボタンとも無効化する。
- 既存の数値入力欄（`#received`）はそのまま残し、キーボード入力も引き続き使えること。
- バックエンド（`pos/server/*.js`）は変更しない。既存の `cart:setReceived` イベントをそのまま使う。

---

## File Structure

```
pos/public/pos/index.html   # クイックボタン3つのHTML要素を追加（修正）
pos/public/pos/pos.js       # クリックハンドラ追加、renderCart()に無効化ロジック追加（修正）
```

---

## Task 1: 預かり金クイックボタンの追加

**Files:**
- Modify: `pos/public/pos/index.html`
- Modify: `pos/public/pos/pos.js`

**Interfaces:**
- Consumes: 既存の `socket`（Socket.ioクライアント）、既存の `latestState`（`pos.js:14`で宣言済みのグローバル変数、`state`イベント受信のたびに更新される）、既存の `cart:setReceived` イベント（`{ amount: number }` を送るとサーバーが預かり金を更新する）
- Produces: なし（このタスクで完結。他タスクからの依存なし）

- [ ] **Step 1: HTMLにクイックボタンを追加**

`pos/public/pos/index.html` の `.checkout-row` を以下に置き換える:

```html
    <div class="checkout-row">
      預かり金: <input type="number" id="received" value="0">
      <button id="quickExact" disabled>ぴったり</button>
      <button id="quick500" disabled>500円</button>
      <button id="quick1000" disabled>1000円</button>
      おつり: <span id="change">0</span>円
      <button id="checkoutBtn" disabled>会計確定</button>
    </div>
```

- [ ] **Step 2: JSにクリックハンドラを追加**

`pos/public/pos/pos.js` の、既存の `document.getElementById('received').addEventListener(...)` ブロック（15-18行目付近）の直後に以下を追加する:

```js
document.getElementById('quickExact').addEventListener('click', () => {
  socket.emit('cart:setReceived', { amount: latestState.cart.total });
});

document.getElementById('quick500').addEventListener('click', () => {
  socket.emit('cart:setReceived', { amount: 500 });
});

document.getElementById('quick1000').addEventListener('click', () => {
  socket.emit('cart:setReceived', { amount: 1000 });
});
```

- [ ] **Step 3: renderCart()に無効化ロジックを追加**

`pos/public/pos/pos.js` の `renderCart` 関数内、末尾の以下の行:

```js
  document.getElementById('total').textContent = cart.total;
  document.getElementById('change').textContent = Math.max(cart.change, 0);
  document.getElementById('checkoutBtn').disabled = cart.items.length === 0 || cart.received < cart.total;
}
```

を、以下に置き換える（クイックボタン3つの無効化判定を追加）:

```js
  document.getElementById('total').textContent = cart.total;
  document.getElementById('change').textContent = Math.max(cart.change, 0);

  const cartEmpty = cart.items.length === 0;
  document.getElementById('checkoutBtn').disabled = cartEmpty || cart.received < cart.total;
  document.getElementById('quickExact').disabled = cartEmpty;
  document.getElementById('quick500').disabled = cartEmpty;
  document.getElementById('quick1000').disabled = cartEmpty;
}
```

- [ ] **Step 4: サーバーを起動しブラウザで確認**

Run: `cd pos && npm.cmd start`（PowerShellで実行ポリシーエラーが出る場合は `npm.cmd` を使う）
ブラウザで `http://localhost:3000/pos/` を開く。

確認項目:
- ページ読み込み直後（カートが空）、「ぴったり」「500円」「1000円」ボタンがグレーアウトして押せないこと
- ホットドッグを1つ追加すると3ボタンとも押せるようになること
- 「500円」を押すと預かり金欄が500になり、おつりが正しく計算されること
- 「1000円」を押すと預かり金欄が1000に上書きされること（500から1000に変わる、加算されて1500にならないこと）
- 「ぴったり」を押すと預かり金欄がカート合計と同額になり、おつりが0になること
- ホットドッグをもう1つ追加してカート合計が変わった後に「ぴったり」を押すと、新しい合計額が入ること
- クイックボタンを押した後も、預かり金欄を手動でクリックしてキーボード入力で金額を変更できること
- 会計確定して注文が完了すること（既存フローの回帰がないこと）

- [ ] **Step 5: Commit**

```bash
git add pos/public/pos/index.html pos/public/pos/pos.js
git commit -m "pos: レジ画面に預かり金クイックボタンを追加"
```

---

## Self-Review メモ

- **仕様書カバレッジ**: 3ボタン追加→Step1、上書き動作・ぴったり計算・固定値→Step2、カート空時の無効化→Step3、バックエンド変更なし→そもそも `pos/server/` を一切触っていない。仕様書の全項目に対応。
- **プレースホルダー確認**: 全ステップに完全なコードを記載済み。
- **型・シグネチャの一貫性**: `cart:setReceived` イベント名・ペイロード形（`{ amount: number }`）は既存の `#received` の `input` ハンドラ（`pos.js:24-26`）と完全に一致させている。`latestState.cart.total` は既存の `socket.on('state', ...)`（`pos.js:139-145`）で毎回更新される既存グローバル変数を利用しており、新しい状態管理を導入していない。
