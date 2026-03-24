// =============================================
// Auth Module
// =============================================

const Auth = {
    DB_USERS: 'canteen_users',

    // 1. Initialize the Admin if it doesn't exist
    init() {
        let users = JSON.parse(localStorage.getItem(this.DB_USERS)) || [];
        const adminExists = users.find(u => u.email === 'admin@school.edu');
        
        if (!adminExists) {
            users.push({
                id: 'admin_001',
                name: 'Principal / Admin',
                email: 'admin@school.edu',
                password: 'admin123',
                role: 'admin',
                active: true,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem(this.DB_USERS, JSON.stringify(users));
        }
    },

    // 2. The Check: Passes the profile to the callback function
    requireAuth(callback) {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

        if (!isLoggedIn) {
            window.location.href = 'index.html';
            return;
        }

        // Get info from localStorage
        const profile = {
            name: localStorage.getItem('userName') || "User",
            role: localStorage.getItem('userRole') || "manager",
            email: localStorage.getItem('userEmail') || ""
        };

        // Send the profile object to the App.init
        if (callback) callback(profile);
    },

    signOut() {
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'index.html';
    }
};

// Start the user database
Auth.init();