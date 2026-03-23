// =============================================
// Dashboard Module
// =============================================

const Dashboard = {
  salesChart: null,
  incomeExpChart: null,
  currentPeriod: 'daily',

  load() {
    this.setupPeriodTabs();
    this.loadPeriod('daily');
  },

  setupPeriodTabs() {
    const tabs = document.querySelectorAll('.period-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentPeriod = tab.dataset.period;
        this.loadPeriod(this.currentPeriod);
      });
    });

    document.getElementById('chartTypeSelect')?.addEventListener('change', (e) => {
      this.updateSalesChart(e.target.value);
    });
  },

  async loadPeriod(period) {
    const range = getDateRange(period);
    const [records, expenses] = await Promise.all([
      this.fetchRecordsInRange(range.from, range.to),
      this.fetchExpensesInRange(range.from, range.to)
    ]);

    const totals = this.calcTotals(records, expenses);
    this.updateSummaryCards(totals, period);
    this.renderCharts(records, expenses, period);
    this.renderProductRankings(records);
    this.renderInsights(totals, records);
  },

  async fetchRecordsInRange(from, to) {
    try {
      const snap = await db.collection(COLLECTIONS.DAILY_RECORDS)
        .where('date', '>=', from)
        .where('date', '<=', to)
        .orderBy('date', 'asc')
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error fetching records:', e);
      return [];
    }
  },

  async fetchExpensesInRange(from, to) {
    try {
      const snap = await db.collection(COLLECTIONS.EXPENSES)
        .where('date', '>=', from)
        .where('date', '<=', to)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error fetching expenses:', e);
      return [];
    }
  },

  calcTotals(records, expenses) {
    let totalSales = 0, totalCost = 0;
    records.forEach(r => {
      totalSales += parseFloat(r.totalSales || 0);
      totalCost += parseFloat(r.totalCost || 0);
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const netIncome = totalSales - totalCost - totalExpenses;
    return { totalSales, totalCost, totalExpenses, netIncome };
  },

  updateSummaryCards(totals, period) {
    document.getElementById('dTotalSales').textContent = formatCurrency(totals.totalSales);
    document.getElementById('dTotalExpenses').textContent = formatCurrency(totals.totalExpenses);
    document.getElementById('dTotalCost').textContent = formatCurrency(totals.totalCost);
    document.getElementById('dNetIncome').textContent = formatCurrency(totals.netIncome);

    const netEl = document.getElementById('dNetIncome');
    netEl.style.color = totals.netIncome >= 0 ? 'var(--green)' : 'var(--red)';

    const periodLabels = { daily: 'Today', weekly: 'This Week', monthly: 'This Month', quarterly: 'This Quarter', yearly: 'This Year' };
    document.getElementById('dSalesTrend').textContent = periodLabels[period] || '';
    document.getElementById('dExpTrend').textContent = periodLabels[period] || '';
    document.getElementById('dNetTrend').textContent = totals.netIncome >= 0 ? '✅ Profitable' : '⚠️ Net Loss';
  },

  renderCharts(records, expenses, period) {
    this.renderSalesTrendChart(records, period);
    this.renderIncomeExpChart(records, expenses);
  },

  renderSalesTrendChart(records, period) {
    const ctx = document.getElementById('salesTrendChart');
    if (!ctx) return;

    if (this.salesChart) {
      this.salesChart.destroy();
      this.salesChart = null;
    }

    let labels = [], salesData = [], profitData = [];

    if (records.length === 0) {
      labels = ['No Data'];
      salesData = [0];
      profitData = [0];
    } else if (period === 'daily') {
      labels = ['Today'];
      salesData = [records.reduce((s, r) => s + parseFloat(r.totalSales || 0), 0)];
      profitData = [records.reduce((s, r) => s + parseFloat(r.netProfit || 0), 0)];
    } else {
      records.forEach(r => {
        labels.push(formatDate(r.date));
        salesData.push(parseFloat(r.totalSales || 0));
        profitData.push(parseFloat(r.netProfit || 0));
      });
    }

    const chartType = document.getElementById('chartTypeSelect')?.value || 'bar';
    this.salesChart = new Chart(ctx, {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: 'Sales',
            data: salesData,
            backgroundColor: 'rgba(46,125,50,0.7)',
            borderColor: '#2E7D32',
            borderWidth: 2,
            borderRadius: chartType === 'bar' ? 6 : 0,
            tension: 0.4,
            fill: chartType === 'line'
          },
          {
            label: 'Net Profit',
            data: profitData,
            backgroundColor: 'rgba(21,101,192,0.6)',
            borderColor: '#1565C0',
            borderWidth: 2,
            borderRadius: chartType === 'bar' ? 6 : 0,
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => '₱' + v.toLocaleString() }
          }
        }
      }
    });
  },

  updateSalesChart(type) {
    if (this.salesChart) {
      this.salesChart.config.type = type;
      this.salesChart.update();
    }
  },

  renderIncomeExpChart(records, expenses) {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    if (this.incomeExpChart) {
      this.incomeExpChart.destroy();
      this.incomeExpChart = null;
    }

    const totalSales = records.reduce((s, r) => s + parseFloat(r.totalSales || 0), 0);
    const totalCost = records.reduce((s, r) => s + parseFloat(r.totalCost || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const netIncome = totalSales - totalCost - totalExpenses;

    this.incomeExpChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Total Sales', 'Material Cost', 'Expenses', 'Net Income'],
        datasets: [{
          data: [
            Math.max(totalSales, 0),
            Math.max(totalCost, 0),
            Math.max(totalExpenses, 0),
            Math.max(netIncome, 0)
          ],
          backgroundColor: ['#2E7D32', '#F57F17', '#C62828', '#1565C0'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ₱${ctx.raw.toLocaleString()}` } }
        }
      }
    });
  },

  renderProductRankings(records) {
    // Aggregate product performance
    const productMap = {};
    records.forEach(record => {
      (record.products || []).forEach(p => {
        const key = p.name?.toLowerCase() || 'unknown';
        if (!productMap[key]) productMap[key] = { name: p.name, totalProfit: 0, totalSales: 0 };
        const qty = parseFloat(p.quantity || 0);
        const sell = parseFloat(p.sellingPrice || 0);
        const cost = parseFloat(p.costPrice || 0);
        productMap[key].totalSales += qty * sell;
        productMap[key].totalProfit += qty * (sell - cost);
      });
    });

    const products = Object.values(productMap);
    const sorted = [...products].sort((a, b) => b.totalProfit - a.totalProfit);

    const renderList = (containerId, items, isLeast) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      if (items.length === 0) {
        container.innerHTML = '<p class="empty-msg">No data yet</p>';
        return;
      }
      container.innerHTML = items.slice(0, 5).map((p, i) => `
        <div class="product-rank-item">
          <span class="rank-num">${i + 1}</span>
          <span class="rank-name">${p.name}</span>
          <span class="rank-value ${isLeast ? 'text-amber' : 'text-green'}">${formatCurrency(p.totalProfit)}</span>
        </div>
      `).join('');
    };

    renderList('mostProfitableList', sorted, false);
    renderList('leastProfitableList', [...sorted].reverse(), true);
  },

  renderInsights(totals, records) {
    const container = document.getElementById('insightsList');
    if (!container) return;

    const insights = [];
    const margin = totals.totalSales > 0
      ? ((totals.netIncome / totals.totalSales) * 100).toFixed(1)
      : 0;

    if (totals.totalSales === 0) {
      insights.push({ icon: '📋', text: 'No sales recorded for this period. Start logging daily records.' });
    }

    if (totals.netIncome < 0) {
      insights.push({ icon: '🚨', text: `Net loss of ${formatCurrency(Math.abs(totals.netIncome))}. Review expenses and cost of materials.` });
    } else if (totals.netIncome > 0) {
      insights.push({ icon: '✅', text: `Profit margin is ${margin}%. ${parseFloat(margin) < 20 ? 'Consider reducing costs.' : 'Good performance!'}` });
    }

    if (totals.totalExpenses > totals.totalSales * 0.3) {
      insights.push({ icon: '⚠️', text: 'Expenses are over 30% of sales. Review and optimize recurring costs.' });
    }

    if (totals.totalCost > totals.totalSales * 0.6) {
      insights.push({ icon: '💡', text: 'Material cost is high relative to sales. Consider adjusting product prices.' });
    }

    // Predict based on recent data
    if (records.length >= 3) {
      const avg = totals.totalSales / records.length;
      const projected = avg * 30;
      insights.push({ icon: '🔮', text: `At current pace, projected monthly sales: ${formatCurrency(projected)}.` });
    }

    if (insights.length === 0) {
      insights.push({ icon: '📊', text: 'Add more records to get detailed financial insights.' });
    }

    container.innerHTML = insights.map(i => `
      <div class="insight-item">
        <span class="insight-icon">${i.icon}</span>
        <span>${i.text}</span>
      </div>
    `).join('');
  }
};
