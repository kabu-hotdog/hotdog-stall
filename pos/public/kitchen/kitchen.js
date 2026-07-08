const socket = io();
const offlineBanner = document.getElementById('offlineBanner');
socket.on('connect', () => offlineBanner.classList.remove('visible'));
socket.on('disconnect', () => offlineBanner.classList.add('visible'));

const TOPPING_KEYS = ['ketchup', 'mustard', 'mayo'];
const TOPPING_LABELS = { ketchup: 'ケチャップ', mustard: 'マスタード', mayo: 'マヨネーズ' };
const LEVEL_LABELS = { none: 'なし', normal: '普通', extra: '多め' };

function productLabel(product) {
  return product === 'cheese_hotdog' ? 'チーズホットドッグ' : 'ホットドッグ';
}

function toppingsLine(toppings) {
  return TOPPING_KEYS.map((key) => `${TOPPING_LABELS[key]}${LEVEL_LABELS[toppings[key]]}`).join(' / ');
}

socket.on('state', (state) => {
  const container = document.getElementById('queue');
  container.innerHTML = '';

  const queueOrders = state.orders.filter((o) => o.status === 'paid' || o.status === 'cooking');

  queueOrders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-card';

    const title = document.createElement('h2');
    title.textContent = `#${order.id}`;
    card.appendChild(title);

    order.items.forEach((item, i) => {
      const line = document.createElement('div');
      line.className = 'toppings';
      line.textContent = `${i + 1}本目: ${productLabel(item.product)} - ${toppingsLine(item.toppings)}`;
      card.appendChild(line);
    });

    const readyBtn = document.createElement('button');
    readyBtn.textContent = '調理完了';
    readyBtn.addEventListener('click', () => {
      socket.emit('order:ready', { day: order.day, id: order.id });
    });
    card.appendChild(readyBtn);

    container.appendChild(card);
  });
});
