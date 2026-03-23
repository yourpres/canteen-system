// =============================================
// Main Application Controller (DYNAMIC DEMO MODE)
// =============================================

const App = {
  currentPage: 'dashboard',

  init() {
    requireAuth((user, profile) => {
      this.setupUI(user, profile);
      this.setupNavigation(profile.role);
      this.setupTopbar();
      this.navigateTo('dashboard');
      
      console.log(`App Initialized as: ${profile.role.toUpperCase()}`);
    });
  },

  setupUI(user, profile) {
    const role = profile.role;

    // 1. Update Profile Text
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const avatarEl = document.getElementById('userAvatar');

    if (nameEl) nameEl.textContent = profile.name;
    if (roleEl) {
        roleEl.textContent = role === 'admin' ? '🔑 Principal/Admin' : '👤 Canteen Manager';
    }

    // 2. Generate Avatar Initials
    if (avatarEl) {
        const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        avatarEl.textContent = initials;
        avatarEl.style.background = role === 'admin' ? '#1B5E20' : '#2E7D32';
    }

    // 3. Filter Sidebar Links
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = (role === 'admin' ? 'flex' : 'none');
    });
    const adminSection = document.getElementById('adminNavSection');
    if (adminSection) adminSection.style.display = (role === 'admin' ? 'block' : 'none');

    document.querySelectorAll('.manager-only').forEach(el => {
        el.style.display = (role === 'manager' ? 'flex' : 'none');
    });

    // 4. Switch Dashboard View
    const adminDash = document.getElementById('adminDashboardView');
    const managerDash = document.getElementById('managerDashboardView');

    if (role === 'admin') {
        if (adminDash) adminDash.style.display = 'block';
        if (managerDash) managerDash.style.display = 'none';
    } else {
        if (adminDash) adminDash.style.display = 'none';
        if (managerDash) managerDash.style.display = 'block';
    }

    // 5. Sign Out Button
    document.getElementById('signOutBtn')?.addEventListener('click', () => {
        if(confirm("Are you sure you want to sign out?")) {
            signOut();
        }
    });
  },

  setupNavigation(role) {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        
        if (page === 'admin' && role !== 'admin') {
            showToast("Access Denied: Admins Only", "error");
            return;
        }

        this.navigateTo(page);
        if (window.innerWidth <= 900) this.closeSidebar();
      });
    });

    document.getElementById('menuToggle')?.addEventListener('click', () => this.openSidebar());
    document.getElementById('sidebarClose')?.addEventListener('click', () => this.closeSidebar());
    document.getElementById('overlay')?.addEventListener('click', () => this.closeSidebar());
  },

  setupTopbar() {
    const dateEl = document.getElementById('topbarDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-PH', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });
    }

    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = notifPanel.style.display === 'block';
      notifPanel.style.display = isOpen ? 'none' : 'block';
    });
    
    document.addEventListener('click', (e) => {
        if (notifPanel && !notifPanel.contains(e.target) && e.target !== notifBtn) {
            notifPanel.style.display = 'none';
        }
    });
  },

  navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // UPDATED TITLES TO MATCH NOTEBOOK PROCESS
    const titles = {
      'dashboard': 'Canteen Financial Health',
      'inventory': 'Weekly Supply & Shopping',
      'daily-records': 'Daily Production Ledger',
      'expenses': 'School Activity Allocations',
      'reports': 'Official Financial Reports',
      'admin': 'Manager Account Management',
      'profile': 'Account Security'
    };
    
    const topbarTitle = document.getElementById('topbarTitle');
    if (topbarTitle) topbarTitle.textContent = titles[page] || 'Dashboard';

    this.currentPage = page;

    try {
        switch (page) {
          case 'dashboard':     
            if (localStorage.getItem('userRole') === 'admin') {
                if(typeof AdminPanel !== 'undefined') AdminPanel.loadQuickStats(); 
            } else {
                if(typeof Dashboard !== 'undefined') Dashboard.load();
            }
            break;
          case 'inventory':     if(typeof InventoryMgr !== 'undefined') InventoryMgr.load(); break;
          case 'daily-records': if(typeof DailyRecords !== 'undefined') DailyRecords.load(); break;
          case 'expenses':      if(typeof ExpensesMgr !== 'undefined') ExpensesMgr.load(); break;
          case 'reports':       if(typeof Reports !== 'undefined') Reports.init(); break;
          case 'admin':         if(typeof AdminPanel !== 'undefined') AdminPanel.load(); break;
          case 'profile':       if(typeof ProfileMgr !== 'undefined') ProfileMgr.load(); break;
        }
    } catch (err) {
        console.warn(`Module load error for ${page}:`, err);
    }
  },

  openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'block';
  },

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
  }
};

// =============================================
// Utility Functions (CRITICAL FIXES HERE)
// =============================================

/**
 * Returns today's date in YYYY-MM-DD format
 */
function todayStr() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Returns current month in YYYY-MM format
 */
function getMonthStr() {
    return new Date().toISOString().slice(0, 7);
}

/**
 * Formats a number to Philippine Peso currency
 */
function formatCurrency(amount) {
  return '₱' + (parseFloat(amount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Shows a temporary notification toast
 */
function showToast(message, type = 'success') {
  const existing = document.getElementById('toastMsg');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toastMsg';
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: slideUp 0.3s ease;
    background: ${type === 'success' ? '#2E7D32' : type === 'error' ? '#C62828' : '#1976D2'};
    color: #fff;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('topbarTitle')) {
        App.init();
    }
});