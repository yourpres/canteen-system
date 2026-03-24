// =============================================
// Main Application Controller
// =============================================

const App = {
    currentPage: 'dashboard',

    init() {
        // We call Auth.requireAuth and it gives us the 'profile'
        Auth.requireAuth((profile) => {
            this.setupUI(profile);
            this.setupNavigation();
            this.navigateTo('dashboard');
            console.log("App initialized as:", profile.role);
        });
    },

    setupUI(profile) {
        // Error was here: now 'profile' is defined correctly
        const role = profile.role; 

        // 1. Update Profile Text in Sidebar
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');
        const avatarEl = document.getElementById('userAvatar');

        if (nameEl) nameEl.textContent = profile.name;
        if (roleEl) {
            roleEl.textContent = role === 'admin' ? '🔑 Principal/Admin' : '👤 Canteen Manager';
        }

        // 2. Generate Avatar Initial
        if (avatarEl) {
            avatarEl.textContent = profile.name[0].toUpperCase();
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
        const logoutBtn = document.getElementById('signOutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                if(confirm("Are you sure you want to sign out?")) Auth.signOut();
            };
        }
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        navItems.forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateTo(page);
            };
        });
    },

    navigateTo(page) {
        // Hide all pages, show target
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.add('active');

        // Update sidebar highlight
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });

        // Update Header Title
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

        // Load specific file data
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
            console.warn(`Module load error:`, err);
        }
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Live Date & Time for Top Bar
function startLiveClock() {
    const clockEl = document.getElementById('clockDisplay');
    const dateEl = document.getElementById('topbarDate');

    if (!clockEl && !dateEl) return;

    function updateClock() {
        const now = new Date();

        if (clockEl) {
            let h = now.getHours();
            const m = now.getMinutes().toString().padStart(2, '0');
            const s = now.getSeconds().toString().padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            h = h ? h : 12;
            clockEl.textContent = `${h.toString().padStart(2, '0')}:${m}:${s} ${ampm}`;
        }

        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('en-PH', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    updateClock();
    setInterval(updateClock, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    startLiveClock();
});
