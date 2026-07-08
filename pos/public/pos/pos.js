const socket = io();
const offlineBanner = document.getElementById('offlineBanner');
socket.on('connect', () => offlineBanner.classList.remove('visible'));
socket.on('disconnect', () => offlineBanner.classList.add('visible'));

const TOPPING_KEYS = ['ketchup', 'mustard', 'mayo'];
const TOPPING_LABELS = { ketchup: 'ケチャップ', mustard: 'マスタード', mayo: 'マヨネーズ' };
const LEVEL_LABELS = { none: 'なし', normal: '普通', extra: '多め' };

function defaultToppings() {
  return { ketchup: 'normal', mustard: 'normal', mayo: 'normal' };
}

let latestState = null;

document.getElementById('addHotdog').addEventListener('click', () => {
  socket.emit('cart:addItem', { product: 'hotdog', toppings: defaultToppings() });
});

document.getElementById('addCheeseHotdog').addEventListener('click', () => {
  socket.emit('cart:addItem', { product: 'cheese_hotdog', toppings: defaultToppings() });
});

document.getElementById('received').addEventListener('input', (e) => {
  socket.emit('cart:setReceived', { amount: Number(e.target.value) || 0 });
});

document.getElementById('quickExact').addEventListener('click', () => {
  socket.emit('cart:setReceived', { amount: latestState.cart.total });
});

document.getElementById('quick500').addEventListener('click', () => {
  socket.emit('cart:setReceived', { amount: 500 });
});

document.getElementById('quick1000').addEventListener('click', () => {
  socket.emit('cart:setReceived', { amount: 1000 });
});

document.querySelectorAll('.key').forEach((btn) => {
  btn.addEventListener('click', () => {
    const digit = btn.dataset.digit;
    const receivedInput = document.getElementById('received');
    const amount = Number(receivedInput.value + digit);
    receivedInput.value = amount;
    socket.emit('cart:setReceived', { amount });
  });
});

document.getElementById('keyClear').addEventListener('click', () => {
  document.getElementById('received').value = 0;
  socket.emit('cart:setReceived', { amount: 0 });
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
  socket.emit('order:checkout', {}, (result) => {
    if (!result.ok) {
      alert(`会計できません: ${result.error}`);
    }
  });
});

document.getElementById('tabActive').addEventListener('click', () => switchTab('active'));
document.getElementById('tabSales').addEventListener('click', () => switchTab('sales'));

function switchTab(tab) {
  document.getElementById('activeView').style.display = tab === 'active' ? 'block' : 'none';
  document.getElementById('salesView').style.display = tab === 'sales' ? 'block' : 'none';
  document.getElementById('tabActive').classList.toggle('active', tab === 'active');
  document.getElementById('tabSales').classList.toggle('active', tab === 'sales');
}

function productLabel(product) {
  return product === 'cheese_hotdog' ? 'チーズホットドッグ' : 'ホットドッグ';
}

function toppingsSummary(toppings) {
  return TOPPING_KEYS.map((key) => `${TOPPING_LABELS[key]}:${LEVEL_LABELS[toppings[key]]}`).join(' / ');
}

function renderCart(cart) {
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  cart.items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cart-item';

    const label = document.createElement('span');
    label.textContent = productLabel(item.product);
    row.appendChild(label);

    TOPPING_KEYS.forEach((key) => {
      const select = document.createElement('select');
      ['none', 'normal', 'extra'].forEach((level) => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = `${TOPPING_LABELS[key]}:${LEVEL_LABELS[level]}`;
        if (item.toppings[key] === level) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        const newToppings = { ...item.toppings, [key]: select.value };
        socket.emit('cart:updateItemToppings', { index, toppings: newToppings });
      });
      row.appendChild(select);
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '削除';
    removeBtn.addEventListener('click', () => socket.emit('cart:removeItem', { index }));
    row.appendChild(removeBtn);

    container.appendChild(row);
  });

  document.getElementById('total').textContent = cart.total;
  document.getElementById('change').textContent = Math.max(cart.change, 0);

  const cartEmpty = cart.items.length === 0;
  document.getElementById('checkoutBtn').disabled = cartEmpty || cart.received < cart.total;
  document.getElementById('quickExact').disabled = cartEmpty;
  document.getElementById('quick500').disabled = cartEmpty;
  document.getElementById('quick1000').disabled = cartEmpty;
  document.querySelectorAll('.keypad button').forEach((btn) => {
    btn.disabled = cartEmpty;
  });
}

function renderActiveOrders(orders) {
  const container = document.getElementById('activeOrders');
  container.innerHTML = '';
  orders.filter((o) => ['paid', 'cooking', 'ready'].includes(o.status)).forEach((order) => {
    const row = document.createElement('div');
    row.className = 'order-row';

    const info = document.createElement('span');
    info.textContent = `#${order.id} (${order.status}) ${order.items.length}本 - ${toppingsSummary(order.items[0]?.toppings || defaultToppings())}`;
    row.appendChild(info);

    const actions = document.createElement('span');

    if (order.status === 'ready') {
      const handBtn = document.createElement('button');
      handBtn.textContent = '受渡済';
      handBtn.addEventListener('click', () => socket.emit('order:handed', { day: order.day, id: order.id }));
      actions.appendChild(handBtn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => {
      if (confirm(`注文 #${order.id} を取消しますか？`)) {
        socket.emit('order:cancel', { day: order.day, id: order.id });
      }
    });
    actions.appendChild(cancelBtn);

    row.appendChild(actions);
    container.appendChild(row);
  });
}

function renderSales(stats) {
  document.getElementById('totalRevenue').textContent = stats.totalRevenue;
  document.getElementById('totalItems').textContent = stats.totalItems;

  const byHourEl = document.getElementById('byHour');
  byHourEl.innerHTML = stats.byHour.map((h) => `<div>${h.hour}時台: ${h.count}本 / ${h.revenue}円</div>`).join('');

  const historyEl = document.getElementById('history');
  historyEl.innerHTML = stats.history.map((h) => `<div>#${h.id} ${h.itemCount}本 ${h.total}円 (${h.status})</div>`).join('');
}

socket.on('state', (state) => {
  latestState = state;
  document.getElementById('received').value = state.cart.received;
  renderCart(state.cart);
  renderActiveOrders(state.orders);
  renderSales(state.stats);
});
