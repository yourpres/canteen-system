// =============================================
// MOCK Authentication Module (SYNCED)
// =============================================

const DB_USERS = 'canteen_users';

// 1. Initialize Default Admin if system is empty
(function initSystem() {
    let users = JSON.parse(localStorage.getItem(DB_USERS)) || [];
    const adminExists = users.find(u => u.email === 'admin@school.edu');
    
    if (!adminExists) {
        users.push({
            id: 'admin_001',
            name: 'Principal / Admin',
            email: 'admin@school.edu',
            role: 'admin',
            active: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toLocaleDateString()
        });
        localStorage.setItem(DB_USERS, JSON.stringify(users));
    }
})();

/**
 * Handle Sign Up / Create Account
 */
async function signUpWithEmail(name, email, role, password) {
    let users = JSON.parse(localStorage.getItem(DB_USERS)) || [];

    // Check if email taken
    if (users.find(u => u.email === email)) {
        throw new Error("Email already exists!");
    }

    const newUser = {
        id: 'u_' + Date.now(),
        name: name,
        email: email,
        role: role,
        active: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toLocaleDateString()
    };

    // SAVE TO SHARED LIST (This makes it appear in Admin Dashboard)
    users.push(newUser);
    localStorage.setItem(DB_USERS, JSON.stringify(users));

    // LOG IN IMMEDIATELY
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', name);

    window.location.href = 'app.html';
}

/**
 * Handle Sign In (Default Admin check)
 */
async function signInWithEmail(email, password) {
    const users = JSON.parse(localStorage.getItem(DB_USERS)) || [];
    const user = users.find(u => u.email === email);

    if (!user) throw new Error("User not found.");
    if (!user.active) throw new Error("Account deactivated by Admin.");

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userName', user.name);

    window.location.href = 'app.html';
}

function requireAuth(callback) {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    const profile = {
        name: localStorage.getItem('userName'),
        role: localStorage.getItem('userRole'),
        active: true
    };
    
    if (callback) callback({ email: localStorage.getItem('userEmail') }, profile);
}

function signOut() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}

function isAdmin() {
    return localStorage.getItem('userRole') === 'admin';
}

function signOut() {
    localStorage.removeItem('isLoggedIn');
    // Note: We don't remove userRole/userName so the login page can 
    // remember who was last logged in if needed, but we clear login status.
    window.location.href = 'index.html';
}

function requireAuth(callback) {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    const profile = {
        name: localStorage.getItem('userName'),
        role: localStorage.getItem('userRole'),
        active: true
    };
    
    if (callback) callback({ email: localStorage.getItem('userEmail') }, profile);
}