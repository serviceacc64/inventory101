import { supabase } from './supabase.js';


// Sign up new user
export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: window.location.origin + '/dashboard.html'
        }
    });
    return { data, error };
}

// Sign in user
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

// Sign out user
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

// Get current user
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
}

// Check if user is authenticated
export async function isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
}

// Listen for auth changes
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

// Reset password
export async function resetPassword(email) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/index.html?reset=true'
        });
        
        // Enhance error object with status code for rate limiting detection
        if (error) {
            // Check if it's a rate limit error (429)
            if (error.message?.toLowerCase().includes('rate limit') || 
                error.message?.toLowerCase().includes('too many requests') ||
                error.status === 429) {
                error.status = 429;
                error.isRateLimit = true;
            }
        }
        
        return { data, error };
    } catch (err) {
        // Handle network or unexpected errors
        console.error('Reset password error:', err);
        return { 
            data: null, 
            error: { 
                message: err.message || 'An unexpected error occurred', 
                status: err.status || 500,
                isNetworkError: !err.status
            } 
        };
    }
}


// Update password (for password reset flow)
export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });
    return { data, error };
}
