const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const { OrderStore } = require('./orderStore');
const { saveSnapshot, loadSnapshot } = require('./persistence');
const { computeSalesStats } = require('./salesStats');

const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'state.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PERSIST_INTERVAL_MS = 15000;

function buildServer({ dataFile = DEFAULT_DATA_FILE, now = () => new Date() } = {}) {
  const initialState = loadSnapshot(dataFile);
  const store = new OrderStore({ now, initialState });

  const app = express();
  app.use('/pos', express.static(path.join(PUBLIC_DIR, 'pos')));
  app.use('/customer', express.static(path.join(PUBLIC_DIR, 'customer')));
  app.use('/kitchen', express.static(path.join(PUBLIC_DIR, 'kitchen')));
  app.use('/smartboard', express.static(path.join(PUBLIC_DIR, 'smartboard')));
  app.use('/shared', express.static(path.join(PUBLIC_DIR, 'shared')));

  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  function currentState() {
    const day = store.getDay();
    const orders = store.getOrders(day);
    return {
      day,
      cart: store.getCart(),
      orders,
      stats: computeSalesStats(orders),
    };
  }

  function broadcastState() {
    io.emit('state', currentState());
  }

  function persist() {
    saveSnapshot(dataFile, store.toJSON());
  }

  function handleMutation(socket, event, fn) {
    socket.on(event, (payload, callback) => {
      try {
        const result = fn(payload || {});
        persist();
        broadcastState();
        if (callback) callback({ ok: true, order: result });
      } catch (err) {
        if (callback) callback({ ok: false, error: err.message });
      }
    });
  }

  function handleCartMutation(socket, event, fn) {
    socket.on(event, (payload) => {
      try {
        fn(payload || {});
        broadcastState();
      } catch (err) {
        console.error(`${event} failed:`, err.message);
      }
    });
  }

  io.on('connection', (socket) => {
    socket.emit('state', currentState());

    handleCartMutation(socket, 'cart:addItem', ({ product, toppings }) => store.addItem(product, toppings));
    handleCartMutation(socket, 'cart:removeItem', ({ index }) => store.removeItem(index));
    handleCartMutation(socket, 'cart:updateItemToppings', ({ index, toppings }) => store.updateItemToppings(index, toppings));
    handleCartMutation(socket, 'cart:setReceived', ({ amount }) => store.setReceived(amount));
    handleCartMutation(socket, 'cart:clear', () => store.clearCart());

    handleMutation(socket, 'order:checkout', () => store.checkout());
    handleMutation(socket, 'order:cancel', ({ day, id }) => store.cancelOrder(day, id));
    handleMutation(socket, 'order:delete', ({ uid }) => store.cancelOrderByUid(uid));
    handleMutation(socket, 'order:ready', ({ day, id }) => store.markReady(day, id));
    handleMutation(socket, 'order:handed', ({ day, id }) => store.markHanded(day, id));
  });

  const persistInterval = setInterval(persist, PERSIST_INTERVAL_MS);

  function close() {
    clearInterval(persistInterval);
    io.close();
    httpServer.close();
  }

  return { app, httpServer, io, store, persist, close };
}

if (require.main === module) {
  const PORT = process.env.POS_PORT || 3000;
  const { httpServer } = buildServer();
  httpServer.listen(PORT, () => {
    console.log(`POS server listening on port ${PORT}`);
  });
}

module.exports = { buildServer };
