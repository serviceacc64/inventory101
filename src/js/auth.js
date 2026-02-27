import { signOut, getCurrentUser, onAuthStateChange } from './supabaseAuth.js';

// Logout function
async function logout() {
    const { error } = await signOut();
    if (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    window.location.href = '/index.html';
}

// Get current admin
async function currentAdmin() {
    const { user, error } = await getCurrentUser();
    if (error || !user) return null;
    return {
        email: user.email,
        id: user.id
    };
}

// Check authentication on page load
async function checkAuth() {
    const { user, error } = await getCurrentUser();
    if (error || !user) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        window.location.href = '/index.html';
        return false;
    }
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userEmail', user.email);
    return true;
}

// Listen for auth state changes
onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        window.location.href = '/index.html';
    }
});

// Auto-attach logout buttons
var els = document.querySelectorAll('[data-logout]');
els.forEach(function (el) {
    el.addEventListener('click', function (e) {
        e.preventDefault();
        logout();
    });
});

// Export for use in other files
window.checkAuth = checkAuth;
window.logout = logout;
window.currentAdmin = currentAdmin;
