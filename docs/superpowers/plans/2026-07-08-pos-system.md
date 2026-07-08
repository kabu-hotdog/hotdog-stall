# レジシステム Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PC4台（POS・客表示・厨房・smartboard）をLANでリアルタイム連携させる、文化祭2日間運用の現金専用レジシステムを構築する。

**Architecture:** Node.js（Express + Socket.io）の中央サーバーを1台のPCで起動し、他3台はブラウザで各画面URLを開いて接続する。注文状態はサーバーのメモリ上で一元管理し、変更のたびに全クライアントへ Socket.io で即時ブロードキャストする。定期的および重要イベント時にJSONファイルへスナップショットを書き出し、サーバー再起動時に復元する。

**Tech Stack:** Node.js（標準の `node:test` をテストランナーとして使用、追加のテストフレームワークは導入しない）, Express, Socket.io, socket.io-client（テスト用devDependency）, フロントエンドはビルドツールなしの素のHTML/CSS/JS。

参照仕様書: [docs/superpowers/specs/2026-07-08-pos-system-design.md](../specs/2026-07-08-pos-system-design.md)

## Global Constraints

- 支払いは現金のみ。レシート印刷は行わない。
- POSにスタッフログイン・識別機能は設けない（共用端末）。
- メニュー価格: ホットドッグ200円、チーズホットドッグ300円（チーズ50g固定）。トッピング（ケチャップ・マスタード・マヨネーズ、各「普通」「多め」）はすべて無料。
- ホットドッグ1本ごとにトッピングを個別選択できること。
- 開催は2日間。注文番号・売上集計は日（`day`）ごとにリセットする。
- 注文番号は、採番時点で当日かつ未受渡（`paid`/`cooking`/`ready`）の注文が0件なら1から、それ以外は当日の直近発行番号+1。
- 当日インターネット接続なしでも動作すること。外部CDNは使用禁止（Socket.ioクライアントはサーバーが自動配信するものを使う）。
- 会計前のカートは自由に編集・削除可能。会計確定後も「取消」ボタンでキャンセル可能。
- smartboardは左列（呼び出し待ち・薄い色）／右列（受け取り可・通常表示）の2列構成。音声アナウンスは行わない。
- 既存のフライヤー生成機能（リポジトリ直下の `generate-*.js` 等）とは独立したサブシステムとして `pos/` 配下に構築する。独自の `package.json` を持つ。

---

## File Structure

```
pos/
  package.json
  server/
    menu.js               # メニュー・価格の定義
    orderStore.js          # 注文状態の中核ロジック（カート・会計・状態遷移・採番）
    salesStats.js          # 売上集計ロジック
    persistence.js         # JSONスナップショットの保存/復元
    index.js                # Express + Socket.io サーバー本体
  public/
    shared/
      base.css              # 共通リセット・フォント
    pos/
      index.html
      pos.js
    customer/
      index.html
      customer.js
    kitchen/
      index.html
      kitchen.js
    smartboard/
      index.html
      smartboard.js
  data/                     # 実行時にstate.jsonが生成される（gitignore対象）
  test/
    menu.test.js
    orderStore.cart.test.js
    orderStore.checkout.test.js
    orderStore.transitions.test.js
    persistence.test.js
    salesStats.test.js
    server.integration.test.js
```

---

## Task 1: プロジェクト scaffolding

**Files:**
- Create: `pos/package.json`
- Modify: `.gitignore` (リポジトリ直下)
- Create: `pos/data/.gitkeep`

**Interfaces:**
- Produces: `pos/` ディレクトリ構成、`npm test`（`node --test test/`）と `npm start`（`node server/index.js`）コマンド

- [ ] **Step 1: package.json を作成**

`pos/package.json`:
```json
{
  "name": "hotdog-pos",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server/index.js",
    "test": "node --test test/"
  },
  "dependencies": {
    "express": "^4.19.2",
    "socket.io": "^4.7.5"
  },
  "devDependencies": {
    "socket.io-client": "^4.7.5"
  }
}
```

- [ ] **Step 2: 依存パッケージをインストール**

Run: `cd pos && npm install`
Expected: `node_modules/` が作成され、`express`・`socket.io`・`socket.io-client` がインストールされる。

- [ ] **Step 3: .gitignore に実行時生成データを追加**

リポジトリ直下の `.gitignore` に以下を追記（既存の `node_modules/` `package-lock.json` の行はそのまま残す）:
```
pos/data/state.json
pos/data/*.tmp
```

- [ ] **Step 4: data ディレクトリを作成しコミット用に .gitkeep を置く**

Run:
```bash
mkdir -p pos/data pos/server pos/public/shared pos/public/pos pos/public/customer pos/public/kitchen pos/public/smartboard pos/test
touch pos/data/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add pos/package.json pos/data/.gitkeep .gitignore
git commit -m "pos: プロジェクトscaffoldingを追加"
```

---

## Task 2: メニュー定義（menu.js）

**Files:**
- Create: `pos/server/menu.js`
- Test: `pos/test/menu.test.js`

**Interfaces:**
- Produces:
  - `MENU: { hotdog: { name, price }, cheese_hotdog: { name, price } }`
  - `priceOf(product: string): number` — 未知の商品名なら例外
  - `defaultToppings(): { ketchup: 'normal', mustard: 'normal', mayo: 'normal' }`

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/menu.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { MENU, priceOf, defaultToppings } = require('../server/menu');

test('MENU にホットドッグとチーズホットドッグの価格が定義されている', () => {
  assert.equal(MENU.hotdog.price, 200);
  assert.equal(MENU.cheese_hotdog.price, 300);
});

test('priceOf は商品の価格を返す', () => {
  assert.equal(priceOf('hotdog'), 200);
  assert.equal(priceOf('cheese_hotdog'), 300);
});

test('priceOf は未知の商品名で例外を投げる', () => {
  assert.throws(() => priceOf('yakisoba'), /unknown product/);
});

test('defaultToppings はケチャップ・マスタード・マヨネーズすべて normal を返す', () => {
  assert.deepEqual(defaultToppings(), {
    ketchup: 'normal',
    mustard: 'normal',
    mayo: 'normal',
  });
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/menu.test.js`
Expected: FAIL（`Cannot find module '../server/menu'`）

- [ ] **Step 3: 実装を書く**

`pos/server/menu.js`:
```js
const MENU = {
  hotdog: { name: 'ホットドッグ', price: 200 },
  cheese_hotdog: { name: 'チーズホットドッグ', price: 300 },
};

const TOPPING_LEVELS = ['none', 'normal', 'extra'];

function priceOf(product) {
  if (!MENU[product]) {
    throw new Error(`unknown product: ${product}`);
  }
  return MENU[product].price;
}

function defaultToppings() {
  return { ketchup: 'normal', mustard: 'normal', mayo: 'normal' };
}

module.exports = { MENU, TOPPING_LEVELS, priceOf, defaultToppings };
```

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/menu.test.js`
Expected: PASS（4 tests, 0 failures）

- [ ] **Step 5: Commit**

```bash
git add pos/server/menu.js pos/test/menu.test.js
git commit -m "pos: メニュー定義モジュールを追加"
```

---

## Task 3: OrderStore — カート操作

**Files:**
- Create: `pos/server/orderStore.js`
- Test: `pos/test/orderStore.cart.test.js`

**Interfaces:**
- Consumes: `priceOf` from `pos/server/menu.js`
- Produces:
  - `class OrderStore` constructor `({ now = () => new Date(), initialState = null } = {})`
  - `store.getDay(): string` — `"YYYY-MM-DD"`（ローカル時刻基準）
  - `store.getCart(): { items: Array<{product, toppings}>, received: number, total: number, change: number }`
  - `store.addItem(product: string, toppings: object): cart`
  - `store.removeItem(index: number): cart`
  - `store.updateItemToppings(index: number, toppings: object): cart`
  - `store.setReceived(amount: number): cart`
  - `store.clearCart(): cart`

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/orderStore.cart.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderStore } = require('../server/orderStore');

function makeStore(now = () => new Date('2026-10-16T10:00:00+09:00')) {
  return new OrderStore({ now });
}

test('getDay はローカル日付を YYYY-MM-DD 形式で返す', () => {
  const store = makeStore(() => new Date('2026-10-16T23:59:00+09:00'));
  assert.equal(store.getDay(), '2026-10-16');
});

test('addItem でカートに商品が追加され合計金額が計算される', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.addItem('cheese_hotdog', { ketchup: 'extra', mustard: 'none', mayo: 'normal' });
  const cart = store.getCart();
  assert.equal(cart.items.length, 2);
  assert.equal(cart.total, 500);
});

test('removeItem で指定インデックスの商品が削除される', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.removeItem(0);
  const cart = store.getCart();
  assert.equal(cart.items.length, 1);
  assert.equal(cart.total, 200);
});

test('removeItem は範囲外のインデックスで例外を投げる', () => {
  const store = makeStore();
  assert.throws(() => store.removeItem(0), /invalid item index/);
});

test('updateItemToppings で指定した商品のトッピングだけが変わる', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.updateItemToppings(0, { ketchup: 'extra', mustard: 'normal', mayo: 'none' });
  const cart = store.getCart();
  assert.deepEqual(cart.items[0].toppings, { ketchup: 'extra', mustard: 'normal', mayo: 'none' });
});

test('setReceived と getCart でおつりが計算される', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(500);
  const cart = store.getCart();
  assert.equal(cart.total, 200);
  assert.equal(cart.received, 500);
  assert.equal(cart.change, 300);
});

test('clearCart でカートが空になる', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(500);
  store.clearCart();
  const cart = store.getCart();
  assert.equal(cart.items.length, 0);
  assert.equal(cart.received, 0);
  assert.equal(cart.total, 0);
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/orderStore.cart.test.js`
Expected: FAIL（`Cannot find module '../server/orderStore'`）

- [ ] **Step 3: 実装を書く**

`pos/server/orderStore.js`:
```js
const { priceOf } = require('./menu');

function formatDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const ACTIVE_STATUSES = ['paid', 'cooking', 'ready'];

class OrderStore {
  constructor({ now = () => new Date(), initialState = null } = {}) {
    this.now = now;
    this.ordersByDay = (initialState && initialState.ordersByDay) || {};
    this.cart = (initialState && initialState.cart) || this._emptyCart();
  }

  _emptyCart() {
    return { items: [], received: 0 };
  }

  getDay() {
    return formatDay(this.now());
  }

  _cartTotal() {
    return this.cart.items.reduce((sum, item) => sum + priceOf(item.product), 0);
  }

  getCart() {
    const total = this._cartTotal();
    return {
      items: this.cart.items,
      received: this.cart.received,
      total,
      change: this.cart.received - total,
    };
  }

  addItem(product, toppings) {
    priceOf(product);
    this.cart.items.push({ product, toppings });
    return this.getCart();
  }

  removeItem(index) {
    if (index < 0 || index >= this.cart.items.length) {
      throw new Error(`invalid item index: ${index}`);
    }
    this.cart.items.splice(index, 1);
    return this.getCart();
  }

  updateItemToppings(index, toppings) {
    if (index < 0 || index >= this.cart.items.length) {
      throw new Error(`invalid item index: ${index}`);
    }
    this.cart.items[index].toppings = toppings;
    return this.getCart();
  }

  setReceived(amount) {
    this.cart.received = amount;
    return this.getCart();
  }

  clearCart() {
    this.cart = this._emptyCart();
    return this.getCart();
  }
}

module.exports = { OrderStore, formatDay, ACTIVE_STATUSES };
```

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/orderStore.cart.test.js`
Expected: PASS（7 tests, 0 failures）

- [ ] **Step 5: Commit**

```bash
git add pos/server/orderStore.js pos/test/orderStore.cart.test.js
git commit -m "pos: OrderStoreのカート操作を追加"
```

---

## Task 4: OrderStore — 会計・採番ルール

**Files:**
- Modify: `pos/server/orderStore.js`
- Test: `pos/test/orderStore.checkout.test.js`

**Interfaces:**
- Consumes: Task 3 の `OrderStore`、`ACTIVE_STATUSES`
- Produces:
  - `store.checkout(): Order` — カートが空、または預かり金不足なら例外
  - `store.getOrders(day: string): Order[]`
  - `Order` の形は仕様書のデータモデルに準拠（`id, day, items, total, received, change, status, createdAt, paidAt, readyAt, handedAt`）

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/orderStore.checkout.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderStore } = require('../server/orderStore');

function makeStore(now = () => new Date('2026-10-16T10:00:00+09:00')) {
  return new OrderStore({ now });
}

test('checkout はカートが空だと例外を投げる', () => {
  const store = makeStore();
  assert.throws(() => store.checkout(), /cart is empty/);
});

test('checkout は預かり金が不足していると例外を投げる', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(100);
  assert.throws(() => store.checkout(), /received amount is less than total/);
});

test('checkout で当日1件目は番号1が発行され、カートが空になる', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const order = store.checkout();
  assert.equal(order.id, 1);
  assert.equal(order.day, '2026-10-16');
  assert.equal(order.status, 'paid');
  assert.equal(order.total, 200);
  assert.equal(order.change, 0);
  assert.equal(store.getCart().items.length, 0);
});

test('checkout は未受渡注文があれば番号が加算される', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const first = store.checkout();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const second = store.checkout();
  assert.equal(first.id, 1);
  assert.equal(second.id, 2);
});

test('getOrders は指定日の注文一覧を返す', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  store.checkout();
  const orders = store.getOrders('2026-10-16');
  assert.equal(orders.length, 1);
  assert.equal(orders[0].id, 1);
});

test('日付が変わると番号は1から再スタートする（前日の未受渡注文と独立）', () => {
  let current = new Date('2026-10-16T10:00:00+09:00');
  const store = new OrderStore({ now: () => current });
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const day1Order = store.checkout(); // day1, id 1, status paid（未受渡のまま）

  current = new Date('2026-10-17T09:00:00+09:00');
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const day2Order = store.checkout();

  assert.equal(day1Order.day, '2026-10-16');
  assert.equal(day2Order.day, '2026-10-17');
  assert.equal(day2Order.id, 1);
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/orderStore.checkout.test.js`
Expected: FAIL（`store.checkout is not a function`）

- [ ] **Step 3: 実装を追加**

`pos/server/orderStore.js` の `class OrderStore` 内、`clearCart()` の後に追加:
```js
  _nextOrderId(day) {
    const orders = this.ordersByDay[day] || [];
    const hasActive = orders.some((o) => ACTIVE_STATUSES.includes(o.status));
    if (!hasActive) return 1;
    const maxId = orders.reduce((max, o) => Math.max(max, o.id), 0);
    return maxId + 1;
  }

  checkout() {
    if (this.cart.items.length === 0) {
      throw new Error('cart is empty');
    }
    const total = this._cartTotal();
    if (this.cart.received < total) {
      throw new Error('received amount is less than total');
    }
    const day = this.getDay();
    const id = this._nextOrderId(day);
    const nowIso = this.now().toISOString();
    const order = {
      id,
      day,
      items: this.cart.items,
      total,
      received: this.cart.received,
      change: this.cart.received - total,
      status: 'paid',
      createdAt: nowIso,
      paidAt: nowIso,
      readyAt: null,
      handedAt: null,
    };
    if (!this.ordersByDay[day]) this.ordersByDay[day] = [];
    this.ordersByDay[day].push(order);
    this.clearCart();
    return order;
  }

  getOrders(day) {
    return this.ordersByDay[day] || [];
  }
```

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/orderStore.checkout.test.js`
Expected: PASS（6 tests, 0 failures）

- [ ] **Step 5: Commit**

```bash
git add pos/server/orderStore.js pos/test/orderStore.checkout.test.js
git commit -m "pos: OrderStoreの会計・日別採番ルールを追加"
```

---

## Task 5: OrderStore — 状態遷移（取消・調理完了・受渡済）

**Files:**
- Modify: `pos/server/orderStore.js`
- Test: `pos/test/orderStore.transitions.test.js`

**Interfaces:**
- Consumes: Task 4 の `store.checkout()`, `store.getOrders()`
- Produces:
  - `store.cancelOrder(day: string, id: number): Order` — `paid`/`cooking`/`ready` 以外からは例外
  - `store.markReady(day: string, id: number): Order` — `paid`/`cooking` 以外からは例外
  - `store.markHanded(day: string, id: number): Order` — `ready` 以外からは例外

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/orderStore.transitions.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderStore } = require('../server/orderStore');

function checkedOutStore(now = () => new Date('2026-10-16T10:00:00+09:00')) {
  const store = new OrderStore({ now });
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const order = store.checkout();
  return { store, order };
}

test('markReady は paid から ready に遷移し readyAt を記録する', () => {
  const { store, order } = checkedOutStore();
  const updated = store.markReady(order.day, order.id);
  assert.equal(updated.status, 'ready');
  assert.ok(updated.readyAt);
});

test('markHanded は ready から handed に遷移し handedAt を記録する', () => {
  const { store, order } = checkedOutStore();
  store.markReady(order.day, order.id);
  const updated = store.markHanded(order.day, order.id);
  assert.equal(updated.status, 'handed');
  assert.ok(updated.handedAt);
});

test('markHanded は ready 以外の状態からは例外を投げる', () => {
  const { store, order } = checkedOutStore();
  assert.throws(() => store.markHanded(order.day, order.id), /cannot mark handed from status: paid/);
});

test('cancelOrder は paid/cooking/ready から cancelled に遷移する', () => {
  const { store, order } = checkedOutStore();
  const updated = store.cancelOrder(order.day, order.id);
  assert.equal(updated.status, 'cancelled');
});

test('cancelOrder は handed になった注文には使えない', () => {
  const { store, order } = checkedOutStore();
  store.markReady(order.day, order.id);
  store.markHanded(order.day, order.id);
  assert.throws(() => store.cancelOrder(order.day, order.id), /cannot cancel order in status: handed/);
});

test('存在しない注文番号を指定すると例外を投げる', () => {
  const { store, order } = checkedOutStore();
  assert.throws(() => store.markReady(order.day, 999), /order not found/);
});

test('キャンセルされた注文が捌けきった扱いになり、次の新規注文の番号が1に戻る', () => {
  const { store, order } = checkedOutStore();
  store.cancelOrder(order.day, order.id);
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const next = store.checkout();
  assert.equal(next.id, 1);
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/orderStore.transitions.test.js`
Expected: FAIL（`store.markReady is not a function`）

- [ ] **Step 3: 実装を追加**

`pos/server/orderStore.js` の `class OrderStore` 内、`getOrders(day)` の後に追加:
```js
  _findOrder(day, id) {
    const orders = this.ordersByDay[day] || [];
    const order = orders.find((o) => o.id === id);
    if (!order) {
      throw new Error(`order not found: ${day} #${id}`);
    }
    return order;
  }

  cancelOrder(day, id) {
    const order = this._findOrder(day, id);
    if (!ACTIVE_STATUSES.includes(order.status)) {
      throw new Error(`cannot cancel order in status: ${order.status}`);
    }
    order.status = 'cancelled';
    return order;
  }

  markReady(day, id) {
    const order = this._findOrder(day, id);
    if (order.status !== 'paid' && order.status !== 'cooking') {
      throw new Error(`cannot mark ready from status: ${order.status}`);
    }
    order.status = 'ready';
    order.readyAt = this.now().toISOString();
    return order;
  }

  markHanded(day, id) {
    const order = this._findOrder(day, id);
    if (order.status !== 'ready') {
      throw new Error(`cannot mark handed from status: ${order.status}`);
    }
    order.status = 'handed';
    order.handedAt = this.now().toISOString();
    return order;
  }

  toJSON() {
    return { ordersByDay: this.ordersByDay, cart: this.cart };
  }
```

最後に `module.exports` を更新:
```js
module.exports = { OrderStore, formatDay, ACTIVE_STATUSES };
```
（既存のままで変更不要なことを確認する）

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/orderStore.transitions.test.js`
Expected: PASS（7 tests, 0 failures）

全 OrderStore テストをまとめて実行して確認:
Run: `cd pos && node --test test/orderStore.cart.test.js test/orderStore.checkout.test.js test/orderStore.transitions.test.js`
Expected: PASS（20 tests, 0 failures）

- [ ] **Step 5: Commit**

```bash
git add pos/server/orderStore.js pos/test/orderStore.transitions.test.js
git commit -m "pos: OrderStoreの状態遷移（取消・調理完了・受渡済）を追加"
```

---

## Task 6: 永続化（persistence.js）

**Files:**
- Create: `pos/server/persistence.js`
- Test: `pos/test/persistence.test.js`

**Interfaces:**
- Produces:
  - `saveSnapshot(filePath: string, data: object): void` — 一時ファイル書き込み＋rename によるアトミック保存
  - `loadSnapshot(filePath: string): object | null` — ファイルが存在しなければ `null`

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/persistence.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { saveSnapshot, loadSnapshot } = require('../server/persistence');

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pos-test-')), 'state.json');
}

test('存在しないファイルの loadSnapshot は null を返す', () => {
  const file = tempFile();
  assert.equal(loadSnapshot(file), null);
});

test('saveSnapshot で保存した内容を loadSnapshot で復元できる', () => {
  const file = tempFile();
  const data = { ordersByDay: { '2026-10-16': [{ id: 1, status: 'paid' }] }, cart: { items: [], received: 0 } };
  saveSnapshot(file, data);
  assert.deepEqual(loadSnapshot(file), data);
});

test('saveSnapshot は保存後に一時ファイルを残さない', () => {
  const file = tempFile();
  saveSnapshot(file, { ordersByDay: {}, cart: { items: [], received: 0 } });
  assert.equal(fs.existsSync(`${file}.tmp`), false);
  assert.equal(fs.existsSync(file), true);
});

test('saveSnapshot は上書き保存できる', () => {
  const file = tempFile();
  saveSnapshot(file, { ordersByDay: {}, cart: { items: [], received: 0 } });
  saveSnapshot(file, { ordersByDay: { '2026-10-16': [] }, cart: { items: [], received: 0 } });
  const loaded = loadSnapshot(file);
  assert.deepEqual(loaded.ordersByDay, { '2026-10-16': [] });
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/persistence.test.js`
Expected: FAIL（`Cannot find module '../server/persistence'`）

- [ ] **Step 3: 実装を書く**

`pos/server/persistence.js`:
```js
const fs = require('node:fs');
const path = require('node:path');

function saveSnapshot(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function loadSnapshot(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

module.exports = { saveSnapshot, loadSnapshot };
```

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/persistence.test.js`
Expected: PASS（4 tests, 0 failures）

- [ ] **Step 5: Commit**

```bash
git add pos/server/persistence.js pos/test/persistence.test.js
git commit -m "pos: JSONスナップショットのアトミック永続化を追加"
```

---

## Task 7: 売上集計（salesStats.js）

**Files:**
- Create: `pos/server/salesStats.js`
- Test: `pos/test/salesStats.test.js`

**Interfaces:**
- Consumes: `Order` 形（Task 4 で定義）
- Produces:
  - `computeSalesStats(orders: Order[]): { totalRevenue: number, totalItems: number, byHour: Array<{hour, count, revenue}>, history: Array<{id, itemCount, total, status, paidAt}> }`
  - `cancelled` および `cart` 状態の注文は集計から除外する

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/salesStats.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeSalesStats } = require('../server/salesStats');

function order(overrides) {
  return {
    id: 1,
    day: '2026-10-16',
    items: [{ product: 'hotdog', toppings: {} }],
    total: 200,
    received: 200,
    change: 0,
    status: 'paid',
    createdAt: '2026-10-16T01:00:00.000Z',
    paidAt: '2026-10-16T01:00:00.000Z',
    readyAt: null,
    handedAt: null,
    ...overrides,
  };
}

test('累計売上額と本数を集計する', () => {
  const orders = [
    order({ id: 1, total: 200, items: [{ product: 'hotdog', toppings: {} }] }),
    order({ id: 2, total: 300, items: [{ product: 'cheese_hotdog', toppings: {} }] }),
  ];
  const stats = computeSalesStats(orders);
  assert.equal(stats.totalRevenue, 500);
  assert.equal(stats.totalItems, 2);
});

test('キャンセル済みの注文は集計から除外される', () => {
  const orders = [
    order({ id: 1, total: 200, status: 'paid' }),
    order({ id: 2, total: 300, status: 'cancelled' }),
  ];
  const stats = computeSalesStats(orders);
  assert.equal(stats.totalRevenue, 200);
  assert.equal(stats.totalItems, 1);
});

test('時間帯別に集計される', () => {
  const orders = [
    order({ id: 1, total: 200, paidAt: '2026-10-16T01:00:00.000Z' }), // JST 10時
    order({ id: 2, total: 200, paidAt: '2026-10-16T01:30:00.000Z' }), // JST 10時
    order({ id: 3, total: 300, paidAt: '2026-10-16T02:00:00.000Z' }), // JST 11時
  ];
  const stats = computeSalesStats(orders);
  const hours = stats.byHour.map((h) => h.hour);
  assert.deepEqual(hours, [...hours].sort((a, b) => a - b));
  const totalCount = stats.byHour.reduce((sum, h) => sum + h.count, 0);
  assert.equal(totalCount, 3);
});

test('注文履歴を古い順に返す', () => {
  const orders = [
    order({ id: 2, paidAt: '2026-10-16T02:00:00.000Z' }),
    order({ id: 1, paidAt: '2026-10-16T01:00:00.000Z' }),
  ];
  const stats = computeSalesStats(orders);
  assert.deepEqual(stats.history.map((h) => h.id), [1, 2]);
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/salesStats.test.js`
Expected: FAIL（`Cannot find module '../server/salesStats'`）

- [ ] **Step 3: 実装を書く**

`pos/server/salesStats.js`:
```js
function computeSalesStats(orders) {
  const counted = orders.filter((o) => o.status !== 'cart' && o.status !== 'cancelled');

  let totalRevenue = 0;
  let totalItems = 0;
  const byHour = {};
  const history = [];

  for (const order of counted) {
    totalRevenue += order.total;
    totalItems += order.items.length;

    const hour = new Date(order.paidAt).getHours();
    if (!byHour[hour]) {
      byHour[hour] = { hour, count: 0, revenue: 0 };
    }
    byHour[hour].count += order.items.length;
    byHour[hour].revenue += order.total;

    history.push({
      id: order.id,
      itemCount: order.items.length,
      total: order.total,
      status: order.status,
      paidAt: order.paidAt,
    });
  }

  return {
    totalRevenue,
    totalItems,
    byHour: Object.values(byHour).sort((a, b) => a.hour - b.hour),
    history: history.sort((a, b) => new Date(a.paidAt) - new Date(b.paidAt)),
  };
}

module.exports = { computeSalesStats };
```

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/salesStats.test.js`
Expected: PASS（4 tests, 0 failures）

- [ ] **Step 5: Commit**

```bash
git add pos/server/salesStats.js pos/test/salesStats.test.js
git commit -m "pos: 売上集計モジュールを追加"
```

---

## Task 8: サーバー本体（Express + Socket.io）

**Files:**
- Create: `pos/server/index.js`
- Test: `pos/test/server.integration.test.js`

**Interfaces:**
- Consumes: `OrderStore`（Task 3-5）, `saveSnapshot`/`loadSnapshot`（Task 6）, `computeSalesStats`（Task 7）
- Produces:
  - `buildServer({ dataFile, now }): { app, httpServer, io, store, persist, close }`
  - Socket.io イベント:
    - サーバー→クライアント: `state` イベントで `{ day, cart, orders, stats }` を送信
    - クライアント→サーバー: `cart:addItem`, `cart:removeItem`, `cart:updateItemToppings`, `cart:setReceived`, `cart:clear`（いずれも成功時 `state` をブロードキャスト）
    - クライアント→サーバー（callback付き）: `order:checkout`, `order:cancel`, `order:ready`, `order:handed` — `callback({ ok: true, ... })` または `callback({ ok: false, error })`

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/server.integration.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { io: ioClient } = require('socket.io-client');
const { buildServer } = require('../server/index');

function tempDataFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pos-server-test-')), 'state.json');
}

function waitForState(socket) {
  return new Promise((resolve) => socket.once('state', resolve));
}

// サーバーは接続直後に 'state' を1回だけpushする（バッファされない）。
// 'connect' 完了後に waitForState を別途呼ぶと、'connect' と 'state' の間の
// 一瞬の隙間でイベントを取りこぼすレースが起きる（ローカルhostでは高確率で再現）。
// ソケット生成と同じ同期ブロックでリスナーを登録することで確実に受信する。
function connectAndWaitForState(port) {
  return new Promise((resolve) => {
    const socket = ioClient(`http://localhost:${port}`, { transports: ['websocket'] });
    socket.once('state', (state) => resolve({ socket, state }));
  });
}

test('接続すると初期stateを受信する', async () => {
  const { httpServer, close } = buildServer({ dataFile: tempDataFile() });
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;

  const { socket: client, state } = await connectAndWaitForState(port);
  assert.equal(state.cart.items.length, 0);
  assert.equal(Array.isArray(state.orders), true);

  client.close();
  close();
});

test('会計するとchecktoutが番号1を返し、全クライアントにブロードキャストされる', async () => {
  const { httpServer, close } = buildServer({
    dataFile: tempDataFile(),
    now: () => new Date('2026-10-16T10:00:00+09:00'),
  });
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;

  const { socket: posClient } = await connectAndWaitForState(port);
  const { socket: kitchenClient } = await connectAndWaitForState(port);

  posClient.emit('cart:addItem', { product: 'hotdog', toppings: { ketchup: 'normal', mustard: 'normal', mayo: 'normal' } });
  await waitForState(kitchenClient);

  posClient.emit('cart:setReceived', { amount: 200 });
  await waitForState(kitchenClient);

  const kitchenUpdate = waitForState(kitchenClient);
  const result = await new Promise((resolve) => {
    posClient.emit('order:checkout', {}, resolve);
  });
  assert.equal(result.ok, true);
  assert.equal(result.order.id, 1);

  const broadcasted = await kitchenUpdate;
  assert.equal(broadcasted.orders.length, 1);
  assert.equal(broadcasted.orders[0].status, 'paid');

  posClient.close();
  kitchenClient.close();
  close();
});

test('預かり金不足でチェックアウトすると ok:false が返る', async () => {
  const { httpServer, close } = buildServer({ dataFile: tempDataFile() });
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;

  const { socket: client } = await connectAndWaitForState(port);
  client.emit('cart:addItem', { product: 'hotdog', toppings: { ketchup: 'normal', mustard: 'normal', mayo: 'normal' } });
  await waitForState(client);

  const result = await new Promise((resolve) => {
    client.emit('order:checkout', {}, resolve);
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /received amount is less than total/);

  client.close();
  close();
});

test('調理完了→受渡済のフローが全クライアントに反映される', async () => {
  const { httpServer, close } = buildServer({
    dataFile: tempDataFile(),
    now: () => new Date('2026-10-16T10:00:00+09:00'),
  });
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;

  const { socket: posClient } = await connectAndWaitForState(port);
  const { socket: smartboardClient } = await connectAndWaitForState(port);

  posClient.emit('cart:addItem', { product: 'hotdog', toppings: { ketchup: 'normal', mustard: 'normal', mayo: 'normal' } });
  await waitForState(smartboardClient);
  posClient.emit('cart:setReceived', { amount: 200 });
  await waitForState(smartboardClient);

  const afterCheckout = waitForState(smartboardClient);
  await new Promise((resolve) => posClient.emit('order:checkout', {}, resolve));
  await afterCheckout;

  const afterReady = waitForState(smartboardClient);
  const readyResult = await new Promise((resolve) => posClient.emit('order:ready', { day: '2026-10-16', id: 1 }, resolve));
  assert.equal(readyResult.ok, true);
  const readyState = await afterReady;
  assert.equal(readyState.orders[0].status, 'ready');

  const afterHanded = waitForState(smartboardClient);
  const handedResult = await new Promise((resolve) => posClient.emit('order:handed', { day: '2026-10-16', id: 1 }, resolve));
  assert.equal(handedResult.ok, true);
  const handedState = await afterHanded;
  assert.equal(handedState.orders[0].status, 'handed');

  posClient.close();
  smartboardClient.close();
  close();
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/server.integration.test.js`
Expected: FAIL（`Cannot find module '../server/index'`）

- [ ] **Step 3: 実装を書く**

`pos/server/index.js`:
```js
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const { OrderStore } = require('./orderStore');
const { saveSnapshot, loadSnapshot } = require('./persistence');
const { computeSalesStats } = require('./salesStats');

const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'state.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PERSIST_INTERVAL_MS = 15000;

function buildServer({ dataFile = DEFAULT_DATA_FILE, now = () => new Date() } = {}) {
  const initialState = loadSnapshot(dataFile);
  const store = new OrderStore({ now, initialState });

  const app = express();
  app.use('/pos', express.static(path.join(PUBLIC_DIR, 'pos')));
  app.use('/customer', express.static(path.join(PUBLIC_DIR, 'customer')));
  app.use('/kitchen', express.static(path.join(PUBLIC_DIR, 'kitchen')));
  app.use('/smartboard', express.static(path.join(PUBLIC_DIR, 'smartboard')));
  app.use('/shared', express.static(path.join(PUBLIC_DIR, 'shared')));

  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  function currentState() {
    const day = store.getDay();
    const orders = store.getOrders(day);
    return {
      day,
      cart: store.getCart(),
      orders,
      stats: computeSalesStats(orders),
    };
  }

  function broadcastState() {
    io.emit('state', currentState());
  }

  function persist() {
    saveSnapshot(dataFile, store.toJSON());
  }

  function handleMutation(socket, event, fn) {
    socket.on(event, (payload, callback) => {
      try {
        const result = fn(payload || {});
        persist();
        broadcastState();
        if (callback) callback({ ok: true, order: result });
      } catch (err) {
        if (callback) callback({ ok: false, error: err.message });
      }
    });
  }

  io.on('connection', (socket) => {
    socket.emit('state', currentState());

    socket.on('cart:addItem', ({ product, toppings }) => {
      store.addItem(product, toppings);
      broadcastState();
    });

    socket.on('cart:removeItem', ({ index }) => {
      store.removeItem(index);
      broadcastState();
    });

    socket.on('cart:updateItemToppings', ({ index, toppings }) => {
      store.updateItemToppings(index, toppings);
      broadcastState();
    });

    socket.on('cart:setReceived', ({ amount }) => {
      store.setReceived(amount);
      broadcastState();
    });

    socket.on('cart:clear', () => {
      store.clearCart();
      broadcastState();
    });

    handleMutation(socket, 'order:checkout', () => store.checkout());
    handleMutation(socket, 'order:cancel', ({ day, id }) => store.cancelOrder(day, id));
    handleMutation(socket, 'order:ready', ({ day, id }) => store.markReady(day, id));
    handleMutation(socket, 'order:handed', ({ day, id }) => store.markHanded(day, id));
  });

  const persistInterval = setInterval(persist, PERSIST_INTERVAL_MS);

  function close() {
    clearInterval(persistInterval);
    io.close();
    httpServer.close();
  }

  return { app, httpServer, io, store, persist, close };
}

if (require.main === module) {
  const PORT = process.env.POS_PORT || 3000;
  const { httpServer } = buildServer();
  httpServer.listen(PORT, () => {
    console.log(`POS server listening on port ${PORT}`);
  });
}

module.exports = { buildServer };
```

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/server.integration.test.js`
Expected: PASS（4 tests, 0 failures）

全テストをまとめて実行して確認:
Run: `cd pos && npm test`
Expected: PASS（全テストグリーン）

- [ ] **Step 5: Commit**

```bash
git add pos/server/index.js pos/test/server.integration.test.js
git commit -m "pos: Express+Socket.ioサーバー本体を追加"
```

---

## Task 9: 共通スタイル（base.css）

**Files:**
- Create: `pos/public/shared/base.css`

**Interfaces:**
- Produces: `pos/public/shared/base.css` — 各画面から `<link rel="stylesheet" href="/shared/base.css">` で読み込む

- [ ] **Step 1: 共通CSSを書く**

`pos/public/shared/base.css`:
```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Hiragino Sans", "Yu Gothic", sans-serif;
  background: #fafafa;
  color: #222;
}

.offline-banner {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #d32f2f;
  color: #fff;
  text-align: center;
  padding: 8px;
  font-size: 18px;
  z-index: 100;
}

.offline-banner.visible {
  display: block;
}

button {
  font-size: 18px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #999;
  background: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

- [ ] **Step 2: ブラウザで確認**

`pos` サーバー起動前のため、このタスク単体では動作確認できない。Task 10 でPOS画面から読み込んで確認する。

- [ ] **Step 3: Commit**

```bash
git add pos/public/shared/base.css
git commit -m "pos: 共通スタイルを追加"
```

---

## Task 10: POS画面

**Files:**
- Create: `pos/public/pos/index.html`
- Create: `pos/public/pos/pos.js`

**Interfaces:**
- Consumes: サーバーの `state` イベント、`cart:*` / `order:*` イベント（Task 8で定義）
- Produces: `http://<server>/pos/` で開けるレジ画面

- [ ] **Step 1: HTMLを書く**

`pos/public/pos/index.html`:
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>POS - おいしいホットドック屋さん</title>
<link rel="stylesheet" href="/shared/base.css">
<style>
  .layout { display: flex; height: 100vh; }
  .cart-panel { flex: 2; padding: 16px; overflow-y: auto; }
  .orders-panel { flex: 1; padding: 16px; border-left: 2px solid #ddd; overflow-y: auto; }
  .menu-buttons button { margin: 4px; font-size: 22px; }
  .cart-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid #eee; }
  .toppings label { margin-right: 8px; font-size: 14px; }
  .total-row { font-size: 28px; margin: 16px 0; }
  .checkout-row input { font-size: 22px; width: 120px; }
  .order-row { padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
  .tab-buttons button.active { background: #1976d2; color: #fff; }
</style>
</head>
<body>
<div class="offline-banner" id="offlineBanner">オフライン - 再接続中...</div>

<div class="layout">
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
      おつり: <span id="change">0</span>円
      <button id="checkoutBtn" disabled>会計確定</button>
    </div>
  </div>

  <div class="orders-panel">
    <div class="tab-buttons">
      <button id="tabActive" class="active">受渡待ち</button>
      <button id="tabSales">売上</button>
    </div>
    <div id="activeView">
      <h2>未受渡の注文</h2>
      <div id="activeOrders"></div>
    </div>
    <div id="salesView" style="display:none;">
      <h2>本日の売上</h2>
      <p>累計売上額: <span id="totalRevenue">0</span>円</p>
      <p>販売本数: <span id="totalItems">0</span>本</p>
      <h3>時間帯別</h3>
      <div id="byHour"></div>
      <h3>注文履歴</h3>
      <div id="history"></div>
    </div>
  </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script src="pos.js"></script>
</body>
</html>
```

- [ ] **Step 2: JSを書く**

`pos/public/pos/pos.js`:
```js
const socket = io();
const offlineBanner = document.getElementById('offlineBanner');
socket.on('connect', () => offlineBanner.classList.remove('visible'));
socket.on('disconnect', () => offlineBanner.classList.add('visible'));

const TOPPING_KEYS = ['ketchup', 'mustard', 'mayo'];
const TOPPING_LABELS = { ketchup: 'ケチャップ', mustard: 'マスタード', mayo: 'マヨネーズ' };
const LEVEL_LABELS = { none: 'なし', normal: '普通', extra: '多め' };

function defaultToppings() {
  return { ketchup: 'normal', mustard: 'normal', mayo: 'normal' };
}

let latestState = null;

document.getElementById('addHotdog').addEventListener('click', () => {
  socket.emit('cart:addItem', { product: 'hotdog', toppings: defaultToppings() });
});

document.getElementById('addCheeseHotdog').addEventListener('click', () => {
  socket.emit('cart:addItem', { product: 'cheese_hotdog', toppings: defaultToppings() });
});

document.getElementById('received').addEventListener('input', (e) => {
  socket.emit('cart:setReceived', { amount: Number(e.target.value) || 0 });
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
  socket.emit('order:checkout', {}, (result) => {
    if (!result.ok) {
      alert(`会計できません: ${result.error}`);
    }
  });
});

document.getElementById('tabActive').addEventListener('click', () => switchTab('active'));
document.getElementById('tabSales').addEventListener('click', () => switchTab('sales'));

function switchTab(tab) {
  document.getElementById('activeView').style.display = tab === 'active' ? 'block' : 'none';
  document.getElementById('salesView').style.display = tab === 'sales' ? 'block' : 'none';
  document.getElementById('tabActive').classList.toggle('active', tab === 'active');
  document.getElementById('tabSales').classList.toggle('active', tab === 'sales');
}

function productLabel(product) {
  return product === 'cheese_hotdog' ? 'チーズホットドッグ' : 'ホットドッグ';
}

function toppingsSummary(toppings) {
  return TOPPING_KEYS.map((key) => `${TOPPING_LABELS[key]}:${LEVEL_LABELS[toppings[key]]}`).join(' / ');
}

function renderCart(cart) {
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  cart.items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cart-item';

    const label = document.createElement('span');
    label.textContent = productLabel(item.product);
    row.appendChild(label);

    TOPPING_KEYS.forEach((key) => {
      const select = document.createElement('select');
      ['none', 'normal', 'extra'].forEach((level) => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = `${TOPPING_LABELS[key]}:${LEVEL_LABELS[level]}`;
        if (item.toppings[key] === level) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        const newToppings = { ...item.toppings, [key]: select.value };
        socket.emit('cart:updateItemToppings', { index, toppings: newToppings });
      });
      row.appendChild(select);
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '削除';
    removeBtn.addEventListener('click', () => socket.emit('cart:removeItem', { index }));
    row.appendChild(removeBtn);

    container.appendChild(row);
  });

  document.getElementById('total').textContent = cart.total;
  document.getElementById('change').textContent = Math.max(cart.change, 0);
  document.getElementById('checkoutBtn').disabled = cart.items.length === 0 || cart.received < cart.total;
}

function renderActiveOrders(orders) {
  const container = document.getElementById('activeOrders');
  container.innerHTML = '';
  orders.filter((o) => ['paid', 'cooking', 'ready'].includes(o.status)).forEach((order) => {
    const row = document.createElement('div');
    row.className = 'order-row';

    const info = document.createElement('span');
    info.textContent = `#${order.id} (${order.status}) ${order.items.length}本 - ${toppingsSummary(order.items[0]?.toppings || defaultToppings())}`;
    row.appendChild(info);

    const actions = document.createElement('span');

    if (order.status === 'ready') {
      const handBtn = document.createElement('button');
      handBtn.textContent = '受渡済';
      handBtn.addEventListener('click', () => socket.emit('order:handed', { day: order.day, id: order.id }));
      actions.appendChild(handBtn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => {
      if (confirm(`注文 #${order.id} を取消しますか？`)) {
        socket.emit('order:cancel', { day: order.day, id: order.id });
      }
    });
    actions.appendChild(cancelBtn);

    row.appendChild(actions);
    container.appendChild(row);
  });
}

function renderSales(stats) {
  document.getElementById('totalRevenue').textContent = stats.totalRevenue;
  document.getElementById('totalItems').textContent = stats.totalItems;

  const byHourEl = document.getElementById('byHour');
  byHourEl.innerHTML = stats.byHour.map((h) => `<div>${h.hour}時台: ${h.count}本 / ${h.revenue}円</div>`).join('');

  const historyEl = document.getElementById('history');
  historyEl.innerHTML = stats.history.map((h) => `<div>#${h.id} ${h.itemCount}本 ${h.total}円 (${h.status})</div>`).join('');
}

socket.on('state', (state) => {
  latestState = state;
  document.getElementById('received').value = state.cart.received;
  renderCart(state.cart);
  renderActiveOrders(state.orders);
  renderSales(state.stats);
});
```

- [ ] **Step 3: サーバーを起動しブラウザで確認**

Run: `cd pos && npm start`
ブラウザで `http://localhost:3000/pos/` を開く。

確認項目:
- ホットドッグ・チーズホットドッグをそれぞれ追加すると合計金額が増える
- トッピングのセレクトを変えると即座に反映される
- 削除ボタンでカートから商品が消える
- 預かり金を入力するとおつりが計算され、不足時は会計確定ボタンが無効になる
- 会計確定するとカートが空になり、「受渡待ち」に注文が表示される
- 取消ボタンで注文が消える
- 「売上」タブで累計金額・本数・時間帯別・履歴が表示される

- [ ] **Step 4: Commit**

```bash
git add pos/public/pos/index.html pos/public/pos/pos.js
git commit -m "pos: POS画面を追加"
```

---

## Task 11: 客表示画面

**Files:**
- Create: `pos/public/customer/index.html`
- Create: `pos/public/customer/customer.js`

**Interfaces:**
- Consumes: サーバーの `state` イベント（読み取り専用、送信イベントなし）

- [ ] **Step 1: HTMLを書く**

`pos/public/customer/index.html`:
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>ご注文内容</title>
<link rel="stylesheet" href="/shared/base.css">
<style>
  body { text-align: center; padding: 40px; }
  .item-line { font-size: 32px; margin: 8px 0; }
  .total-line { font-size: 56px; margin: 32px 0; font-weight: bold; }
  .money-line { font-size: 36px; margin: 8px 0; }
  .empty { font-size: 40px; color: #999; margin-top: 100px; }
</style>
</head>
<body>
<div class="offline-banner" id="offlineBanner">オフライン - 再接続中...</div>
<h1>ご注文内容</h1>
<div id="content"></div>
<script src="/socket.io/socket.io.js"></script>
<script src="customer.js"></script>
</body>
</html>
```

- [ ] **Step 2: JSを書く**

`pos/public/customer/customer.js`:
```js
const socket = io();
const offlineBanner = document.getElementById('offlineBanner');
socket.on('connect', () => offlineBanner.classList.remove('visible'));
socket.on('disconnect', () => offlineBanner.classList.add('visible'));

function productLabel(product) {
  return product === 'cheese_hotdog' ? 'チーズホットドッグ' : 'ホットドッグ';
}

socket.on('state', (state) => {
  const container = document.getElementById('content');
  const cart = state.cart;

  if (cart.items.length === 0) {
    container.innerHTML = '<div class="empty">ご注文をお待ちしております</div>';
    return;
  }

  const counts = {};
  cart.items.forEach((item) => {
    counts[item.product] = (counts[item.product] || 0) + 1;
  });

  const lines = Object.entries(counts)
    .map(([product, count]) => `<div class="item-line">${productLabel(product)} × ${count}</div>`)
    .join('');

  container.innerHTML = `
    ${lines}
    <div class="total-line">合計 ${cart.total}円</div>
    <div class="money-line">お預かり ${cart.received}円</div>
    <div class="money-line">おつり ${Math.max(cart.change, 0)}円</div>
  `;
});
```

- [ ] **Step 3: サーバーを起動しブラウザで確認**

Run: `cd pos && npm start`（既に起動していれば再利用）
別ブラウザタブで `http://localhost:3000/customer/` を開く。

確認項目:
- POS画面でカートを操作すると客表示にリアルタイムで反映される
- カートが空のときは「ご注文をお待ちしております」と表示される
- 会計確定するとカートが空に戻り、客表示も空表示に戻る

- [ ] **Step 4: Commit**

```bash
git add pos/public/customer/index.html pos/public/customer/customer.js
git commit -m "pos: 客表示画面を追加"
```

---

## Task 12: 厨房画面

**Files:**
- Create: `pos/public/kitchen/index.html`
- Create: `pos/public/kitchen/kitchen.js`

**Interfaces:**
- Consumes: サーバーの `state` イベント
- Produces: `order:ready` イベント送信

- [ ] **Step 1: HTMLを書く**

`pos/public/kitchen/index.html`:
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>厨房</title>
<link rel="stylesheet" href="/shared/base.css">
<style>
  body { padding: 24px; }
  .queue { display: flex; flex-wrap: wrap; gap: 16px; }
  .order-card { border: 2px solid #333; border-radius: 12px; padding: 16px; width: 260px; }
  .order-card h2 { margin: 0 0 8px; font-size: 40px; }
  .order-card .toppings { font-size: 16px; margin: 4px 0; }
  .order-card button { width: 100%; margin-top: 12px; font-size: 20px; }
</style>
</head>
<body>
<div class="offline-banner" id="offlineBanner">オフライン - 再接続中...</div>
<h1>厨房 - 注文キュー</h1>
<div class="queue" id="queue"></div>
<script src="/socket.io/socket.io.js"></script>
<script src="kitchen.js"></script>
</body>
</html>
```

- [ ] **Step 2: JSを書く**

`pos/public/kitchen/kitchen.js`:
```js
const socket = io();
const offlineBanner = document.getElementById('offlineBanner');
socket.on('connect', () => offlineBanner.classList.remove('visible'));
socket.on('disconnect', () => offlineBanner.classList.add('visible'));

const TOPPING_KEYS = ['ketchup', 'mustard', 'mayo'];
const TOPPING_LABELS = { ketchup: 'ケチャップ', mustard: 'マスタード', mayo: 'マヨネーズ' };
const LEVEL_LABELS = { none: 'なし', normal: '普通', extra: '多め' };

function productLabel(product) {
  return product === 'cheese_hotdog' ? 'チーズホットドッグ' : 'ホットドッグ';
}

function toppingsLine(toppings) {
  return TOPPING_KEYS.map((key) => `${TOPPING_LABELS[key]}${LEVEL_LABELS[toppings[key]]}`).join(' / ');
}

socket.on('state', (state) => {
  const container = document.getElementById('queue');
  container.innerHTML = '';

  const queueOrders = state.orders.filter((o) => o.status === 'paid' || o.status === 'cooking');

  queueOrders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-card';

    const title = document.createElement('h2');
    title.textContent = `#${order.id}`;
    card.appendChild(title);

    order.items.forEach((item, i) => {
      const line = document.createElement('div');
      line.className = 'toppings';
      line.textContent = `${i + 1}本目: ${productLabel(item.product)} - ${toppingsLine(item.toppings)}`;
      card.appendChild(line);
    });

    const readyBtn = document.createElement('button');
    readyBtn.textContent = '調理完了';
    readyBtn.addEventListener('click', () => {
      socket.emit('order:ready', { day: order.day, id: order.id });
    });
    card.appendChild(readyBtn);

    container.appendChild(card);
  });
});
```

- [ ] **Step 3: サーバーを起動しブラウザで確認**

`http://localhost:3000/kitchen/` を別タブで開く。

確認項目:
- POSで会計確定すると厨房に注文カードが表示される
- 本数分・トッピング内訳ごとに1行ずつ表示される
- 「調理完了」を押すとカードが厨房画面から消える（`ready`に遷移するため）

- [ ] **Step 4: Commit**

```bash
git add pos/public/kitchen/index.html pos/public/kitchen/kitchen.js
git commit -m "pos: 厨房画面を追加"
```

---

## Task 13: smartboard画面

**Files:**
- Create: `pos/public/smartboard/index.html`
- Create: `pos/public/smartboard/smartboard.js`

**Interfaces:**
- Consumes: サーバーの `state` イベント（読み取り専用）

- [ ] **Step 1: HTMLを書く**

`pos/public/smartboard/index.html`:
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>おいしいホットドック屋さん - 受け取り案内</title>
<link rel="stylesheet" href="/shared/base.css">
<style>
  body { padding: 0; background: #111; color: #fff; height: 100vh; }
  .columns { display: flex; height: 100vh; }
  .column { flex: 1; padding: 40px; }
  .column h1 { font-size: 48px; text-align: center; margin-bottom: 40px; }
  .waiting { color: #888; }
  .ready { color: #fff; }
  .number-grid { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; }
  .number { font-size: 96px; font-weight: bold; width: 160px; text-align: center; }
  .divider { width: 4px; background: #333; }
</style>
</head>
<body>
<div class="offline-banner" id="offlineBanner">オフライン - 再接続中...</div>
<div class="columns">
  <div class="column waiting">
    <h1>呼び出し待ち</h1>
    <div class="number-grid" id="waitingNumbers"></div>
  </div>
  <div class="divider"></div>
  <div class="column ready">
    <h1>お受け取りください</h1>
    <div class="number-grid" id="readyNumbers"></div>
  </div>
</div>
<script src="/socket.io/socket.io.js"></script>
<script src="smartboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: JSを書く**

`pos/public/smartboard/smartboard.js`:
```js
const socket = io();
const offlineBanner = document.getElementById('offlineBanner');
socket.on('connect', () => offlineBanner.classList.remove('visible'));
socket.on('disconnect', () => offlineBanner.classList.add('visible'));

function renderNumbers(elementId, orders) {
  const container = document.getElementById(elementId);
  container.innerHTML = orders.map((o) => `<div class="number">${o.id}</div>`).join('');
}

socket.on('state', (state) => {
  const waiting = state.orders.filter((o) => o.status === 'paid' || o.status === 'cooking');
  const ready = state.orders.filter((o) => o.status === 'ready');
  renderNumbers('waitingNumbers', waiting);
  renderNumbers('readyNumbers', ready);
});
```

- [ ] **Step 3: サーバーを起動しブラウザで確認**

`http://localhost:3000/smartboard/` を別タブで開く（実機ではテレビにこの画面を映す）。

確認項目:
- 会計確定すると左列（呼び出し待ち・薄い色）に番号が現れる
- 厨房で「調理完了」を押すと、その番号が左列から消え右列（お受け取りください）に現れる
- POSで「受渡済」を押すと右列から番号が消える
- 文字サイズは左右の列で同じであることを確認する

- [ ] **Step 4: Commit**

```bash
git add pos/public/smartboard/index.html pos/public/smartboard/smartboard.js
git commit -m "pos: smartboard画面を追加"
```

---

## Task 14: 通しリハーサル用README・QAチェックリスト

**Files:**
- Create: `pos/README.md`

**Interfaces:**
- Produces: 起動手順・LAN接続手順・QAチェックリストのドキュメント

- [ ] **Step 1: READMEを書く**

`pos/README.md`:
```markdown
# おいしいホットドック屋さん レジシステム

## 起動方法（サーバー役のPC）

1. `cd pos && npm install`（初回のみ）
2. `npm start`
3. コンソールに表示されるIPアドレス（例: `192.168.x.x`）を確認する
   - Windowsの場合、別ターミナルで `ipconfig` を実行し「IPv4 アドレス」を確認する

## 各画面の開き方（他3台のPC・ブラウザ）

サーバーPCと同じLAN（ポケットWi-Fi or 無線LANルーター）に接続した状態で、ブラウザで以下を開く。

- レジ: `http://<サーバーのIPアドレス>:3000/pos/`
- 客表示: `http://<サーバーのIPアドレス>:3000/customer/`
- 厨房: `http://<サーバーのIPアドレス>:3000/kitchen/`
- smartboard: `http://<サーバーのIPアドレス>:3000/smartboard/`

サーバーPC自身でレジ画面を開く場合は `http://localhost:3000/pos/` でもよい。

## テストの実行

```bash
cd pos
npm test
```

## 本番前 通しリハーサル チェックリスト

- [ ] 4台すべてが同じLANに接続され、それぞれの画面が表示される
- [ ] レジで注文→会計→番号発行が客表示・厨房に即座に反映される
- [ ] 厨房で「調理完了」を押すとsmartboardの番号が左列から右列に移動する
- [ ] レジで「受渡済」を押すとsmartboardから番号が消える
- [ ] 会計前のカート編集（追加・削除・トッピング変更）が正しく反映される
- [ ] 会計後の「取消」が厨房・smartboardにも反映される
- [ ] 複数注文を同時に受渡待ちにして、番号が混線しないか確認する
- [ ] レジの「売上」タブで累計金額・本数・時間帯別・履歴が正しく表示される
- [ ] サーバーを一度落として再起動し、直前の状態（受渡待ちの注文）が復元されることを確認する
- [ ] サーバーPCとの接続を意図的に切って「オフライン」表示が出ること、再接続で自動復帰することを確認する
- [ ] 2日目を想定し、サーバーの日付を翌日に変えて（またはPCの日付を進めて）再起動し、番号が1から始まり、初日の売上と混ざらないことを確認する
```

- [ ] **Step 2: Commit**

```bash
git add pos/README.md
git commit -m "pos: README・本番前QAチェックリストを追加"
```

---

## Self-Review メモ

- **仕様書カバレッジ**: 背景/スコープ→Task1、前提条件（現金・2日間リセット・LAN柔軟性・メニュー）→Task2,4,10、アーキテクチャ→Task8、データモデル→Task3-5、注文番号ルール→Task4、状態遷移→Task5、画面仕様（POS/客表示/厨房/smartboard）→Task10-13、障害対応・永続化→Task6,8、QA方針→Task14。すべてのセクションに対応するタスクがある。
- **プレースホルダー確認**: 各ステップのコードは完全な実装・完全なテストコードで記載済み。「後で実装」「TODO」の類は含まない。
- **型・シグネチャの一貫性**: `OrderStore` のメソッド名（`addItem`, `removeItem`, `updateItemToppings`, `setReceived`, `clearCart`, `checkout`, `getOrders`, `cancelOrder`, `markReady`, `markHanded`, `toJSON`）は Task 3〜8 を通じて一貫。Socket.ioイベント名（`cart:addItem` 等）はサーバー実装（Task 8）とフロントエンド実装（Task 10〜13）で一致させている。
