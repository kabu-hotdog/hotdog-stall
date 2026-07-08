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
