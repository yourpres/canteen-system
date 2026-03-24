const DailyRecords = {
    products: [],
    editingId: null,

    load() { this.loadHistory(); },

    openModal(record = null) {
        this.editingId = record ? record.id : null;
        this.products = record ? JSON.parse(JSON.stringify(record.products)) : [{ name: '', quantity: 0, cost: 0, price: 0 }];
        document.getElementById('modalRecordDate').value = record ? record.date : todayStr();
        this.renderForm();
        document.getElementById('recordModal').style.display = 'flex';
    },

    closeModal() { document.getElementById('recordModal').style.display = 'none'; },

    addProductRow() {
        this.products.push({ name: '', quantity: 0, cost: 0, price: 0 });
        this.renderForm();
    },

    updateValue(i, field, val) {
        this.products[i][field] = field === 'name' ? val : parseFloat(val) || 0;
        this.calculate();
    },

    removeRow(i) {
        this.products.splice(i, 1);
        this.renderForm();
    },

    calculate() {
        let sales = 0, expenses = 0;
        this.products.forEach((p, i) => {
            const rowSales = p.quantity * p.price;
            sales += rowSales;
            expenses += p.cost; // Fixed: Not multiplied by qty
            // Update row labels if they exist
            const sLab = document.getElementById(`rowSales_${i}`);
            if(sLab) sLab.textContent = formatCurrency(rowSales);
        });
        document.getElementById('rsTotalSales').textContent = formatCurrency(sales);
        document.getElementById('rsTotalCost').textContent = formatCurrency(expenses);
        document.getElementById('rsNetProfit').textContent = formatCurrency(sales - expenses);
    },

    renderForm() {
        const tbody = document.getElementById('productsBody');
        tbody.innerHTML = this.products.map((p, i) => `
            <tr>
                <td><input type="text" class="table-input" value="${p.name}" oninput="DailyRecords.updateValue(${i},'name',this.value)"></td>
                <td style="text-align:center;"><input type="number" class="table-input" value="${p.quantity}" oninput="DailyRecords.updateValue(${i},'quantity',this.value)"></td>
                <td style="text-align:right;"><input type="number" class="table-input" value="${p.cost}" oninput="DailyRecords.updateValue(${i},'cost',this.value)"></td>
                <td style="text-align:right;"><input type="number" class="table-input" value="${p.price}" oninput="DailyRecords.updateValue(${i},'price',this.value)"></td>
                <td id="rowSales_${i}" class="font-bold" style="text-align:right;">${formatCurrency(p.quantity * p.price)}</td>
                <td style="text-align:center;"><button onclick="DailyRecords.removeRow(${i})" class="act-btn act-btn-delete">✕</button></td>
            </tr>
        `).join('');
        this.calculate();
    },

    saveRecord() {
        const date = document.getElementById('modalRecordDate').value;
        const totalSales = parseFloat(document.getElementById('rsTotalSales').textContent.replace(/[^\d.-]/g, ''));
        const totalCost = parseFloat(document.getElementById('rsTotalCost').textContent.replace(/[^\d.-]/g, ''));
        
        const entry = {
            id: this.editingId || 'rec_' + Date.now(),
            date, products: this.products.filter(p => p.name),
            totalSales, totalCost, netProfit: totalSales - totalCost,
            createdBy: localStorage.getItem('userName')
        };

        let history = JSON.parse(localStorage.getItem('daily_records')) || [];
        if(this.editingId) history = history.map(h => h.id === this.editingId ? entry : h);
        else history.push(entry);

        localStorage.setItem('daily_records', JSON.stringify(history));
        this.closeModal();
        this.loadHistory();
        showToast("Daily Ledger Updated");
    },

    loadHistory() {
        const from = document.getElementById('filterDateFrom').value;
        const to = document.getElementById('filterDateTo').value;
        let history = JSON.parse(localStorage.getItem('daily_records')) || [];
        
        // Apply filter based on what dates are provided
        if(from || to) {
            history = history.filter(h => {
                if(from && to) return h.date >= from && h.date <= to;
                if(from) return h.date >= from;
                if(to) return h.date <= to;
                return true;
            });
        }

        let totalSales = 0, totalExpenses = 0, totalProfit = 0;
        document.getElementById('recordsHistoryBody').innerHTML = history.length === 0
            ? '<tr><td colspan="5"><div class="tbl-empty"><div class="tbl-empty-icon">📝</div><p>No records found.</p></div></td></tr>'
            : history.sort((a,b)=>b.date.localeCompare(a.date)).map(h => {
                totalSales += h.totalSales;
                totalExpenses += h.totalCost;
                totalProfit += h.netProfit;
                return `
                    <tr>
                        <td style="text-align:left;">${h.date}</td>
                        <td style="text-align:right; font-variant-numeric:tabular-nums; font-weight:600;">${formatCurrency(h.totalSales)}</td>
                        <td style="text-align:right; font-variant-numeric:tabular-nums; font-weight:600;">${formatCurrency(h.totalCost)}</td>
                        <td style="text-align:right; font-variant-numeric:tabular-nums; font-weight:600;">${formatCurrency(h.netProfit)}</td>
                        <td style="text-align:center;">
                            <div class="action-group">
                                <button class="act-btn act-btn-view" onclick="DailyRecords.viewInSystem('${h.id}')">👁 View</button>
                                <button class="act-btn act-btn-view" onclick="DailyRecords.exportSingleRecordPDF('${h.id}')">📄 PDF</button>
                                <button class="act-btn act-btn-delete" onclick="DailyRecords.deleteRecord('${h.id}')">🗑 Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

        // Update footer totals
        document.getElementById('footTotalSales').textContent = formatCurrency(totalSales);
        document.getElementById('footTotalExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('footNetProfit').textContent = formatCurrency(totalProfit);

        // Update header chips
        document.getElementById('ledgerTotalSales').textContent = formatCurrency(totalSales);
        document.getElementById('ledgerTotalExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('ledgerTotalProfit').textContent = formatCurrency(totalProfit);
    },

    viewInSystem(id) {
        const r = JSON.parse(localStorage.getItem('daily_records')).find(rec => rec.id === id);
        // Open in edit mode
        this.openModal(r);
    },

    deleteRecord(id) {
        if (!confirm("Delete this ledger entry? This action cannot be undone.")) return;
        
        let history = JSON.parse(localStorage.getItem('daily_records')) || [];
        history = history.filter(h => h.id !== id);
        localStorage.setItem('daily_records', JSON.stringify(history));
        this.loadHistory();
        showToast("Ledger entry deleted successfully", "success");
    },

    exportDateRangePDF() {
        const from = document.getElementById('filterDateFrom').value;
        const to = document.getElementById('filterDateTo').value;
        let history = JSON.parse(localStorage.getItem('daily_records')) || [];
        
        if (!from && !to) return showToast("Please select at least one date", "error");
        
        let filtered = history.filter(h => {
            if(from && to) return h.date >= from && h.date <= to;
            if(from) return h.date >= from;
            if(to) return h.date <= to;
            return true;
        });
        
        if (filtered.length === 0) return showToast("No records found for the selected date range", "error");
        
        // Call async function
        Reports.exportLedgerDateRangePDF(filtered, from, to).catch(err => {
            console.error('PDF export error:', err);
            showToast("Error generating PDF", "error");
        });
    },

    exportSingleRecordPDF(recordId) {
        let history = JSON.parse(localStorage.getItem('daily_records')) || [];
        const record = history.find(r => r.id === recordId);
        
        if (!record) return showToast("Record not found", "error");
        
        // Call async function
        Reports.exportLedgerPDF(record).catch(err => {
            console.error('PDF export error:', err);
            showToast("Error generating PDF", "error");
        });
    }
};