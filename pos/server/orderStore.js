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
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      throw new Error(`invalid received amount: ${amount}`);
    }
    this.cart.received = amount;
    return this.getCart();
  }

  clearCart() {
    this.cart = this._emptyCart();
    return this.getCart();
  }

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
}

module.exports = { OrderStore, formatDay, ACTIVE_STATUSES };
