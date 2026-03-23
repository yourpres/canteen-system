// =============================================
// Reports Module
// =============================================

const Reports = {
  reportChart: null,
  categoryChart: null,
  reportData: null,

  init() {
    this.setupFilters();
    const today = todayStr();
    const firstOfMonth = today.slice(0, 7) + '-01';
    const dateFrom = document.getElementById('reportDateFrom');
    const dateTo = document.getElementById('reportDateTo');
    if (dateFrom && !dateFrom.value) dateFrom.value = firstOfMonth;
    if (dateTo && !dateTo.value) dateTo.value = today;
  },

  setupFilters() {
    document.getElementById('generateReportBtn')?.addEventListener('click', () => this.generateReport());
    document.getElementById('exportPDFBtn')?.addEventListener('click', () => this.exportPDF());
    document.getElementById('exportCSVBtn')?.addEventListener('click', () => this.exportCSV());

    document.getElementById('reportType')?.addEventListener('change', (e) => {
      this.setDateRangeByType(e.target.value);
    });
  },

  setDateRangeByType(type) {
    const range = getDateRange(type);
    const from = document.getElementById('reportDateFrom');
    const to = document.getElementById('reportDateTo');
    if (from) from.value = range.from;
    if (to) to.value = range.to;
  },

  async generateReport() {
    const from = document.getElementById('reportDateFrom')?.value;
    const to = document.getElementById('reportDateTo')?.value;

    if (!from || !to) { showToast('Please select a date range.', 'error'); return; }
    if (from > to) { showToast('From date must be before To date.', 'error'); return; }

    const btn = document.getElementById('generateReportBtn');
    btn.disabled = true;
    btn.textContent = 'Generating…';

    try {
      const [records, expenses] = await Promise.all([
        this.fetchRecords(from, to),
        this.fetchExpenses(from, to)
      ]);

      const totals = this.calcTotals(records, expenses);
      const productAnalysis = this.analyzeProducts(records);
      const dailyBreakdown = this.buildDailyBreakdown(records, expenses);

      this.reportData = { from, to, records, expenses, totals, productAnalysis, dailyBreakdown };

      this.renderReport(this.reportData);
      document.getElementById('reportOutput').style.display = 'block';
      document.getElementById('reportOutput').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      console.error('Report error:', e);
      showToast('Error generating report: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate Report';
    }
  },

  async fetchRecords(from, to) {
    const snap = await db.collection(COLLECTIONS.DAILY_RECORDS)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .orderBy('date', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async fetchExpenses(from, to) {
    const snap = await db.collection(COLLECTIONS.EXPENSES)
      .where('date', '>=', from)
      .where('date', '<=', to).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  calcTotals(records, expenses) {
    const totalSales = records.reduce((s, r) => s + parseFloat(r.totalSales || 0), 0);
    const totalCost = records.reduce((s, r) => s + parseFloat(r.totalCost || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const netIncome = totalSales - totalCost - totalExpenses;
    return { totalSales, totalCost, totalExpenses, netIncome };
  },

  analyzeProducts(records) {
    const productMap = {};
    records.forEach(record => {
      (record.products || []).forEach(p => {
        const key = p.name?.trim().toLowerCase() || 'unknown';
        if (!productMap[key]) productMap[key] = { name: p.name, qty: 0, totalSales: 0, totalCost: 0 };
        const qty = parseFloat(p.quantity) || 0;
        productMap[key].qty += qty;
        productMap[key].totalSales += qty * (parseFloat(p.sellingPrice) || 0);
        productMap[key].totalCost += qty * (parseFloat(p.costPrice) || 0);
      });
    });
    return Object.values(productMap).map(p => ({
      ...p,
      grossProfit: p.totalSales - p.totalCost,
      margin: p.totalSales > 0 ? ((p.totalSales - p.totalCost) / p.totalSales * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.grossProfit - a.grossProfit);
  },

  buildDailyBreakdown(records, expenses) {
    const dayMap = {};

    records.forEach(r => {
      if (!dayMap[r.date]) dayMap[r.date] = { date: r.date, sales: 0, cost: 0, expenses: 0 };
      dayMap[r.date].sales += parseFloat(r.totalSales || 0);
      dayMap[r.date].cost += parseFloat(r.totalCost || 0);
    });

    expenses.forEach(e => {
      if (!dayMap[e.date]) dayMap[e.date] = { date: e.date, sales: 0, cost: 0, expenses: 0 };
      dayMap[e.date].expenses += parseFloat(e.amount || 0);
    });

    return Object.values(dayMap)
      .map(d => ({ ...d, netProfit: d.sales - d.cost - d.expenses }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  renderReport(data) {
    const { from, to, totals, productAnalysis, dailyBreakdown, expenses } = data;

    // Summary cards
    document.getElementById('rptTotalSales').textContent = formatCurrency(totals.totalSales);
    document.getElementById('rptTotalExpenses').textContent = formatCurrency(totals.totalExpenses);
    document.getElementById('rptTotalCost').textContent = formatCurrency(totals.totalCost);
    const netEl = document.getElementById('rptNetIncome');
    netEl.textContent = formatCurrency(totals.netIncome);
    netEl.style.color = totals.netIncome >= 0 ? 'var(--green)' : 'var(--red)';

    // Period label
    document.getElementById('reportPeriodLabel').textContent =
      `${formatDate(from)} — ${formatDate(to)}`;

    // Signature
    document.getElementById('reportSignatureLabel').textContent =
      `Prepared by: ${currentUserData?.name || currentUser?.displayName || '_______________'}`;

    // Charts
    this.renderMainChart(dailyBreakdown);
    this.renderCategoryChart(expenses);

    // Product table
    const prodBody = document.getElementById('reportProductBody');
    if (prodBody) {
      if (productAnalysis.length === 0) {
        prodBody.innerHTML = '<tr><td colspan="6" class="empty-msg">No product data.</td></tr>';
      } else {
        prodBody.innerHTML = productAnalysis.map(p => `
          <tr>
            <td class="font-bold">${p.name}</td>
            <td>${p.qty}</td>
            <td class="text-green">${formatCurrency(p.totalSales)}</td>
            <td class="text-amber">${formatCurrency(p.totalCost)}</td>
            <td class="font-bold" style="color:${p.grossProfit>=0?'var(--green)':'var(--red)'}">
              ${formatCurrency(p.grossProfit)}
            </td>
            <td>${p.margin}%</td>
          </tr>
        `).join('');
      }
    }

    // Daily table
    const dailyBody = document.getElementById('reportDailyBody');
    if (dailyBody) {
      if (dailyBreakdown.length === 0) {
        dailyBody.innerHTML = '<tr><td colspan="5" class="empty-msg">No records in this period.</td></tr>';
      } else {
        let totalSales = 0, totalCost = 0, totalExp = 0, totalNet = 0;
        dailyBody.innerHTML = dailyBreakdown.map(d => {
          totalSales += d.sales; totalCost += d.cost; totalExp += d.expenses; totalNet += d.netProfit;
          return `
            <tr>
              <td>${formatDate(d.date)}</td>
              <td class="text-green">${formatCurrency(d.sales)}</td>
              <td class="text-amber">${formatCurrency(d.cost)}</td>
              <td>${formatCurrency(d.expenses)}</td>
              <td class="font-bold" style="color:${d.netProfit>=0?'var(--blue)':'var(--red)'}">
                ${formatCurrency(d.netProfit)}
              </td>
            </tr>
          `;
        }).join('') + `
          <tr class="table-total">
            <td>TOTAL</td>
            <td>${formatCurrency(totalSales)}</td>
            <td>${formatCurrency(totalCost)}</td>
            <td>${formatCurrency(totalExp)}</td>
            <td>${formatCurrency(totalNet)}</td>
          </tr>
        `;
      }
    }
  },

  renderMainChart(dailyBreakdown) {
    const ctx = document.getElementById('reportMainChart');
    if (!ctx) return;
    if (this.reportChart) { this.reportChart.destroy(); this.reportChart = null; }

    const labels = dailyBreakdown.map(d => formatDate(d.date));
    this.reportChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Sales', data: dailyBreakdown.map(d => d.sales), backgroundColor: 'rgba(46,125,50,0.7)', borderRadius: 4 },
          { label: 'Cost', data: dailyBreakdown.map(d => d.cost), backgroundColor: 'rgba(245,127,23,0.7)', borderRadius: 4 },
          { label: 'Expenses', data: dailyBreakdown.map(d => d.expenses), backgroundColor: 'rgba(198,40,40,0.6)', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { callback: v => '₱' + v.toLocaleString() } } }
      }
    });
  },

  renderCategoryChart(expenses) {
    const ctx = document.getElementById('reportCategoryChart');
    if (!ctx) return;
    if (this.categoryChart) { this.categoryChart.destroy(); this.categoryChart = null; }

    const totals = {};
    expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + parseFloat(e.amount || 0); });

    const labels = Object.keys(totals).map(k => `${k} — ${EXPENSE_CATEGORIES[k]?.label || k}`);
    const data = Object.values(totals);
    const colors = Object.keys(totals).map(k => EXPENSE_CATEGORIES[k]?.color || '#999');

    this.categoryChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => `${c.label}: ₱${c.raw.toLocaleString()}` } } }
      }
    });
  },

  // ---- PDF EXPORT ----

  exportPDF() {
    if (!this.reportData) { showToast('Please generate a report first.', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const { from, to, totals, productAnalysis, dailyBreakdown, expenses } = this.reportData;
    const managerName = currentUserData?.name || currentUser?.displayName || 'Manager';

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('San Ignacio Elementary School', 105, 18, { align: 'center' });

    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Canteen Financial Report', 105, 26, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${formatDate(from)} — ${formatDate(to)}`, 105, 33, { align: 'center' });
    doc.setTextColor(0);

    // Summary
    let y = 42;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 14, y); y += 6;

    doc.autoTable({
      startY: y,
      head: [['Metric', 'Amount']],
      body: [
        ['Total Sales', formatCurrency(totals.totalSales)],
        ['Total Material Cost', formatCurrency(totals.totalCost)],
        ['Total Expenses', formatCurrency(totals.totalExpenses)],
        ['Net Income', formatCurrency(totals.netIncome)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [46, 125, 50], textColor: 255 },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right' } }
    });

    y = doc.lastAutoTable.finalY + 10;

    // Product Analysis
    if (productAnalysis.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Per-Product Analysis', 14, y); y += 4;
      doc.autoTable({
        startY: y,
        head: [['Product', 'Qty Sold', 'Total Sales', 'Total Cost', 'Gross Profit', 'Margin %']],
        body: productAnalysis.map(p => [
          p.name,
          p.qty,
          formatCurrency(p.totalSales),
          formatCurrency(p.totalCost),
          formatCurrency(p.grossProfit),
          p.margin + '%'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [46, 125, 50], textColor: 255 },
        styles: { fontSize: 9 }
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Daily breakdown
    if (dailyBreakdown.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text('Daily Records', 14, y); y += 4;
      doc.autoTable({
        startY: y,
        head: [['Date', 'Sales', 'Material Cost', 'Expenses', 'Net Profit']],
        body: dailyBreakdown.map(d => [
          formatDate(d.date),
          formatCurrency(d.sales),
          formatCurrency(d.cost),
          formatCurrency(d.expenses),
          formatCurrency(d.netProfit)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [46, 125, 50], textColor: 255 },
        styles: { fontSize: 9 }
      });
      y = doc.lastAutoTable.finalY + 16;
    }

    // Expense Breakdown
    if (expenses.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Records', 14, y); y += 4;
      doc.autoTable({
        startY: y,
        head: [['Date', 'Title', 'Category', 'Amount', 'Notes']],
        body: expenses.map(e => [
          formatDate(e.date),
          e.title,
          `${e.category} — ${EXPENSE_CATEGORIES[e.category]?.label || e.category}`,
          formatCurrency(e.amount),
          e.notes || '—'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [46, 125, 50], textColor: 255 },
        styles: { fontSize: 9 }
      });
      y = doc.lastAutoTable.finalY + 20;
    }

    // Signature
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Prepared by: ${managerName}`, 130, y);
    doc.line(128, y + 6, 195, y + 6);
    doc.text(`Date: ${formatDate(todayStr())}`, 130, y + 12);

    doc.save(`Canteen_Report_${from}_to_${to}.pdf`);
    showToast('PDF exported successfully!');
  },

  // ---- CSV EXPORT ----

  exportCSV() {
    if (!this.reportData) { showToast('Please generate a report first.', 'error'); return; }

    const { from, to, totals, productAnalysis, dailyBreakdown } = this.reportData;
    let csv = '';

    // Header
    csv += `San Ignacio Elementary School - Canteen Financial Report\n`;
    csv += `Period: ${formatDate(from)} to ${formatDate(to)}\n`;
    csv += `Generated by: ${currentUserData?.name || 'Manager'}\n\n`;

    // Summary
    csv += 'FINANCIAL SUMMARY\n';
    csv += `Total Sales,${totals.totalSales.toFixed(2)}\n`;
    csv += `Total Material Cost,${totals.totalCost.toFixed(2)}\n`;
    csv += `Total Expenses,${totals.totalExpenses.toFixed(2)}\n`;
    csv += `Net Income,${totals.netIncome.toFixed(2)}\n\n`;

    // Products
    csv += 'PER-PRODUCT ANALYSIS\n';
    csv += 'Product,Qty Sold,Total Sales,Total Cost,Gross Profit,Margin %\n';
    productAnalysis.forEach(p => {
      csv += `"${p.name}",${p.qty},${p.totalSales.toFixed(2)},${p.totalCost.toFixed(2)},${p.grossProfit.toFixed(2)},${p.margin}%\n`;
    });
    csv += '\n';

    // Daily
    csv += 'DAILY BREAKDOWN\n';
    csv += 'Date,Sales,Material Cost,Expenses,Net Profit\n';
    dailyBreakdown.forEach(d => {
      csv += `${d.date},${d.sales.toFixed(2)},${d.cost.toFixed(2)},${d.expenses.toFixed(2)},${d.netProfit.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Canteen_Report_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully!');
  }
};
