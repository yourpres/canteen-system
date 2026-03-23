// =============================================
// Daily Records Module (SIMPLIFIED, FILTERABLE & EDITABLE)
// =============================================

const DailyRecords = {
  products: [],
  editingRecordId: null,

  getStoredRecords() {
    return JSON.parse(localStorage.getItem('daily_records')) || [];
  },

  setStoredRecords(records) {
    localStorage.setItem('daily_records', JSON.stringify(records));
  },

  load() {
    this.setupModal();
    this.loadHistory(); 
  },

  setupModal() {
    const addBtn = document.getElementById('btnAddRecord');
    if (addBtn) addBtn.onclick = () => this.openModal();
  },

  clearFilter() {
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    this.loadHistory();
  },

  openModal(recordData = null) {
    this.products = [];
    // If recordData exists, we are EDITING. If null, we are CREATING NEW.
    this.editingRecordId = recordData ? recordData.id : null;

    const modal = document.getElementById('recordModal');
    const dateInput = document.getElementById('modalRecordDate');
    const title = document.querySelector('#recordModal h3');

    if (recordData) {
      if(title) title.textContent = "Edit Ledger Entry";
      dateInput.value = recordData.date;
      // Deep copy products to avoid direct reference issues
      this.products = JSON.parse(JSON.stringify(recordData.products));
    } else {
      if(title) title.textContent = "Record Daily Sales & Expenses";
      dateInput.value = new Date().toISOString().split('T')[0];
      this.addProductRow(); 
    }

    this.renderTable();
    modal.style.display = 'flex';
  },

  closeModal() {
    this.editingRecordId = null; // Reset editing state
    document.getElementById('recordModal').style.display = 'none';
  },

  addProductRow() {
    this.products.push({ 
        id: Date.now() + Math.random(), 
        name: '', 
        quantity: 0, 
        cost: 0,  
        price: 0  
    });
    this.renderTable();
  },

  removeRow(index) {
    this.products.splice(index, 1);
    this.renderTable();
  },

  updateValue(index, field, value) {
    const val = (field === 'name') ? value : parseFloat(value) || 0;
    this.products[index][field] = val;
    
    const rowSales = this.products[index].quantity * this.products[index].price;
    const rowCost = this.products[index].cost; 
    
    const salesLabel = document.getElementById(`rowSales_${index}`);
    const costLabel = document.getElementById(`rowCost_${index}`);
    
    if (salesLabel) salesLabel.textContent = formatCurrency(rowSales);
    if (costLabel) costLabel.textContent = formatCurrency(rowCost);

    this.calculateGrandTotals();
  },

  renderTable() {
    const tbody = document.getElementById('productsBody');
    if (!tbody) return;

    tbody.innerHTML = this.products.map((p, i) => `
      <tr>
        <td><input type="text" class="table-input" value="${p.name}" placeholder="e.g. Lomi" oninput="DailyRecords.updateValue(${i}, 'name', this.value)"></td>
        <td><input type="number" class="table-input" value="${p.quantity}" oninput="DailyRecords.updateValue(${i}, 'quantity', this.value)"></td>
        <td><input type="number" class="table-input" value="${p.cost}" placeholder="Fixed Cost" oninput="DailyRecords.updateValue(${i}, 'cost', this.value)"></td>
        <td><input type="number" class="table-input" value="${p.price}" placeholder="Price/ea" oninput="DailyRecords.updateValue(${i}, 'price', this.value)"></td>
        <td id="rowSales_${i}" class="font-bold" style="color:#2E7D32">${formatCurrency(p.quantity * p.price)}</td>
        <td id="rowCost_${i}" class="font-bold" style="color:#d32f2f">${formatCurrency(p.cost)}</td>
        <td><button class="btn-delete" onclick="DailyRecords.removeRow(${i})">✕</button></td>
      </tr>
    `).join('');
    
    this.calculateGrandTotals();
  },

  calculateGrandTotals() {
    let totalSales = 0;
    let totalExpenses = 0;

    this.products.forEach(p => {
        totalSales += (p.quantity * p.price);
        totalExpenses += p.cost; 
    });

    const netProfit = totalSales - totalExpenses;

    document.getElementById('rsTotalSales').textContent = formatCurrency(totalSales);
    document.getElementById('rsTotalCost').textContent = formatCurrency(totalExpenses);
    document.getElementById('rsNetProfit').textContent = formatCurrency(netProfit);
    
    document.getElementById('rsNetProfit').style.color = netProfit < 0 ? '#d32f2f' : '#2E7D32';
  },

  saveRecord() {
    const date = document.getElementById('modalRecordDate').value;
    if (!date) return showToast("Select Date", "error");

    const validProducts = this.products.filter(p => p.name.trim() !== '');
    if (validProducts.length === 0) return showToast("Add at least one product", "error");

    let totalSales = 0;
    let totalCost = 0;
    validProducts.forEach(p => {
        totalSales += (p.quantity * p.price);
        totalCost += p.cost;
    });

    const recordEntry = {
      id: this.editingRecordId || 'rec_' + Date.now(), // Keep ID if editing
      date,
      products: validProducts,
      totalSales,
      totalCost, 
      netProfit: totalSales - totalCost,
      createdBy: localStorage.getItem('userName') || "Manager"
    };

    let history = this.getStoredRecords();

    if (this.editingRecordId) {
      // Update existing record
      history = history.map(r => r.id === this.editingRecordId ? recordEntry : r);
      showToast("Ledger entry updated!");
    } else {
      // Add new record
      history.push(recordEntry);
      showToast("Daily Ledger entry saved!");
    }

    this.setStoredRecords(history);
    this.closeModal();
    this.loadHistory();

    if(window.Dashboard) Dashboard.load();
  },

  loadHistory() {
    const tbody = document.getElementById('recordsHistoryBody');
    if (!tbody) return;

    let history = this.getStoredRecords();
    const fromDate = document.getElementById('filterDateFrom').value;
    const toDate = document.getElementById('filterDateTo').value;

    if (fromDate && toDate) {
        history = history.filter(r => r.date >= fromDate && r.date <= toDate);
    }

    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-msg" style="padding:30px;">No records found.</td></tr>';
      return;
    }

    tbody.innerHTML = history.sort((a,b) => new Date(b.date) - new Date(a.date)).map(r => `
      <tr>
        <td><strong>${r.date}</strong></td>
        <td class="text-green">${formatCurrency(r.totalSales)}</td>
        <td class="text-red">${formatCurrency(r.totalCost)}</td>
        <td class="font-bold" style="color: ${r.netProfit >= 0 ? '#2E7D32' : '#d32f2f'}">${formatCurrency(r.netProfit)}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button class="action-btn btn-view" onclick="DailyRecords.viewFormalLedger('${r.id}')">👁 View</button>
            <button class="action-btn btn-edit" onclick="DailyRecords.editRecord('${r.id}')">✏️ Edit</button>
            <button class="action-btn btn-delete-record" onclick="DailyRecords.deleteRecord('${r.id}')">🗑 Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  // --- NEW EDIT FUNCTION ---
  editRecord(id) {
    const history = this.getStoredRecords();
    const record = history.find(r => r.id === id);
    if (record) {
        this.openModal(record);
    } else {
        showToast("Record not found", "error");
    }
  },

  deleteRecord(id) {
    if(confirm("Permanently delete this ledger entry?")) {
        let history = this.getStoredRecords().filter(r => r.id !== id);
        this.setStoredRecords(history);
        this.loadHistory();
        showToast("Entry removed", "error");
    }
  },

  viewFormalLedger(id) {
    const r = this.getStoredRecords().find(rec => rec.id === id);
    if (!r) return;

    const content = document.getElementById('viewLedgerContent');
    document.getElementById('viewLedgerTitle').textContent = `Ledger Details: ${r.date}`;
    
    let rowsHtml = r.products.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.quantity}</td>
        <td>${formatCurrency(p.cost)}</td>
        <td>${formatCurrency(p.price)}</td>
        <td>${formatCurrency(p.quantity * p.price)}</td>
      </tr>
    `).join('');

    content.innerHTML = `
      <div style="padding:10px; border:1px solid #ddd; background:#fff;">
        <h4 style="color:var(--deped-green)">SAN IGNACIO ELEMENTARY SCHOOL</h4>
        <p><strong>Date:</strong> ${r.date} | <strong>Prepared by:</strong> ${r.createdBy}</p>
        <table class="data-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Expense</th><th>Price</th><th>Sales</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="margin-top:15px; text-align:right;">
          <p>Total Sales: <strong>${formatCurrency(r.totalSales)}</strong></p>
          <p>Total Expenses: <strong>${formatCurrency(r.totalCost)}</strong></p>
          <h3 style="color:var(--deped-green)">Net Profit: ${formatCurrency(r.netProfit)}</h3>
        </div>
      </div>
    `;

    document.getElementById('viewLedgerModal').style.display = 'flex';

    document.getElementById('btnExportLedgerPDF').onclick = () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text("SAN IGNACIO ELEMENTARY SCHOOL", 105, 20, { align: "center" });
      doc.text("Daily Canteen Production Ledger", 105, 30, { align: "center" });
      doc.text(`Date: ${r.date}`, 105, 40, { align: "center" });

      doc.autoTable({
        startY: 50,
        head: [['Item', 'Qty', 'Materials Expense', 'Selling Price', 'Total Sales']],
        body: r.products.map(p => [p.name, p.quantity, formatCurrency(p.cost), formatCurrency(p.price), formatCurrency(p.quantity * p.price)]),
        theme: 'grid', headStyles: { fillColor: [46, 125, 50] }
      });

      let finalY = doc.lastAutoTable.finalY + 10;
      doc.text(`Total Sales: ${formatCurrency(r.totalSales)}`, 140, finalY);
      doc.text(`Total Expenses: ${formatCurrency(r.totalCost)}`, 140, finalY + 10);
      doc.text(`Daily Net Profit: ${formatCurrency(r.netProfit)}`, 140, finalY + 20);
      doc.save(`Ledger_${r.date}.pdf`);
    };
  },
};