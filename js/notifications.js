// =============================================
// Notifications & Alerts Module
// =============================================

const NotificationManager = {
  notifications: [],

  init() {
    this.checkAlerts();
    // Check every 5 minutes
    setInterval(() => this.checkAlerts(), 5 * 60 * 1000);
  },

  async checkAlerts() {
    this.notifications = [];
    const today = todayStr();
    const currentMonth = getMonthStr();

    await Promise.all([
      this.checkNoSalesToday(today),
      this.checkLowInventory(),
      this.checkExpensesVsIncome(currentMonth),
    ]);

    this.renderNotifications();
    this.updateBadge();
  },

  async checkNoSalesToday(today) {
    try {
      const snap = await db.collection(COLLECTIONS.DAILY_RECORDS)
        .where('date', '==', today).limit(1).get();

      const hour = new Date().getHours();
      if (snap.empty && hour >= 10) {
        this.add('warning', 'No Sales Recorded',
          `No sales have been recorded for today (${formatDate(today)}). Remember to log the daily records.`);
      }
    } catch (e) {}
  },

  async checkLowInventory() {
    try {
      const snap = await db.collection(COLLECTIONS.INVENTORY).get();
      const lowItems = [];

      snap.docs.forEach(doc => {
        const item = doc.data();
        const qty = parseFloat(item.quantity || 0);
        const min = parseFloat(item.minStock || 0);
        if (min > 0 && qty <= min) {
          lowItems.push(item.name);
        }
      });

      if (lowItems.length > 0) {
        this.add('warning', 'Low Inventory Alert',
          `${lowItems.length} item(s) are running low: ${lowItems.slice(0, 3).join(', ')}${lowItems.length > 3 ? '...' : ''}`);
      }
    } catch (e) {}
  },

  async checkExpensesVsIncome(monthStr) {
    try {
      const [year, month] = monthStr.split('-');
      const from = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const [salesSnap, expSnap] = await Promise.all([
        db.collection(COLLECTIONS.DAILY_RECORDS)
          .where('date', '>=', from).where('date', '<=', to).get(),
        db.collection(COLLECTIONS.EXPENSES)
          .where('date', '>=', from).where('date', '<=', to).get()
      ]);

      const totalSales = salesSnap.docs.reduce((s, d) => s + parseFloat(d.data().totalSales || 0), 0);
      const totalExpenses = expSnap.docs.reduce((s, d) => s + parseFloat(d.data().amount || 0), 0);

      if (totalExpenses > totalSales && totalSales > 0) {
        this.add('danger', 'Expenses Exceed Income',
          `Monthly expenses (${formatCurrency(totalExpenses)}) exceed total sales (${formatCurrency(totalSales)}). Review your budget immediately.`);
      }
    } catch (e) {}
  },

  add(type, title, message) {
    this.notifications.push({ type, title, message, time: new Date() });
  },

  renderNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = '<p class="notif-empty">✅ No alerts at this time</p>';
      return;
    }

    list.innerHTML = this.notifications.map(n => `
      <div class="notif-item ${n.type}">
        <div class="notif-item-title">
          ${n.type === 'danger' ? '🚨' : '⚠️'} ${n.title}
        </div>
        <div class="notif-item-msg">${n.message}</div>
      </div>
    `).join('');
  },

  updateBadge() {
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = this.notifications.length > 0 ? 'block' : 'none';
  },

  clearAll() {
    this.notifications = [];
    this.renderNotifications();
    this.updateBadge();
    document.getElementById('notifPanel').style.display = 'none';
  }
};
