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

test('checkout は表示用番号(id)とは別に、常に一意なuidを発行する', () => {
  const store = makeStore();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const first = store.checkout();
  store.addItem('hotdog', { ketchup: 'normal', mustard: 'normal', mayo: 'normal' });
  store.setReceived(200);
  const second = store.checkout();
  assert.ok(first.uid);
  assert.ok(second.uid);
  assert.notEqual(first.uid, second.uid);
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
