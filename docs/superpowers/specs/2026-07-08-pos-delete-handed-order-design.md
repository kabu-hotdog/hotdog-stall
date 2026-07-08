# 売上画面：受渡済み注文の削除 設計仕様書

- 日付: 2026-07-08
- 対象: `pos/server/orderStore.js`、`pos/public/pos/pos.js`
- ステータス: 設計承認済み・実装計画待ち

## 背景・目的

受渡済み（`handed`）の注文は、これまで一度確定すると訂正する手段がなかった（`cancelOrder()`は`paid`/`cooking`/`ready`からしか取消できない）。会計ミス・二重入力などを後から訂正できるよう、レジ画面の「売上」タブの注文履歴から、受渡済みの注文を削除できるようにする。

## スコープ

含む:
- レジ画面「売上」タブの注文履歴一覧で、`status === 'handed'` の行にのみ「削除」ボタンを表示する
- 削除ボタン押下時に確認ダイアログを出し、確定後に注文を`cancelled`状態へ遷移させる
- `cancelOrder()` が `handed` 状態からも呼べるように条件を拡張する

含まない:
- 削除の取り消し（元に戻す）機能
- `handed`以外（`paid`/`cooking`/`ready`）の注文の削除ボタンをこの画面に追加すること（それらは既存の「受渡待ち」タブの「取消」ボタンで対応済み）
- 新しいSocket.ioイベントの追加（既存の`order:cancel`をそのまま使う）
- 売上集計ロジック（`salesStats.js`）の変更（`cancelled`除外は既に実装済みでそのまま使える）

## 設計

### バックエンド（`pos/server/orderStore.js`）

`cancelOrder(day, id)` のガード条件を、`ACTIVE_STATUSES`（`paid`/`cooking`/`ready`）に加えて`handed`からも許可するよう変更する:

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

`ACTIVE_STATUSES` 自体（採番ルール・厨房/smartboardのキュー判定に使われる）は変更しない。`handed`からの取消を許可する条件をこのメソッド内だけに追加する。

`cancelled`に遷移した注文は、既存の`computeSalesStats()`の除外フィルタ（`status !== 'cart' && status !== 'cancelled'`）により、累計売上額・販売本数・時間帯別・注文履歴のすべてから自動的に除外される。追加の実装は不要。

### フロントエンド（`pos/public/pos/pos.js`）

`renderSales()`関数内の注文履歴描画部分で、各行の`status`が`'handed'`のときだけ「削除」ボタンを追加する。ボタン押下時は既存の「取消」ボタン（`renderActiveOrders()`内）と同じパターンで確認ダイアログを出し、確定後に`socket.emit('order:cancel', { day: order.day, id: order.id })`を送る。

現在`renderSales()`は`stats.history`（`{id, itemCount, total, status, paidAt}`の配列、`day`を含まない）を元に描画しているため、削除ボタンから`order:cancel`を呼ぶには`day`が必要になる。`stats.history`に`day`を含めるよう`salesStats.js`の`computeSalesStats()`を拡張する必要がある。

### データフロー
```
スタッフが売上タブの注文履歴で「削除」ボタンをタップ
  → confirm()ダイアログで確認
  → pos.js: socket.emit('order:cancel', { day, id })
  → サーバー: 既存のcancelOrder()ハンドラ（handed許可に拡張済み）が処理
  → 全クライアントへ state ブロードキャスト
  → pos.js: state受信 → 売上集計が再計算され、該当注文が注文履歴・集計から消える
```

### テスト
- バックエンド: `pos/test/orderStore.transitions.test.js` に「`handed`から`cancelOrder`を呼べる」テストを追加（TDD）
- バックエンド: `pos/test/salesStats.test.js` に「`history`に`day`フィールドが含まれる」テストを追加（TDD）
- フロントエンド: 自動テストなし。実ブラウザで、受渡済み注文を作成→売上タブで削除→注文履歴・集計から消えることを確認する
