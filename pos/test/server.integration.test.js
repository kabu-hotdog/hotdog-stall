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

function connectAndWaitForState(port) {
  return new Promise((resolve) => {
    const socket = ioClient(`http://localhost:${port}`, { transports: ['websocket'] });
    socket.once('state', (state) => resolve({ socket, state }));
  });
}

function waitForState(socket) {
  return new Promise((resolve) => socket.once('state', resolve));
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

test('不正なcart:removeItemを送ってもサーバーは落ちず、後続の操作を処理し続ける', async () => {
  const { httpServer, close } = buildServer({ dataFile: tempDataFile() });
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;

  const { socket: client } = await connectAndWaitForState(port);

  client.emit('cart:removeItem', { index: 999 });

  client.emit('cart:addItem', { product: 'hotdog', toppings: { ketchup: 'normal', mustard: 'normal', mayo: 'normal' } });
  const state = await waitForState(client);
  assert.equal(state.cart.items.length, 1);

  client.close();
  close();
});
