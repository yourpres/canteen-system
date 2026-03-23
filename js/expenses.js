// =============================================
// Monthly Expenses Module (SCHOOL ALLOCATIONS)
// =============================================

const ExpensesMgr = {
  expenses: [],
  editingExpenseId: null,

  // Matching the notebook categories (F, C, FP, H, S, R)
  CATEGORIES: {
    'F': { label: 'Feeding', color: '#FF9800' },
    'C': { label: 'Clinic', color: '#F44336' },
    'FP': { label: 'Faculty/Pupils', color: '#9C27B0' },
    'H': { label: 'HE (Home Economics)', color: '#795548' },
    'S': { label: 'School Operation', color: '#2196F3' },
    'R': { label: 'Revolving', color: '#4CAF50' }
  },

  getStoredExpenses() {
    return JSON.parse(localStorage.getItem('monthly_expenses')) || [];
  },

  setStoredExpenses(expenses) {
    localStorage.setItem('monthly_expenses', JSON.stringify(expenses));
  },

  load() {
    this.setupModal();
    this.setupFilters();
    this.loadExpenses();
  },

  setupModal() {
    const addBtn = document.getElementById('btnAddExpense');
    if (addBtn) addBtn.onclick = () => this.openModal();
    
    const closeBtn = document.getElementById('closeExpenseModal');
    if (closeBtn) closeBtn.onclick = () => this.closeModal();
    
    const saveBtn = document.getElementById('saveExpenseBtn');
    if (saveBtn) saveBtn.onclick = () => this.saveExpense();
  },

  setupFilters() {
    const monthFilter = document.getElementById('expenseMonthFilter');
    // Set default month if empty (using manual JS date to avoid error)
    if (monthFilter && !monthFilter.value) {
        monthFilter.value = new Date().toISOString().slice(0, 7);
    }
    if (monthFilter) monthFilter.onchange = () => this.loadExpenses();
  },

  openModal(data = null) {
    this.editingExpenseId = data ? data.id : null;
    const modal = document.getElementById('expenseModal');
    
    // Manual date calculation to fix the "todayStr not defined" error
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('expTitle').value = data ? data.title : '';
    document.getElementById('expAmount').value = data ? data.amount : '';
    document.getElementById('expCategory').value = data ? data.category : '';
    document.getElementById('expDate').value = data ? data.date : today;

    modal.style.display = 'flex';
  },

  closeModal() {
    document.getElementById('expenseModal').style.display = 'none';
  },

  saveExpense() {
    const title = document.getElementById('expTitle').value.trim();
    const amount = parseFloat(document.getElementById('expAmount').value) || 0;
    const category = document.getElementById('expCategory').value;
    const date = document.getElementById('expDate').value;

    if (!title || amount <= 0 || !category || !date) {
      showToast('Please fill all fields with valid data.', 'error');
      return;
    }

    const newExpense = {
      id: this.editingExpenseId || 'exp_' + Date.now(),
      title,
      amount,
      category,
      date,
      monthRef: date.slice(0, 7), 
      recordedBy: localStorage.getItem('userName') || 'Manager'
    };

    let expenses = this.getStoredExpenses();
    if (this.editingExpenseId) {
      expenses = expenses.map(e => e.id === this.editingExpenseId ? newExpense : e);
    } else {
      expenses.push(newExpense);
    }

    this.setStoredExpenses(expenses);
    showToast("School activity allocation saved!");
    this.closeModal();
    this.loadExpenses();
  },

  loadExpenses() {
    const monthFilter = document.getElementById('expenseMonthFilter')?.value || new Date().toISOString().slice(0, 7);
    const categoryFilter = document.getElementById('expenseCategoryFilter')?.value || '';

    let allExpenses = this.getStoredExpenses();
    let filtered = allExpenses.filter(e => e.monthRef === monthFilter);

    if (categoryFilter) {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    this.renderTable(filtered);
    this.updateSummary(filtered, monthFilter);
  },

  renderTable(expenses) {
    const tbody = document.getElementById('expensesBody');
    if (!tbody) return;

    if (expenses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No allocations recorded for this period.</td></tr>';
      return;
    }

    tbody.innerHTML = expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => {
      const cat = this.CATEGORIES[e.category] || { label: e.category, color: '#666' };
      return `
        <tr>
          <td>${e.date}</td>
          <td><strong>${e.title}</strong></td>
          <td>
            <span class="status-badge" style="background:${cat.color}20; color:${cat.color}; border:1px solid ${cat.color}40;">
              [${e.category}] ${cat.label}
            </span>
          </td>
          <td class="text-amber font-bold">${formatCurrency(e.amount)}</td>
          <td>
            <button class="btn-sm" onclick="ExpensesMgr.editExpense('${e.id}')">✏️</button>
            <button class="btn-sm btn-delete" onclick="ExpensesMgr.deleteExpense('${e.id}')">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  updateSummary(expensesInView, currentMonth) {
    const totalDeductions = expensesInView.reduce((s, e) => s + e.amount, 0);

    const dailyRecords = JSON.parse(localStorage.getItem('daily_records')) || [];
    const monthlyNetProfit = dailyRecords
      .filter(r => r.date.startsWith(currentMonth))
      .reduce((s, r) => s + parseFloat(r.netProfit), 0);

    const remainingBalance = monthlyNetProfit - totalDeductions;

    document.getElementById('expMonthlyIncome').textContent = formatCurrency(monthlyNetProfit);
    document.getElementById('expTotalExpenses').textContent = formatCurrency(totalDeductions);
    
    const balanceEl = document.getElementById('expRemainingBalance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(remainingBalance);
        balanceEl.style.color = remainingBalance < 0 ? '#d32f2f' : '#2E7D32';
    }

    const alertBox = document.getElementById('expenseOverAlert');
    if (alertBox) {
        alertBox.style.display = (totalDeductions > monthlyNetProfit && monthlyNetProfit > 0) ? 'flex' : 'none';
    }
  },

  editExpense(id) {
    const expenses = this.getStoredExpenses();
    const item = expenses.find(e => e.id === id);
    if (item) this.openModal(item);
  },

  deleteExpense(id) {
    if (confirm("Permanently delete this activity deduction?")) {
      const expenses = this.getStoredExpenses().filter(e => e.id !== id);
      this.setStoredExpenses(expenses);
      this.loadExpenses();
      showToast("Allocation removed", "error");
    }
  }
};