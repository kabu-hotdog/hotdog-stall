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
