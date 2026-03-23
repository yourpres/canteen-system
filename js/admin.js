// =============================================
// Admin Panel Module (STRICT SYNC VERSION)
// =============================================

const AdminPanel = {
  // Key for local storage - must match index.html
  DB_KEY: 'canteen_users',

  load() {
    if (!isAdmin()) {
      showToast('Access denied. Admin only.', 'error');
      App.navigateTo('dashboard');
      return;
    }
    this.setupModal();
    this.loadUsers();
    this.loadQuickStats();
  },

  // Helper to get users from LocalStorage
  getStoredUsers() {
    const rawData = localStorage.getItem(this.DB_KEY);
    const users = JSON.parse(rawData);
    
    // If no users exist at all, initialize the list with the default admin
    if (!users || users.length === 0) {
      const initialUsers = [
        { id: 'admin_01', name: 'System Principal', email: 'admin@school.edu', password: 'admin123', role: 'admin', active: true, createdAt: new Date().toISOString() }
      ];
      localStorage.setItem(this.DB_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return users;
  },

  setupModal() {
    // We use .onclick to prevent multiple duplicate event listeners
    document.getElementById('btnInviteManager').onclick = () => this.openModal();
    document.getElementById('closeManagerModal').onclick = () => this.closeModal();
    document.getElementById('cancelManagerBtn').onclick = () => this.closeModal();
    document.getElementById('saveManagerBtn').onclick = () => this.saveManager();

    document.getElementById('userSearch').oninput = (e) => {
      this.filterUsers(e.target.value);
    };
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
    // 1. Get and Clean Inputs
    const name = document.getElementById('managerName').value.trim();
    const email = document.getElementById('managerEmail').value.trim().toLowerCase();
    const tempPass = document.getElementById('managerTempPass').value.trim();
    
    if (!name || !email || !tempPass) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    // 2. FORCE SYNC: Always get the newest list from localStorage
    let users = JSON.parse(localStorage.getItem(this.DB_KEY)) || [];
    
    // 3. CHECK FOR DUPLICATES (Case-insensitive)
    const duplicate = users.find(u => u.email.toLowerCase() === email);
    
    if (duplicate) {
      // If found, stop and show error
      showToast(`The email "${email}" is already registered to ${duplicate.name}.`, 'error');
      console.warn("Duplicate email detected:", email);
      return;
    }

    // 4. CREATE NEW USER
    const newUser = {
      id: 'u_' + Date.now(),
      name: name,
      email: email,
      password: tempPass,
      role: 'manager',
      active: true,
      createdAt: new Date().toISOString(),
      lastLogin: 'Never'
    };

    // 5. SAVE BACK TO STORAGE
    users.push(newUser);
    localStorage.setItem(this.DB_KEY, JSON.stringify(users));

    // 6. SUCCESS UI UPDATES
    showToast(`Account successfully created for ${name}!`);
    this.closeModal();
    this.loadUsers();
    this.loadQuickStats();
  },

  loadUsers() {
    const users = this.getStoredUsers();
    this.renderUsers(users);
    this.updateStats(users);
  },

  loadQuickStats() {
    const users = this.getStoredUsers();
    const activeManagers = users.filter(u => u.active && u.role === 'manager');
    
    const activeEl = document.getElementById('adminActiveCount');
    if (activeEl) activeEl.textContent = activeManagers.length;

    const quickTable = document.getElementById('adminQuickUserList');
    if (quickTable) {
        quickTable.innerHTML = users.slice(0, 5).map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><span class="status-badge ${u.active ? 'status-active' : 'status-inactive'}">${u.active ? 'Active' : 'Inactive'}</span></td>
            </tr>
        `).join('');
    }
  },

  filterUsers(search) {
    const s = search.toLowerCase();
    const users = this.getStoredUsers();
    const filtered = users.filter(u => 
      u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
    );
    this.renderUsers(filtered);
  },

  renderUsers(users) {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No users found.</td></tr>';
      return;
    }

    const currentEmail = localStorage.getItem('userEmail');

    tbody.innerHTML = users.map(u => {
      const isMe = u.email === currentEmail;
      
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="user-avatar" style="width:32px;height:32px;background:#2E7D32;color:white;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:12px;">
                ${u.name[0].toUpperCase()}
              </div>
              <span class="font-bold">${u.name} ${isMe ? '<small style="color:var(--primary)">(You)</small>' : ''}</span>
            </div>
          </td>
          <td class="text-muted">${u.email}</td>
          <td><span class="status-badge ${u.role === 'admin' ? 'status-admin' : 'status-manager'}">${u.role.toUpperCase()}</span></td>
          <td><span class="status-badge ${u.active ? 'status-active' : 'status-inactive'}">${u.active ? 'Active' : 'Deactivated'}</span></td>
          <td>
            ${!isMe ? `
              <button class="btn-icon-sm" onclick="AdminPanel.toggleActive('${u.id}')" title="Toggle Status">🚫</button>
              <button class="btn-icon-sm" onclick="AdminPanel.deleteUser('${u.id}')" title="Delete Account">🗑</button>
            ` : '—'}
          </td>
        </tr>
      `;
    }).join('');
  },

  updateStats(users) {
    if(document.getElementById('adminTotalUsers')) 
        document.getElementById('adminTotalUsers').textContent = users.length;
    if(document.getElementById('adminActiveManagers')) 
        document.getElementById('adminActiveManagers').textContent = users.filter(u => u.active && u.role === 'manager').length;
    if(document.getElementById('adminTotalAdmins')) 
        document.getElementById('adminTotalAdmins').textContent = users.filter(u => u.role === 'admin').length;
  },

  toggleActive(id) {
    let users = this.getStoredUsers();
    const user = users.find(u => u.id === id);
    if (user) {
      user.active = !user.active;
      localStorage.setItem(this.DB_KEY, JSON.stringify(users));
      showToast(`User status updated.`);
      this.loadUsers();
      this.loadQuickStats();
    }
  },

  deleteUser(id) {
    if (!confirm("Are you sure you want to delete this manager?")) return;
    
    let users = this.getStoredUsers();
    users = users.filter(u => u.id !== id);
    localStorage.setItem(this.DB_KEY, JSON.stringify(users));
    
    showToast("User removed from system.", "error");
    this.loadUsers();
    this.loadQuickStats();
  }
};