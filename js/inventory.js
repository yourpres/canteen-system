const InventoryMgr = {
    DB_KEY: 'inventory_items',
    HIST_KEY: 'inventory_history',
    currentTrip: [],

    load() {
        this.renderStockTable();
        this.loadPurchaseHistory();
    },

    openModal() {
        this.currentTrip = [];
        this.renderTripTable();
        document.getElementById('inventoryModal').style.display = 'flex';
        document.getElementById('invPurchaseDate').value = todayStr();
    },

    closeModal() { document.getElementById('inventoryModal').style.display = 'none'; },

    addItemToList() {
        const name = document.getElementById('tempItemName').value.trim();
        const qty = parseFloat(document.getElementById('tempQty').value) || 0;
        const cost = parseFloat(document.getElementById('tempCost').value) || 0;
        const unit = document.getElementById('tempUnit').value || 'pcs';

        if (!name || qty <= 0) return showToast("Enter item name and quantity", "error");

        this.currentTrip.push({ id: Date.now(), name, qty, cost, unit });
        this.renderTripTable();

        // Clear sub-inputs
        document.getElementById('tempItemName').value = '';
        document.getElementById('tempQty').value = '';
        document.getElementById('tempCost').value = '';
    },

    renderTripTable() {
        const tbody = document.getElementById('shoppingListBody');
        let total = 0;
        tbody.innerHTML = this.currentTrip.map((item, idx) => {
            total += item.cost;
            return `<tr><td>${item.name}</td><td style="text-align:center;">${item.qty}</td><td>${item.unit}</td><td style="text-align:right; font-weight:600;">${formatCurrency(item.cost)}</td>
                    <td style="text-align:center;"><button class="act-btn act-btn-delete" onclick="InventoryMgr.removeItem(${idx})">✕</button></td></tr>`;
        }).join('');
        document.getElementById('tripTotalDisplay').textContent = formatCurrency(total);
        document.getElementById('tripItemCount').textContent = this.currentTrip.length + ' item' + (this.currentTrip.length !== 1 ? 's' : '');
    },

    removeItem(idx) { this.currentTrip.splice(idx, 1); this.renderTripTable(); },

    saveTripToStock() {
        if (this.currentTrip.length === 0) return;
        let stock = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        let history = JSON.parse(localStorage.getItem(this.HIST_KEY)) || [];
        const date = document.getElementById('invPurchaseDate').value;
        const tripId = 'trip_' + Date.now();

        this.currentTrip.forEach(item => {
            // Update current stock
            const existing = stock.find(s => s.name.toLowerCase() === item.name.toLowerCase());
            if (existing) {
                existing.quantity += item.qty;
                existing.totalValue += item.cost;
            } else {
                stock.push({ id: 'inv_'+Date.now()+Math.random(), name: item.name, quantity: item.qty, unit: item.unit, totalValue: item.cost, minStock: 5, category: 'General' });
            }
            // Save to history for reports
            history.push({ tripId, date, ...item });
        });

        localStorage.setItem(this.DB_KEY, JSON.stringify(stock));
        localStorage.setItem(this.HIST_KEY, JSON.stringify(history));
        this.closeModal();
        this.renderStockTable();
        this.loadPurchaseHistory();
        showToast("Weekly supply added to stock");
    },

    renderStockTable() {
        const items = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        document.getElementById('inventoryBody').innerHTML = items.length === 0 
            ? '<tr><td colspan="6"><div class="tbl-empty"><div class="tbl-empty-icon">📦</div><p>No inventory items found.</p></div></td></tr>'
            : items.map(i => {
                const category = i.category || 'General';
                const status = i.quantity < 5 ? 'Low' : 'OK';
                const statusClass = i.quantity < 5 ? 'status-low' : 'status-ok';
                return `
                    <tr>
                        <td><strong>${i.name}</strong></td>
                        <td style="text-align:center;">${category}</td>
                        <td style="text-align:right; font-variant-numeric:tabular-nums; font-weight:600;">${i.quantity} ${i.unit}</td>
                        <td style="text-align:right; font-variant-numeric:tabular-nums; font-weight:600;">${formatCurrency(i.totalValue)}</td>
                        <td style="text-align:center;"><span class="status-badge ${statusClass}">${status}</span></td>
                        <td style="text-align:center;">
                            <div class="action-group">
                                <button class="act-btn act-btn-view" onclick="InventoryMgr.viewItem('${i.id}')">👁 View</button>
                                <button class="act-btn act-btn-delete" onclick="InventoryMgr.deleteItem('${i.id}')">🗑 Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
    },

    viewItem(id) {
        const items = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        const item = items.find(i => i.id === id);
        if (!item) return;
        
        const editingItem = JSON.parse(JSON.stringify(item)); // Deep copy for editing
        
        const content = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; padding:20px 0;">
                <div>
                    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:6px;">Item Name</p>
                    <input type="text" id="editItemName" class="input" value="${item.name}" style="width:100%;">
                </div>
                <div>
                    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:6px;">Category</p>
                    <input type="text" id="editItemCategory" class="input" value="${item.category || 'General'}" style="width:100%;">
                </div>
                <div>
                    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:6px;">Current Stock</p>
                    <input type="number" id="editItemQty" class="input" value="${item.quantity}" style="width:100%;">
                </div>
                <div>
                    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:6px;">Unit</p>
                    <input type="text" id="editItemUnit" class="input" value="${item.unit}" style="width:100%;">
                </div>
            </div>
        `;
        document.getElementById('viewTripContent').innerHTML = content;
        document.getElementById('viewTripTitle').textContent = `${item.name} - Edit Inventory`;
        
        // Update button to save
        const btnExport = document.getElementById('btnExportTripPDF');
        if(btnExport) {
            btnExport.textContent = '💾 Save Changes';
            btnExport.onclick = () => InventoryMgr.saveEditedItem(id);
        }
        
        document.getElementById('viewTripModal').style.display = 'flex';
    },

    saveEditedItem(id) {
        const items = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        const idx = items.findIndex(i => i.id === id);
        if(idx === -1) return;
        
        items[idx].name = document.getElementById('editItemName').value.trim();
        items[idx].category = document.getElementById('editItemCategory').value.trim() || 'General';
        items[idx].quantity = parseFloat(document.getElementById('editItemQty').value) || 0;
        items[idx].unit = document.getElementById('editItemUnit').value.trim();
        
        localStorage.setItem(this.DB_KEY, JSON.stringify(items));
        document.getElementById('viewTripModal').style.display = 'none';
        this.renderStockTable();
        showToast("Inventory item updated successfully", "success");
    },

    loadPurchaseHistory() {
        const history = JSON.parse(localStorage.getItem(this.HIST_KEY)) || [];
        const from = document.getElementById('invFilterFrom').value;
        const to = document.getElementById('invFilterTo').value;
        let filtered = history;
        
        // Apply filter based on what dates are provided
        if(from || to) {
            filtered = history.filter(h => {
                if(from && to) return h.date >= from && h.date <= to;
                if(from) return h.date >= from;
                if(to) return h.date <= to;
                return true;
            });
        }

        let total = 0;
        document.getElementById('purchaseHistoryBody').innerHTML = filtered.length === 0
            ? '<tr><td colspan="6"><div class="tbl-empty"><div class="tbl-empty-icon">📋</div><p>No items found for selected date range.</p></div></td></tr>'
            : filtered.map((h, idx) => {
                total += h.cost;
                return `
                    <tr>
                        <td style="text-align:left;">${h.date}</td>
                        <td style="text-align:left;"><strong>${h.name}</strong></td>
                        <td style="text-align:center; font-variant-numeric:tabular-nums; font-weight:600;">${h.qty}</td>
                        <td style="text-align:left;">${h.unit}</td>
                        <td style="text-align:right; font-variant-numeric:tabular-nums; font-weight:600;">${formatCurrency(h.cost)}</td>
                        <td style="text-align:center;">
                            <div class="action-group">
                                <button class="act-btn act-btn-view" onclick="InventoryMgr.viewPurchaseItem('${h.tripId}')">👁 View</button>
                                <button class="act-btn act-btn-delete" onclick="InventoryMgr.deletePurchaseItem('${h.tripId}', '${h.name}', '${h.date}')">🗑 Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        document.getElementById('historyTotalSpent').textContent = formatCurrency(total);
    },

    viewPurchaseItem(tripId) {
        const history = JSON.parse(localStorage.getItem(this.HIST_KEY)) || [];
        const index = history.findIndex(h => h.tripId === tripId);
        const h = history[index];
        
        if (!h || index === -1) return showToast('Purchase record not found', 'error');
        
        const content = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; padding:20px 0;">
                <div>
                    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:6px;">Date</p>
                    <input type="date" id="editPurchDate" class="input" value="${h.date}" style="width:100%;">
                </div>
                <div>
                    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:6px;">Item Name</p>
                    <input type="text" id="editPurchName" class="input" value="${h.name}" style="width:100%;">
                </div>
                <div>
                    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:6px;">Quantity</p>
                    <input type="number" id="editPurchQty" class="input" value="${h.qty}" style="width:100%;">
                </div>
                <div>
                    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:6px;">Unit</p>
                    <input type="text" id="editPurchUnit" class="input" value="${h.unit}" style="width:100%;">
                </div>
                <div style="grid-column:1 / -1;">
                    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:6px;">Cost (₱)</p>
                    <input type="number" id="editPurchCost" class="input" value="${h.cost}" step="0.01" style="width:100%;">
                </div>
            </div>
        `;
        document.getElementById('viewTripContent').innerHTML = content;
        document.getElementById('viewTripTitle').textContent = `${h.name} - Edit Purchase Record`;
        
        // Store index for proper updates
        window.currentEditingPurchaseIndex = index;
        window.currentEditingPurchase = JSON.parse(JSON.stringify(h));
        
        // Update button to save
        const btnExport = document.getElementById('btnExportTripPDF');
        if(btnExport) {
            btnExport.textContent = '💾 Save Changes';
            btnExport.onclick = () => InventoryMgr.saveEditedPurchase(index);
        }
        
        document.getElementById('viewTripModal').style.display = 'flex';
    },

    saveEditedPurchase(index) {
        let history = JSON.parse(localStorage.getItem(this.HIST_KEY)) || [];
        
        if(index < 0 || index >= history.length) {
            return showToast("Purchase record not found", "error");
        }
        
        // Update with new values using index
        history[index].date = document.getElementById('editPurchDate').value;
        history[index].name = document.getElementById('editPurchName').value.trim();
        history[index].qty = parseFloat(document.getElementById('editPurchQty').value) || 0;
        history[index].unit = document.getElementById('editPurchUnit').value.trim();
        history[index].cost = parseFloat(document.getElementById('editPurchCost').value) || 0;
        
        if(!history[index].name || history[index].qty <= 0 || history[index].cost <= 0) {
            return showToast("Please fill in all required fields", "error");
        }
        
        localStorage.setItem(this.HIST_KEY, JSON.stringify(history));
        document.getElementById('viewTripModal').style.display = 'none';
        this.loadPurchaseHistory();
        showToast("Purchase record updated successfully", "success");
    },

    deletePurchaseItem(tripId, name, date) {
        if (!confirm(`Delete purchase record for ${name} on ${date}?`)) return;
        
        let history = JSON.parse(localStorage.getItem(this.HIST_KEY)) || [];
        history = history.filter(h => !(h.tripId === tripId && h.name === name && h.date === date));
        localStorage.setItem(this.HIST_KEY, JSON.stringify(history));
        this.loadPurchaseHistory();
        showToast("Purchase record deleted successfully", "success");
    },

    deleteItem(id) {
        if (!confirm("Delete this inventory item?")) return;
        let items = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
        items = items.filter(i => i.id !== id);
        localStorage.setItem(this.DB_KEY, JSON.stringify(items));
        this.renderStockTable();
        showToast("Inventory item deleted successfully", "success");
    },

    exportShoppingHistoryPDF() {
        const from = document.getElementById('invFilterFrom').value;
        const to = document.getElementById('invFilterTo').value;
        const history = JSON.parse(localStorage.getItem(this.HIST_KEY)) || [];
        
        if (!from && !to) return showToast("Please select at least one date", "error");
        
        const filtered = history.filter(h => {
            if(from && to) return h.date >= from && h.date <= to;
            if(from) return h.date >= from;
            if(to) return h.date <= to;
            return true;
        });
        if (filtered.length === 0) return showToast("No items found for the selected date range", "error");
        
        // Call async function
        Reports.exportShoppingHistoryPDF(filtered, from, to).catch(err => {
            console.error('PDF export error:', err);
            showToast("Error generating PDF", "error");
        });
    }
};