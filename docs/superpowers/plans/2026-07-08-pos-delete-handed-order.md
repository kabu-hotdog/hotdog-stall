# 売上画面：受渡済み注文の削除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** レジ画面の売上タブの注文履歴で、受渡済み（`handed`）の注文を削除（＝`cancelled`に遷移させ売上集計から除外）できるようにする。

**Architecture:** 既存の`cancelOrder()`/`order:cancel`イベント/`cancelled`除外ロジックをそのまま再利用する。バックエンドは`cancelOrder()`のガード条件拡張と`salesStats.js`の`history`に`day`フィールドを追加するだけ。フロントエンドは売上タブの注文履歴に削除ボタンを追加する。

**Tech Stack:** Node.js標準の`node:test`（バックエンド）、素のHTML/CSS/JS（フロントエンド、自動テストなし）。

参照仕様書: [docs/superpowers/specs/2026-07-08-pos-delete-handed-order-design.md](../specs/2026-07-08-pos-delete-handed-order-design.md)

## Global Constraints

- 削除ボタンは注文履歴のうち `status === 'handed'` の行にのみ表示する（`paid`/`cooking`/`ready`の行には出さない。それらは既存の「受渡待ち」タブの「取消」ボタンで対応済み）。
- 削除は既存の`order:cancel`イベントをそのまま使う。新しいSocket.ioイベントは追加しない。
- `ACTIVE_STATUSES`（`paid`/`cooking`/`ready`、採番ルール・厨房/smartboardのキュー判定に使われる）自体は変更しない。
- 削除ボタン押下時は確認ダイアログ（`confirm()`）を出す。既存の「取消」ボタンと同じパターン。

---

## File Structure

```
pos/server/salesStats.js                    # history に day フィールドを追加（修正）
pos/test/salesStats.test.js                 # day フィールドのテスト追加（修正）
pos/server/orderStore.js                    # cancelOrder のガード条件を拡張（修正）
pos/test/orderStore.transitions.test.js     # handed からの cancelOrder テスト追加（修正）
pos/public/pos/pos.js                       # renderSales に削除ボタンを追加（修正）
```

---

## Task 1: salesStats.js の history に day フィールドを追加

**Files:**
- Modify: `pos/server/salesStats.js`
- Test: `pos/test/salesStats.test.js`

**Interfaces:**
- Consumes: `Order`型（`id, day, items, total, received, change, status, createdAt, paidAt, readyAt, handedAt`）
- Produces: `computeSalesStats(orders).history` の各要素に `day: string` フィールドが追加される（`{id, day, itemCount, total, status, paidAt}`）。他タスク（Task 3のフロントエンド削除ボタン）はこの`day`を`order:cancel`イベントのペイロードに使う。

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/salesStats.test.js` の既存の `order()` ヘルパー関数はすでに `day: '2026-10-16'` を含んでいる（変更不要）。以下のテストを追加する:

```js
test('history には day フィールドが含まれる', () => {
  const orders = [order({ id: 1, day: '2026-10-16' })];
  const stats = computeSalesStats(orders);
  assert.equal(stats.history[0].day, '2026-10-16');
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/salesStats.test.js`
Expected: FAIL（`stats.history[0].day` が `undefined`）

- [ ] **Step 3: 実装を修正**

`pos/server/salesStats.js` の `history.push({...})` 部分を以下に置き換える:

```js
    history.push({
      id: order.id,
      day: order.day,
      itemCount: order.items.length,
      total: order.total,
      status: order.status,
      paidAt: order.paidAt,
    });
```

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/salesStats.test.js`
Expected: PASS（5 tests, 0 failures）

- [ ] **Step 5: Commit**

```bash
git add pos/server/salesStats.js pos/test/salesStats.test.js
git commit -m "pos: salesStats.historyにdayフィールドを追加"
```

---

## Task 2: cancelOrder を handed 状態からも呼べるように拡張

**Files:**
- Modify: `pos/server/orderStore.js`
- Test: `pos/test/orderStore.transitions.test.js`

**Interfaces:**
- Consumes: 既存の `_findOrder(day, id)`、`ACTIVE_STATUSES`（`['paid', 'cooking', 'ready']`、変更しない）
- Produces: `cancelOrder(day, id)` が `handed` 状態の注文にも使えるようになる（`paid`/`cooking`/`ready`/`handed` から `cancelled` へ遷移。それ以外の状態からは引き続き例外）

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/orderStore.transitions.test.js` に以下を追加する:

```js
test('cancelOrder は handed の注文にも使える（売上画面からの削除用）', () => {
  const { store, order } = checkedOutStore();
  store.markReady(order.day, order.id);
  store.markHanded(order.day, order.id);
  const updated = store.cancelOrder(order.day, order.id);
  assert.equal(updated.status, 'cancelled');
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/orderStore.transitions.test.js`
Expected: FAIL（既存のテスト「cancelOrder は handed になった注文には使えない」と矛盾するため、まずそのテストを次のStepで更新する必要がある）

このタスクは既存の仕様を変更するため、まず矛盾する既存テストを更新する。`pos/test/orderStore.transitions.test.js` 内の以下のテストを:

```js
test('cancelOrder は handed になった注文には使えない', () => {
  const { store, order } = checkedOutStore();
  store.markReady(order.day, order.id);
  store.markHanded(order.day, order.id);
  assert.throws(() => store.cancelOrder(order.day, order.id), /cannot cancel order in status: handed/);
});
```

削除し、代わりに以下に置き換える（`handed`から呼べないことを検証するテストを、呼べることを検証するテスト＝Step 1で追加したテストに統合する）:

```js
test('cancelOrder は cancelled になった注文には使えない（二重削除防止）', () => {
  const { store, order } = checkedOutStore();
  store.cancelOrder(order.day, order.id);
  assert.throws(() => store.cancelOrder(order.day, order.id), /cannot cancel order in status: cancelled/);
});
```

再度実行して失敗を確認する:
Run: `cd pos && node --test test/orderStore.transitions.test.js`
Expected: FAIL（`cancelOrder`がまだ`handed`を拒否するため、Step 1で追加したテストが失敗する）

- [ ] **Step 3: 実装を修正**

`pos/server/orderStore.js` の `cancelOrder` メソッドを以下に置き換える:

```js
  cancelOrder(day, id) {
    const order = this._findOrder(day, id);
    if (!ACTIVE_STATUSES.includes(order.status) && order.status !== 'handed') {
      throw new Error(`cannot cancel order in status: ${order.status}`);
    }
    order.status = 'cancelled';
    return order;
  }
```

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/orderStore.transitions.test.js`
Expected: PASS（9 tests, 0 failures）

全OrderStoreテストをまとめて実行して確認:
Run: `cd pos && node --test test/orderStore.cart.test.js test/orderStore.checkout.test.js test/orderStore.transitions.test.js`
Expected: PASS（全テストグリーン、回帰なし）

- [ ] **Step 5: Commit**

```bash
git add pos/server/orderStore.js pos/test/orderStore.transitions.test.js
git commit -m "pos: cancelOrderをhanded状態からも呼べるよう拡張"
```

---

## Task 3: 売上画面の注文履歴に削除ボタンを追加

**Files:**
- Modify: `pos/public/pos/pos.js`

**Interfaces:**
- Consumes: Task 1の`stats.history[].day`、Task 2で拡張された`cancelOrder`（`order:cancel`イベント経由）
- Produces: なし（このタスクで完結）

- [ ] **Step 1: renderSales関数を書き換える**

`pos/public/pos/pos.js` の `renderSales` 関数全体を以下に置き換える（`innerHTML`での一括描画から、削除ボタンを持てる`createElement`方式に変更する）:

```js
function renderSales(stats) {
  document.getElementById('totalRevenue').textContent = stats.totalRevenue;
  document.getElementById('totalItems').textContent = stats.totalItems;

  const byHourEl = document.getElementById('byHour');
  byHourEl.innerHTML = stats.byHour.map((h) => `<div>${h.hour}時台: ${h.count}本 / ${h.revenue}円</div>`).join('');

  const historyEl = document.getElementById('history');
  historyEl.innerHTML = '';
  stats.history.forEach((h) => {
    const row = document.createElement('div');

    const label = document.createElement('span');
    label.textContent = `#${h.id} ${h.itemCount}本 ${h.total}円 (${h.status})`;
    row.appendChild(label);

    if (h.status === 'handed') {
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '削除';
      deleteBtn.addEventListener('click', () => {
        if (confirm(`注文 #${h.id} を削除しますか？（売上集計から除外されます）`)) {
          socket.emit('order:cancel', { day: h.day, id: h.id });
        }
      });
      row.appendChild(deleteBtn);
    }

    historyEl.appendChild(row);
  });
}
```

- [ ] **Step 2: サーバーを起動しブラウザで確認**

Run: `cd pos && npm.cmd start`（他のサーバーが3000番ポートを使っている場合は一旦止める）
ブラウザで `http://localhost:3000/pos/` を開く。

確認項目:
- ホットドッグを注文して会計確定する
- 厨房画面（別タブで`http://localhost:3000/kitchen/`）で「調理完了」を押す
- レジ画面の「受渡待ち」タブで「受渡済」を押す
- レジ画面の「売上」タブを開き、注文履歴にその注文が `(handed)` として表示され、「削除」ボタンが付いていることを確認する
- 「削除」を押すと確認ダイアログが出ることを確認する
- 確認すると、注文履歴からその行が消え、累計売上額・販売本数からもその注文分が引かれることを確認する
- まだ受渡していない（`paid`/`ready`など）注文が履歴にある場合、そちらには「削除」ボタンが出ないことを確認する

- [ ] **Step 3: Commit**

```bash
git add pos/public/pos/pos.js
git commit -m "pos: 売上画面の注文履歴に受渡済み注文の削除ボタンを追加"
```

---

## Self-Review メモ

- **仕様書カバレッジ**: `cancelOrder`拡張→Task2、`history`への`day`追加→Task1、削除ボタンUI→Task3。仕様書の全項目に対応。
- **プレースホルダー確認**: 全ステップに完全なコードを記載済み。
- **型・シグネチャの一貫性**: `order:cancel`イベントのペイロード形（`{day, id}`）は既存の`renderActiveOrders`内の取消ボタン実装と完全に一致。`stats.history[].day`はTask1で追加したフィールドをTask3でそのまま使用しており、命名の齟齬はない。既存テスト「cancelOrder は handed になった注文には使えない」がTask2の仕様変更と矛盾するため、Task2内で明示的に更新・置き換えている。
