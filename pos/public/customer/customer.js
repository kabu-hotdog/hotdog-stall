const socket = io();
const offlineBanner = document.getElementById('offlineBanner');
socket.on('connect', () => offlineBanner.classList.remove('visible'));
socket.on('disconnect', () => offlineBanner.classList.add('visible'));

function productLabel(product) {
  return product === 'cheese_hotdog' ? 'チーズホットドッグ' : 'ホットドッグ';
}

socket.on('state', (state) => {
  const container = document.getElementById('content');
  const cart = state.cart;

  if (cart.items.length === 0) {
    container.innerHTML = '<div class="empty">ご注文をお待ちしております</div>';
    return;
  }

  const counts = {};
  cart.items.forEach((item) => {
    counts[item.product] = (counts[item.product] || 0) + 1;
  });

  const lines = Object.entries(counts)
    .map(([product, count]) => `<div class="item-line">${productLabel(product)} × ${count}</div>`)
    .join('');

  container.innerHTML = `
    ${lines}
    <div class="total-line">合計 ${cart.total}円</div>
    <div class="money-line">お預かり ${cart.received}円</div>
    <div class="money-line">おつり ${Math.max(cart.change, 0)}円</div>
  `;
});
