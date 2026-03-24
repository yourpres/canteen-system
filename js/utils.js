const Utils = {
    formatCurrency: (amt) => 'PhP ' + (parseFloat(amt) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    today: () => new Date().toISOString().split('T')[0],
    thisMonth: () => new Date().toISOString().slice(0, 7),
    showToast: (msg, type = "success") => {
        const existing = document.getElementById('toastMsg');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'toastMsg';
        toast.style.cssText = `position:fixed; bottom:20px; right:20px; padding:12px 24px; border-radius:8px; color:white; z-index:10000; font-weight:bold; background: ${type === 'success' ? '#2E7D32' : '#C62828'}`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    // Get date range based on period
    getDateRange(period) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        let from = todayStr;
        let to = todayStr;

        if (period === 'weekly') {
            const first = today.getDate() - today.getDay();
            const firstDay = new Date(today.setDate(first));
            from = firstDay.toISOString().split('T')[0];
            to = todayStr;
        } else if (period === 'monthly') {
            from = `${year}-${month}-01`;
            to = todayStr;
        } else if (period === 'quarterly') {
            const quarter = Math.floor(today.getMonth() / 3);
            const startMonth = quarter * 3;
            from = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
            to = todayStr;
        } else if (period === 'yearly') {
            from = `${year}-01-01`;
            to = todayStr;
        }

        return { from, to };
    },

    // Format date for display
    formatDate(dateStr) {
        const [year, month, day] = dateStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
    }
};

// These lines allow the other files to call the functions directly
const formatCurrency = Utils.formatCurrency;
const todayStr = Utils.today;
const showToast = Utils.showToast;
const getDateRange = Utils.getDateRange;
const formatDate = Utils.formatDate;