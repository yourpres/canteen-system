const ExpensesMgr = {
    DB_KEY: 'monthly_expenses',
    
    load() {
        this.updateSummary();
        this.renderTable();
    },

    openModal() {
        document.getElementById('expDate').value = Utils.today();
        document.getElementById('expenseModal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('expenseModal').style.display = 'none';
    },

    // Syncs logic with daily_records.js profit
    updateSummary() {
        const monthFilter = document.getElementById('expenseMonthFilter').value || Utils.thisMonth();
        
        // 1. Get Profit from Daily Ledger
        const dailyRecords = JSON.parse(localStorage.getItem('daily_records')) || [];
        const monthlyProfit = dailyRecords
            .filter(r => r.date.startsWith(monthFilter))
            .reduce((sum, r) => sum + parseFloat(r.netProfit), 0);

        // 2. Get existing School Allocations
        const expenses = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        const totalAllocated = expenses
            .filter(e => e.date.startsWith(monthFilter))
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);

        const remaining = monthlyProfit - totalAllocated;

        // 3. Update UI
        document.getElementById('expMonthlyIncome').textContent = Utils.formatCurrency(monthlyProfit);
        document.getElementById('expRemainingBalance').textContent = Utils.formatCurrency(remaining);
        
        // Color coding for balance
        const balEl = document.getElementById('expRemainingBalance');
        balEl.style.color = remaining < 0 ? '#C62828' : '#2E7D32';

        // Toggle Alert
        const alert = document.getElementById('expenseOverAlert');
        if(alert) alert.style.display = (totalAllocated > monthlyProfit && monthlyProfit > 0) ? 'flex' : 'none';
    },

    saveExpense() {
        const title = document.getElementById('expTitle').value.trim();
        const category = document.getElementById('expCategory').value;
        const amount = parseFloat(document.getElementById('expAmount').value) || 0;
        const date = document.getElementById('expDate').value;

        if (!title || amount <= 0 || !category) {
            Utils.showToast("Please fill in all allocation details", "error");
            return;
        }

        const newAllocation = {
            id: 'exp_' + Date.now(),
            title, category, amount, date,
            recordedBy: localStorage.getItem('userName')
        };

        let expenses = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        expenses.push(newAllocation);
        localStorage.setItem(this.DB_KEY, JSON.stringify(expenses));

        Utils.showToast("School Fund Allocation Saved");
        this.closeModal();
        this.load();
    },

    renderTable() {
        const monthFilter = document.getElementById('expenseMonthFilter').value || Utils.thisMonth();
        const expenses = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        const filtered = expenses.filter(e => e.date.startsWith(monthFilter));

        const tbody = document.getElementById('expensesBody');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No school allocations recorded for this month.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.sort((a,b) => b.date.localeCompare(a.date)).map(e => `
            <tr>
                <td>${e.date}</td>
                <td><strong>${e.title}</strong></td>
                <td><span class="status-badge" style="background:#eee; color:#333;">Category ${e.category}</span></td>
                <td class="font-bold" style="color:#d32f2f">${Utils.formatCurrency(e.amount)}</td>
                <td><button class="btn-sm btn-delete" onclick="ExpensesMgr.deleteExpense('${e.id}')">🗑</button></td>
            </tr>
        `).join('');
    },

    deleteExpense(id) {
        if(confirm("Permanently remove this school allocation?")) {
            let expenses = JSON.parse(localStorage.getItem(this.DB_KEY)).filter(e => e.id !== id);
            localStorage.setItem(this.DB_KEY, JSON.stringify(expenses));
            this.load();
        }
    }
};