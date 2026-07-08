function computeSalesStats(orders) {
  const counted = orders.filter((o) => o.status !== 'cart' && o.status !== 'cancelled');

  let totalRevenue = 0;
  let totalItems = 0;
  const byHour = {};
  const history = [];

  for (const order of counted) {
    totalRevenue += order.total;
    totalItems += order.items.length;

    const hour = new Date(order.paidAt).getHours();
    if (!byHour[hour]) {
      byHour[hour] = { hour, count: 0, revenue: 0 };
    }
    byHour[hour].count += order.items.length;
    byHour[hour].revenue += order.total;

    history.push({
      id: order.id,
      uid: order.uid,
      day: order.day,
      itemCount: order.items.length,
      total: order.total,
      status: order.status,
      paidAt: order.paidAt,
    });
  }

  return {
    totalRevenue,
    totalItems,
    byHour: Object.values(byHour).sort((a, b) => a.hour - b.hour),
    history: history.sort((a, b) => new Date(a.paidAt) - new Date(b.paidAt)),
  };
}

module.exports = { computeSalesStats };
