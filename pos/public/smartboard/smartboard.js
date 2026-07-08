const socket = io();
const offlineBanner = document.getElementById('offlineBanner');
socket.on('connect', () => offlineBanner.classList.remove('visible'));
socket.on('disconnect', () => offlineBanner.classList.add('visible'));

function renderNumbers(elementId, orders) {
  const container = document.getElementById(elementId);
  container.innerHTML = orders.map((o) => `<div class="number">${o.id}</div>`).join('');
}

socket.on('state', (state) => {
  const waiting = state.orders.filter((o) => o.status === 'paid' || o.status === 'cooking');
  const ready = state.orders.filter((o) => o.status === 'ready');
  renderNumbers('waitingNumbers', waiting);
  renderNumbers('readyNumbers', ready);
});
