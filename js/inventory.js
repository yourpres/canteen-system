// =============================================
// Inventory Management Module (TRIP-BASED)
// =============================================

const InventoryMgr = {
  currentTrip: [], 
  DB_KEY: 'inventory_items',
  HISTORY_KEY: 'inventory_history',

  load() {
    this.setupListeners();
    this.loadInventory();
    this.loadPurchaseHistory(); 
  },

  setupListeners() {
    const openBtn = document.getElementById('btnAddInventory');
    if (openBtn) {
      openBtn.onclick = () => {
        this.currentTrip = []; 
        this.renderTripTable();
        document.getElementById('inventoryModal').style.display = 'flex';
        document.getElementById('invPurchaseDate').value = new Date().toISOString().split('T')[0];
      };
    }

    const saveBtn = document.getElementById('saveInventoryBtn');
    if (saveBtn) saveBtn.onclick = () => this.saveTripToStock();
  },

  // 1. ADD ITEM TO THE MODAL LIST
  addItemToList() {
    const nameInput = document.getElementById('tempItemName');
    const qtyInput = document.getElementById('tempQty');
    const costInput = document.getElementById('tempCost');
    const unitInput = document.getElementById('tempUnit');

    const name = nameInput.value.trim();
    const qty = parseFloat(qtyInput.value) || 0;
    const cost = parseFloat(costInput.value) || 0;
    const unit = unitInput.value.trim() || 'pcs';

    if (!name || qty <= 0 || cost <= 0) {
      showToast("Please enter item name, quantity, and cost.", "error");
      return;
    }

    this.currentTrip.push({
      id: 'tmp_' + Date.now() + Math.random(),
      name, qty, cost, unit
    });

    nameInput.value = '';
    qtyInput.value = '';
    costInput.value = '';
    nameInput.focus();

    this.renderTripTable();
  },

  renderTripTable() {
    const tbody = document.getElementById('shoppingListBody');
    let total = 0;

    if (this.currentTrip.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" align="center" class="text-muted">No items added to trip yet.</td></tr>';
      document.getElementById('tripTotalDisplay').textContent = "₱0.00";
      return;
    }

    tbody.innerHTML = this.currentTrip.map((item, index) => {
      total += item.cost;
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.qty} ${item.unit}</td>
          <td>${formatCurrency(item.cost)}</td>
          <td><button class="btn-delete" onclick="InventoryMgr.removeFromTrip(${index})">✕</button></td>
        </tr>`;
    }).join('');

    document.getElementById('tripTotalDisplay').textContent = formatCurrency(total);
  },

  removeFromTrip(index) {
    this.currentTrip.splice(index, 1);
    this.renderTripTable();
  },

  // 2. SAVE TRIP TO STOCK
  saveTripToStock() {
    if (this.currentTrip.length === 0) {
      showToast("Add at least one item to your shopping list.", "error");
      return;
    }

    let mainInventory = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
    let history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
    const purchaseDate = document.getElementById('invPurchaseDate').value;
    const tripId = 'trip_' + Date.now(); // Group items by a unique Trip ID

    this.currentTrip.forEach(tripItem => {
      const existingItem = mainInventory.find(i => i.name.toLowerCase().trim() === tripItem.name.toLowerCase().trim());
      
      if (existingItem) {
        existingItem.quantity += tripItem.qty;
        existingItem.totalValue += tripItem.cost;
      } else {
        mainInventory.push({
          id: 'inv_' + Date.now() + Math.random(),
          name: tripItem.name,
          quantity: tripItem.qty,
          unit: tripItem.unit,
          unitCost: tripItem.cost / tripItem.qty,
          totalValue: tripItem.cost,
          minStock: 5
        });
      }

      history.push({
        tripId: tripId,
        date: purchaseDate,
        name: tripItem.name,
        qty: tripItem.qty,
        unit: tripItem.unit,
        cost: tripItem.cost
      });
    });

    localStorage.setItem(this.DB_KEY, JSON.stringify(mainInventory));
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));

    showToast(`Saved ${this.currentTrip.length} items to your stock.`);
    this.closeModal();
    this.loadInventory();
    this.loadPurchaseHistory();
  },

  loadInventory() {
    const items = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
    const tbody = document.getElementById('inventoryBody');
    if (!tbody) return;

    tbody.innerHTML = items.map(item => {
      const isLow = item.quantity <= item.minStock;
      return `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td class="${isLow ? 'text-red font-bold' : ''}">${item.quantity} ${item.unit}</td>
          <td>${formatCurrency(item.totalValue)}</td>
          <td><span class="status-badge ${isLow ? 'status-inactive' : 'status-active'}">
              ${isLow ? '⚠️ Low' : '✅ OK'}</span></td>
          <td>
            <button class="btn-sm" onclick="InventoryMgr.deleteItem('${item.id}')">🗑</button>
          </td>
        </tr>`;
    }).join('');
    this.checkLowStockBadge();
  },

  // 3. LOAD HISTORY (GROUPED BY TRIP)
  loadPurchaseHistory() {
    const fromDate = document.getElementById('invFilterFrom').value;
    const toDate = document.getElementById('invFilterTo').value;
    const tbody = document.getElementById('purchaseHistoryBody');
    if (!tbody) return;
    
    let history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
    
    if (fromDate && toDate) {
      history = history.filter(h => h.date >= fromDate && h.date <= toDate);
    }

    // Grouping by tripId for the "In-System View"
    const trips = {};
    history.forEach(item => {
      if (!trips[item.tripId]) {
        trips[item.tripId] = { date: item.date, total: 0, itemsCount: 0, items: [] };
      }
      trips[item.tripId].total += item.cost;
      trips[item.tripId].itemsCount++;
      trips[item.tripId].items.push(item);
    });

    const sortedTripIds = Object.keys(trips).sort((a, b) => new Date(trips[b].date) - new Date(trips[a].date));

    let totalSpentInRange = 0;
    tbody.innerHTML = sortedTripIds.map(id => {
      const t = trips[id];
      totalSpentInRange += t.total;
      return `
        <tr>
          <td><strong>${t.date}</strong></td>
          <td>Shopping Trip (${t.itemsCount} items)</td>
          <td>${t.itemsCount} Items</td>
          <td class="font-bold">${formatCurrency(t.total)}</td>
          <td style="text-align:center;">
             <button class="action-btn btn-view" onclick="InventoryMgr.viewTripDetails('${id}')">👁 View Trip</button>
          </td>
        </tr>`;
    }).join('');

    if (sortedTripIds.length === 0) tbody.innerHTML = '<tr><td colspan="5" align="center" class="text-muted">No history found for this range.</td></tr>';
    
    document.getElementById('historyTotalSpent').textContent = formatCurrency(totalSpentInRange);
  },

  // 4. IN-SYSTEM VIEW & PDF EXPORT
  viewTripDetails(tripId) {
    const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
    const tripItems = history.filter(h => h.tripId === tripId);
    if (tripItems.length === 0) return;

    const purchaseDate = tripItems[0].date;
    const totalSpent = tripItems.reduce((sum, h) => sum + h.cost, 0);
    const managerName = localStorage.getItem('userName') || "Canteen Manager";

    const content = document.getElementById('viewTripContent');
    document.getElementById('viewTripTitle').textContent = `Shopping Trip: ${purchaseDate}`;

    content.innerHTML = `
      <div style="border: 1px solid #ddd; padding: 20px; background: #fff;">
        <h3 style="color:#2E7D32; margin-top:0;">SAN IGNACIO ELEMENTARY SCHOOL</h3>
        <p><strong>Transaction Date:</strong> ${purchaseDate}</p>
        <table class="data-table">
          <thead><tr><th>Item Name</th><th>Quantity</th><th>Total Cost</th></tr></thead>
          <tbody>
            ${tripItems.map(i => `<tr><td>${i.name}</td><td>${i.qty} ${i.unit}</td><td>${formatCurrency(i.cost)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div style="text-align:right; margin-top:15px; border-top: 2px solid #2E7D32; padding-top: 10px;">
          <h3 style="margin:0;">Total Trip Cost: ${formatCurrency(totalSpent)}</h3>
        </div>
      </div>
    `;

    document.getElementById('viewTripModal').style.display = 'flex';

    // PDF Export Function
    document.getElementById('btnExportTripPDF').onclick = () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.setTextColor(46, 125, 50);
      doc.text("SAN IGNACIO ELEMENTARY SCHOOL", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text("Weekly Canteen Supply Procurement Summary", 105, 28, { align: "center" });
      doc.text(`Purchase Date: ${purchaseDate}`, 105, 35, { align: "center" });

      doc.autoTable({
        startY: 45,
        head: [['Item Name', 'Quantity Purchased', 'Cost (PhP)']],
        body: tripItems.map(i => [i.name, `${i.qty} ${i.unit}`, formatCurrency(i.cost)]),
        theme: 'grid',
        headStyles: { fillColor: [46, 125, 50] }
      });

      let finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`GRAND TOTAL: ${formatCurrency(totalSpent)}`, 190, finalY, { align: "right" });

      doc.setFontSize(11);
      doc.text("Prepared by:", 20, finalY + 20);
      doc.text("__________________________", 20, finalY + 30);
      doc.text(managerName, 25, finalY + 35);
      doc.text("Canteen Manager", 25, finalY + 40);

      doc.save(`Shopping_Trip_${purchaseDate}.pdf`);
    };
  },

  closeModal() {
    document.getElementById('inventoryModal').style.display = 'none';
  },

  deleteItem(id) {
    if (confirm("Delete this item from stock records?")) {
      let items = JSON.parse(localStorage.getItem(this.DB_KEY)).filter(i => i.id !== id);
      localStorage.setItem(this.DB_KEY, JSON.stringify(items));
      this.loadInventory();
    }
  },

  checkLowStockBadge() {
    const items = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
    const lowCount = items.filter(i => i.quantity <= i.minStock).length;
    const badge = document.getElementById('inventoryBadge');
    if (badge) {
      badge.textContent = lowCount;
      badge.style.display = lowCount > 0 ? 'inline' : 'none';
    }
  }
};