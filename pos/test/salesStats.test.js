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

test('history には day フィールドが含まれる', () => {
  const orders = [order({ id: 1, day: '2026-10-16' })];
  const stats = computeSalesStats(orders);
  assert.equal(stats.history[0].day, '2026-10-16');
});
