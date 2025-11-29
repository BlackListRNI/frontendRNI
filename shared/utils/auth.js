// Authentication utility
window.Auth = {
    // Get current user from localStorage
    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Set current user
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
        this.updateNav();
    },

    // Remove current user
    removeUser() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        this.updateNav();
    },

    // Check if user is logged in
    isLoggedIn() {
        return !!this.getUser();
    },

    // Get token
    getToken() {
        return localStorage.getItem('token');
    },

    // Set token
    setToken(token) {
        localStorage.setItem('token', token);
    },

    // Update navigation based on auth state
    updateNav() {
        const user = this.getUser();
        const navLogin = document.getElementById('navLogin');
        const navLogout = document.getElementById('navLogout');
        const navPerfil = document.getElementById('navPerfil');

        if (user) {
            if (navLogin) navLogin.style.display = 'none';
            if (navLogout) navLogout.style.display = 'inline-block';
            if (navPerfil) navPerfil.style.display = 'inline-block';
        } else {
            if (navLogin) navLogin.style.display = 'inline-block';
            if (navLogout) navLogout.style.display = 'none';
            if (navPerfil) navPerfil.style.display = 'none';
        }
    },

    // Require authentication
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.Toast.warning('Debes iniciar sesión para acceder a esta página. Redirigiendo...', 3000);
            setTimeout(() => {
                window.location.hash = '#/login';
            }, 1000);
            return false;
        }
        return true;
    }
};

// Update nav on page load
document.addEventListener('DOMContentLoaded', () => {
    window.Auth.updateNav();
});
