// =============================================
// Profile Management Module
// =============================================

const ProfileMgr = {
    load() {
        // 1. Get current user info from localStorage
        const name = localStorage.getItem('userName') || "User";
        const email = localStorage.getItem('userEmail') || "email@school.edu";

        // 2. Populate UI
        const nameEl = document.getElementById('profName');
        const emailEl = document.getElementById('profEmail');
        const avatarEl = document.getElementById('profAvatar');

        if (nameEl) nameEl.textContent = name;
        if (emailEl) emailEl.textContent = email;
        if (avatarEl) avatarEl.textContent = name[0].toUpperCase();

        this.setupForm();
    },

    setupForm() {
        const form = document.getElementById('changePasswordForm');
        if (!form) return;

        form.onsubmit = (e) => {
            e.preventDefault();
            
            const curr = document.getElementById('currPass').value;
            const next = document.getElementById('newPass').value;
            const conf = document.getElementById('confirmPass').value;

            // Get current user list from DB (localStorage)
            let users = JSON.parse(localStorage.getItem('canteen_users')) || [];
            let userEmail = localStorage.getItem('userEmail');
            let userIndex = users.findIndex(u => u.email === userEmail);
            let user = users[userIndex];

            // --- VALIDATIONS ---
            if (!user) {
                showToast("System Error: User not found.", "error");
                return;
            }
            if (user.password !== curr) {
                showToast("Current password is incorrect.", "error");
                return;
            }
            if (next.length < 6) {
                showToast("Password must be at least 6 characters.", "error");
                return;
            }
            if (next !== conf) {
                showToast("New passwords do not match.", "error");
                return;
            }

            // --- UPDATE PASSWORD ---
            users[userIndex].password = next;
            localStorage.setItem('canteen_users', JSON.stringify(users));
            
            showToast("Password updated successfully!");
            form.reset();
        };
    }
};