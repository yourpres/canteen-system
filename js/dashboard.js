// =============================================
// Dashboard Module
// =============================================

const Dashboard = {
  salesChart: null,
  incomeExpChart: null,
  currentPeriod: 'monthly',
  customRange: null,

  load() {
    this.setupPeriodTabs();
    this.setupDateFilters();
    this.loadPeriod(this.currentPeriod);
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

  setupDateFilters() {
    const periodSelect = document.getElementById('dashboardPeriodFilter');
    const fromInput = document.getElementById('dashboardDateFrom');
    const toInput = document.getElementById('dashboardDateTo');

    if (!periodSelect || !fromInput || !toInput) return;

    periodSelect.value = this.currentPeriod;
    const initialRange = getDateRange(this.currentPeriod);
    fromInput.value = initialRange.from;
    toInput.value = initialRange.to;

    periodSelect.addEventListener('change', () => {
      const selected = periodSelect.value;
      this.currentPeriod = selected;

      if (selected !== 'custom') {
        const range = getDateRange(selected);
        fromInput.value = range.from;
        toInput.value = range.to;
        this.customRange = { ...range };
        this.loadPeriod(selected);
      }
    });
  },

  applyDateFilter() {
    const periodSelect = document.getElementById('dashboardPeriodFilter');
    const fromInput = document.getElementById('dashboardDateFrom');
    const toInput = document.getElementById('dashboardDateTo');

    if (!periodSelect || !fromInput || !toInput) return;

    const selected = periodSelect.value;
    if (!fromInput.value || !toInput.value) {
      if (typeof showToast === 'function') showToast('Please select both From and To dates.', 'error');
      return;
    }

    if (fromInput.value > toInput.value) {
      if (typeof showToast === 'function') showToast('From date cannot be later than To date.', 'error');
      return;
    }

    this.currentPeriod = selected;
    this.customRange = {
      from: fromInput.value,
      to: toInput.value
    };

    this.loadPeriod(selected === 'custom' ? 'custom' : selected);
  },

  resetDateFilter() {
    const periodSelect = document.getElementById('dashboardPeriodFilter');
    const fromInput = document.getElementById('dashboardDateFrom');
    const toInput = document.getElementById('dashboardDateTo');

    const defaultPeriod = 'monthly';
    const defaultRange = getDateRange(defaultPeriod);

    this.currentPeriod = defaultPeriod;
    this.customRange = { ...defaultRange };

    if (periodSelect) periodSelect.value = defaultPeriod;
    if (fromInput && toInput) {
      fromInput.value = defaultRange.from;
      toInput.value = defaultRange.to;
    }

    this.loadPeriod(defaultPeriod);
  },

  async loadPeriod(period) {
    const range = period === 'custom' && this.customRange
      ? this.customRange
      : getDateRange(period);

    const fromInput = document.getElementById('dashboardDateFrom');
    const toInput = document.getElementById('dashboardDateTo');
    const periodSelect = document.getElementById('dashboardPeriodFilter');

    if (fromInput && toInput) {
      fromInput.value = range.from;
      toInput.value = range.to;
    }
    if (periodSelect) {
      periodSelect.value = period;
    }

    const [records, expenses, supplies] = await Promise.all([
      this.fetchRecordsInRange(range.from, range.to),
      this.fetchExpensesInRange(range.from, range.to),
      this.fetchSupplyHistoryInRange(range.from, range.to)
    ]);

    const totals = this.calcTotals(records, expenses, supplies, period, range);
    this.updateSummaryCards(totals, period, range);
    this.renderCharts(records, expenses, supplies, period);
    this.renderProductRankings(records);
    this.renderInsights(totals, records);
  },

  async fetchRecordsInRange(from, to) {
    try {
      // Fetch from localStorage instead of Firebase
      const records = JSON.parse(localStorage.getItem('daily_records')) || [];
      return records.filter(r => r.date >= from && r.date <= to).sort((a, b) => a.date.localeCompare(b.date));
    } catch (e) {
      console.error('Error fetching records:', e);
      return [];
    }
  },

  async fetchExpensesInRange(from, to) {
    try {
      const expenses = JSON.parse(localStorage.getItem('monthly_expenses')) || [];
      return expenses.filter(e => e.date >= from && e.date <= to);
    } catch (e) {
      console.error('Error fetching expenses:', e);
      return [];
    }
  },

  async fetchSupplyHistoryInRange(from, to) {
    try {
      const supplies = JSON.parse(localStorage.getItem('inventory_history')) || [];
      return supplies.filter(item => item.date >= from && item.date <= to).sort((a, b) => a.date.localeCompare(b.date));
    } catch (e) {
      console.error('Error fetching supply history:', e);
      return [];
    }
  },

  calcTotals(records, expenses, supplies, period, range) {
    const totalSales = records.reduce((sum, r) => sum + parseFloat(r.totalSales || 0), 0);
    const totalRecordCost = records.reduce((sum, r) => sum + parseFloat(r.totalCost || 0), 0);
    const totalSchoolFunds = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalSupplyCost = supplies.reduce((sum, item) => sum + parseFloat(item.cost || 0), 0);
    const netIncome = totalSales - totalSupplyCost - totalSchoolFunds;
    const usageBase = totalSales || 1;
    const budgetUsageRate = ((totalSupplyCost + totalSchoolFunds) / usageBase) * 100;
    const periodLabels = { daily: 'Today', weekly: 'This Week', monthly: 'This Month', quarterly: 'This Quarter', yearly: 'This Year', custom: 'Custom Range' };
    const rangeLabel = period === 'custom'
      ? `${formatDate(range.from)} to ${formatDate(range.to)}`
      : (periodLabels[period] || 'Selected Period');

    return {
      totalSales,
      totalCost: totalRecordCost,
      totalExpenses: totalSchoolFunds,
      totalRecordCost,
      totalSchoolFunds,
      totalSupplyCost,
      netIncome,
      weeklyBudget: netIncome,
      monthlyBudget: netIncome,
      budgetUsageRate,
      rangeLabel
    };
  },

  updateSummaryCards(totals, period, range) {
    document.getElementById('dTotalSales').textContent = formatCurrency(totals.totalSales);
    document.getElementById('dWeeklySupplyCost').textContent = formatCurrency(totals.totalSupplyCost);
    document.getElementById('dSchoolFunds').textContent = formatCurrency(totals.totalSchoolFunds);
    document.getElementById('dNetIncome').textContent = formatCurrency(totals.netIncome);
    document.getElementById('dWeeklyBudget').textContent = formatCurrency(totals.weeklyBudget);
    document.getElementById('dMonthlyBudget').textContent = formatCurrency(totals.monthlyBudget);
    document.getElementById('dBudgetUsageRate').textContent = `${totals.budgetUsageRate.toFixed(1)}%`;

    const netEl = document.getElementById('dNetIncome');
    if (netEl) netEl.style.color = totals.netIncome >= 0 ? 'var(--green)' : 'var(--red)';

    const weeklyBudgetEl = document.getElementById('dWeeklyBudget');
    if (weeklyBudgetEl) weeklyBudgetEl.style.color = totals.weeklyBudget >= 0 ? 'var(--green)' : 'var(--red)';

    const monthlyBudgetEl = document.getElementById('dMonthlyBudget');
    if (monthlyBudgetEl) monthlyBudgetEl.style.color = totals.monthlyBudget >= 0 ? 'var(--green)' : 'var(--red)';

    const activeLabel = totals.rangeLabel;

    document.getElementById('dSalesTrend').textContent = `${activeLabel} gross revenue`;
    document.getElementById('dSupplyTrend').textContent = `${activeLabel} supply purchases`;
    document.getElementById('dFundsTrend').textContent = `${activeLabel} school fund allocations`;
    document.getElementById('dNetTrend').textContent = totals.netIncome >= 0 ? 'Within budget' : 'Over budget';
    document.getElementById('dWeeklyBudgetSub').textContent = totals.weeklyBudget >= 0 ? 'Current week remaining budget' : 'Current week budget deficit';
    document.getElementById('dMonthlyBudgetSub').textContent = totals.monthlyBudget >= 0 ? 'Current month remaining budget' : 'Current month budget deficit';
    document.getElementById('dBudgetUsageSub').textContent = 'Supply + funds compared to sales';
  },

  renderCharts(records, expenses, supplies, period) {
    this.renderSalesTrendChart(records, expenses, supplies, period);
    this.renderIncomeExpChart(records, expenses, supplies);
  },

  renderSalesTrendChart(records, expenses, supplies, period) {
    const ctx = document.getElementById('salesTrendChart');
    if (!ctx) return;

    if (this.salesChart) {
      this.salesChart.destroy();
      this.salesChart = null;
    }

    let labels = [], salesData = [], supplyData = [], fundsData = [];
    const bucketMap = {};

    const pushBucket = (date, type, value) => {
      if (!bucketMap[date]) bucketMap[date] = { sales: 0, supply: 0, funds: 0 };
      bucketMap[date][type] += value;
    };

    records.forEach(r => pushBucket(r.date, 'sales', parseFloat(r.totalSales || 0)));
    supplies.forEach(s => pushBucket(s.date, 'supply', parseFloat(s.cost || 0)));
    expenses.forEach(e => pushBucket(e.date, 'funds', parseFloat(e.amount || 0)));

    const bucketDates = Object.keys(bucketMap).sort();

    if (bucketDates.length === 0) {
      labels = ['No Data'];
      salesData = [0];
      supplyData = [0];
      fundsData = [0];
    } else if (period === 'daily') {
      labels = ['Today'];
      salesData = [records.reduce((s, r) => s + parseFloat(r.totalSales || 0), 0)];
      supplyData = [supplies.reduce((s, r) => s + parseFloat(r.cost || 0), 0)];
      fundsData = [expenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0)];
    } else {
      bucketDates.forEach(date => {
        labels.push(formatDate(date));
        salesData.push(bucketMap[date].sales);
        supplyData.push(bucketMap[date].supply);
        fundsData.push(bucketMap[date].funds);
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
            label: 'Weekly Supply',
            data: supplyData,
            backgroundColor: 'rgba(194,118,10,0.6)',
            borderColor: '#C2760A',
            borderWidth: 2,
            borderRadius: chartType === 'bar' ? 6 : 0,
            tension: 0.4,
            fill: false
          },
          {
            label: 'School Funds',
            data: fundsData,
            backgroundColor: 'rgba(107,33,168,0.55)',
            borderColor: '#6B21A8',
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

  renderIncomeExpChart(records, expenses, supplies) {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    if (this.incomeExpChart) {
      this.incomeExpChart.destroy();
      this.incomeExpChart = null;
    }

    const totalSales = records.reduce((s, r) => s + parseFloat(r.totalSales || 0), 0);
    const totalSupply = supplies.reduce((s, r) => s + parseFloat(r.cost || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const netIncome = totalSales - totalSupply - totalExpenses;

    this.incomeExpChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Total Sales', 'Weekly Supply', 'School Funds', 'Net Balance'],
        datasets: [{
          data: [
            Math.max(totalSales, 0),
            Math.max(totalSupply, 0),
            Math.max(totalExpenses, 0),
            Math.max(netIncome, 0)
          ],
          backgroundColor: ['#2E7D32', '#C2760A', '#6B21A8', '#1565C0'],
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
