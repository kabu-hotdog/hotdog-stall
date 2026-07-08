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

test('cancelOrder は handed の注文にも使える（売上画面からの削除用）', () => {
  const { store, order } = checkedOutStore();
  store.markReady(order.day, order.id);
  store.markHanded(order.day, order.id);
  const updated = store.cancelOrder(order.day, order.id);
  assert.equal(updated.status, 'cancelled');
});

test('cancelOrder は cancelled になった注文には使えない（二重削除防止）', () => {
  const { store, order } = checkedOutStore();
  store.cancelOrder(order.day, order.id);
  assert.throws(() => store.cancelOrder(order.day, order.id), /cannot cancel order in status: cancelled/);
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

test('番号が使い回された場合、markReady は最新の（キャンセルされていない）同番号の注文を操作する', () => {
  const { store, order } = checkedOutStore();
  store.cancelOrder(order.day, order.id);
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const next = store.checkout();
  assert.equal(next.id, order.id);

  const updated = store.markReady(next.day, next.id);
  assert.equal(updated.status, 'ready');
  assert.equal(updated.createdAt, next.createdAt);
});
