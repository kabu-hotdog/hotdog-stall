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

test('setReceived は負の金額で例外を投げる', () => {
  const store = makeStore();
  assert.throws(() => store.setReceived(-100), /invalid received amount/);
});

test('setReceived は数値以外(NaN・文字列)で例外を投げる', () => {
  const store = makeStore();
  assert.throws(() => store.setReceived(NaN), /invalid received amount/);
  assert.throws(() => store.setReceived('500'), /invalid received amount/);
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
