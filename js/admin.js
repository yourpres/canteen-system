const AdminPanel = {
    DB_KEY: 'canteen_users',

    load() {
        this.renderUserTable();
        this.loadQuickStats();
    },

    openModal() {
        document.getElementById('managerName').value = '';
        document.getElementById('managerEmail').value = '';
        document.getElementById('managerTempPass').value = '';
        document.getElementById('managerModal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('managerModal').style.display = 'none';
    },

    saveManager() {
        const name = document.getElementById('managerName').value.trim();
        const email = document.getElementById('managerEmail').value.trim().toLowerCase();
        const password = document.getElementById('managerTempPass').value.trim();

        if (!name || !email || !password) {
            Utils.showToast("All fields are required", "error");
            return;
        }

        let users = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        if (users.find(u => u.email === email)) {
            Utils.showToast("This email is already in use", "error");
            return;
        }

        users.push({
            id: 'u_' + Date.now(),
            name, email, password,
            role: 'manager',
            active: true,
            createdAt: new Date().toISOString()
        });

        localStorage.setItem(this.DB_KEY, JSON.stringify(users));
        Utils.showToast(`Manager account created for ${name}`);
        this.closeModal();
        this.load();
    },

    renderUserTable() {
        const users = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        const currentEmail = localStorage.getItem('userEmail');

        document.getElementById('usersBody').innerHTML = users.map(u => {
            const isMe = u.email === currentEmail;
            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div class="user-avatar" style="width:30px; height:30px; font-size:12px;">${u.name[0].toUpperCase()}</div>
                            <strong>${u.name} ${isMe ? '(You)' : ''}</strong>
                        </div>
                    </td>
                    <td>${u.email}</td>
                    <td><span class="status-badge ${u.role === 'admin' ? 'status-admin' : 'status-manager'}">${u.role.toUpperCase()}</span></td>
                    <td><span class="status-badge ${u.active ? 'status-active' : 'status-inactive'}">${u.active ? 'Active' : 'Deactivated'}</span></td>
                    <td style="text-align:center;">
                        ${!isMe ? `
                            <div class="admin-action-group">
                                <button class="admin-table-btn admin-table-btn-warning" onclick="AdminPanel.toggleStatus('${u.id}')">
                                    ${u.active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button class="admin-table-btn admin-table-btn-danger" onclick="AdminPanel.deleteUser('${u.id}')">
                                    Delete
                                </button>
                            </div>
                        ` : '<span class="text-muted">—</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    },

    loadQuickStats() {
        const users = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        const dailyRecords = JSON.parse(localStorage.getItem('daily_records')) || [];
        const expenses = JSON.parse(localStorage.getItem('monthly_expenses')) || [];

        const totalUsers = users.length;
        const activeManagers = users.filter(u => u.active && u.role === 'manager').length;
        const totalAdmins = users.filter(u => u.role === 'admin').length;

        const totalSchoolIncome = dailyRecords.reduce((sum, record) => sum + (parseFloat(record.netProfit) || 0), 0);
        const totalSales = dailyRecords.reduce((sum, record) => sum + (parseFloat(record.totalSales) || 0), 0);
        const totalAllocations = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
        const remainingBalance = totalSchoolIncome - totalAllocations;

        document.getElementById('adminTotalUsers').textContent = totalUsers;
        document.getElementById('adminActiveCount').textContent = activeManagers;

        const totalUsersEl = document.getElementById('adminTotalUsers');
        if (totalUsersEl) totalUsersEl.textContent = totalUsers;

        const activeManagersEl = document.getElementById('adminActiveManagers');
        if (activeManagersEl) activeManagersEl.textContent = activeManagers;

        const totalAdminsEl = document.getElementById('adminTotalAdmins');
        if (totalAdminsEl) totalAdminsEl.textContent = totalAdmins;

        const schoolIncomeEl = document.getElementById('adminSchoolIncome');
        if (schoolIncomeEl) schoolIncomeEl.textContent = Utils.formatCurrency(totalSchoolIncome);

        const quickTable = document.getElementById('adminQuickUserList');
        if (quickTable) {
            quickTable.innerHTML = users.slice(0, 5).map(u => `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td style="text-align:center;">
                        <span class="status-badge ${u.active ? 'status-active' : 'status-inactive'}">
                            ${u.active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                </tr>
            `).join('');
        }

        const salesEl = document.getElementById('adminTotalSales');
        if (salesEl) salesEl.textContent = Utils.formatCurrency(totalSales);

        const allocationsEl = document.getElementById('adminTotalAllocations');
        if (allocationsEl) allocationsEl.textContent = Utils.formatCurrency(totalAllocations);

        const balanceEl = document.getElementById('adminRemainingBalance');
        if (balanceEl) {
            balanceEl.textContent = Utils.formatCurrency(remainingBalance);
            balanceEl.style.color = remainingBalance < 0 ? 'var(--red)' : 'var(--green)';
        }
    },

    toggleStatus(id) {
        let users = JSON.parse(localStorage.getItem(this.DB_KEY));
        const user = users.find(u => u.id === id);
        if (user) {
            user.active = !user.active;
            localStorage.setItem(this.DB_KEY, JSON.stringify(users));
            this.load();
        }
    },

    deleteUser(id) {
        if (confirm("Permanently delete this account?")) {
            let users = JSON.parse(localStorage.getItem(this.DB_KEY)).filter(u => u.id !== id);
            localStorage.setItem(this.DB_KEY, JSON.stringify(users));
            this.load();
        }
    }
};
