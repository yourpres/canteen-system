const ProfileMgr = {
    load() {
        const name = localStorage.getItem('userName');
        const email = localStorage.getItem('userEmail');
        document.getElementById('profName').textContent = name;
        document.getElementById('profEmail').textContent = email;
        
        const form = document.getElementById('changePasswordForm');
        form.onsubmit = (e) => this.handlePasswordChange(e);
    },

    handlePasswordChange(e) {
        e.preventDefault();
        const currentPass = document.getElementById('currPass').value;
        const newPass = document.getElementById('newPass').value;
        const email = localStorage.getItem('userEmail');

        let users = JSON.parse(localStorage.getItem('canteen_users')) || [];
        let userIndex = users.findIndex(u => u.email === email);
        let user = users[userIndex];

        if (user.password !== currentPass) {
            Utils.showToast("Current password incorrect", "error");
            return;
        }

        if (newPass.length < 6) {
            Utils.showToast("New password must be at least 6 characters", "error");
            return;
        }

        users[userIndex].password = newPass;
        localStorage.setItem('canteen_users', JSON.stringify(users));
        
        Utils.showToast("Security key updated successfully!");
        e.target.reset();
    }
};