# Supabase Authentication Integration Plan

## Overview
This document outlines the step-by-step plan to integrate Supabase authentication into the RMNHS Supplies Inventory System, replacing the current hardcoded credentials with secure, server-side authentication.

---

## Phase 1: Supabase Dashboard Configuration

### 1.1 Enable Authentication
- [ ] Log in to Supabase Dashboard (https://supabase.com/dashboard)
- [ ] Select your project: `qgiptrexxrqkrwytegdn`
- [ ] Navigate to **Authentication** → **Providers**
- [ ] Enable **Email** provider (Email/Password authentication)
- [ ] Configure settings:
  - Enable "Enable email confirmations" (optional, for production)
  - Set secure password requirements

### 1.2 Create Admin Users Table (Optional - for role-based access)
```sql
-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own admin data" 
ON public.admin_users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own admin data"
ON public.admin_users FOR INSERT
WITH CHECK (auth.uid() = id);
```

### 1.3 Configure Site URL

**For Development (Localhost):**
- [ ] Go to **Authentication** → **URL Configuration**
- [ ] Add your development URL: `http://localhost:5500` (or whatever port you use - common ones: 5500, 3000, 8080, 5000)
- [ ] Add redirect URLs for all pages:
  - `http://localhost:5500/index.html`
  - `http://localhost:5500/dashboard.html`
  - `http://localhost:5500/src/pages/input.html`
  - `http://localhost:5500/src/pages/rooms.html`
  - `http://localhost:5500/src/pages/equipment.html`
  - `http://localhost:5500/src/pages/report.html`
  - `http://localhost:5500/src/pages/logs.html`

**Important Notes:**
- ✅ **You do NOT need to deploy first** - localhost works perfectly for development
- ✅ You can add multiple URLs (both localhost and production)
- ⚠️ **When you deploy**, you MUST add your production domain to the allowed URLs
- ⚠️ **Wildcard support**: You can use wildcards like `http://localhost:*` to allow any port

**Example Configuration:**
```
Site URL: http://localhost:5500
Redirect URLs:
  - http://localhost:5500/*
  - https://your-production-domain.com/*  (add when deploying)
```

**After Deployment:**
1. Go back to Supabase Dashboard → Authentication → URL Configuration
2. Add your production domain: `https://your-domain.com`
3. Add production redirect URLs for all pages
4. Both localhost and production URLs can coexist - Supabase will accept both

**Best Practice:**
- Keep localhost URLs for ongoing development
- Add production URLs when deploying
- Use environment variables in your code to handle different URLs


---

## Phase 2: Update Supabase Client Configuration

### 2.1 Update `src/js/supabase.js`
```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://qgiptrexxrqkrwytegdn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnaXB0cmV4eHJxa3J3eXRlZ2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTQ3MzQsImV4cCI6MjA4NjUzMDczNH0.Fuyw8d2lSlFgvkg_dZ_qgevtfGjWTMcgPG_W4eU1L2s'

// Create client with auth configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})
```

---

## Phase 3: Create Authentication Module

### 3.1 Create `src/js/auth/supabaseAuth.js`
This new module will handle all Supabase authentication operations:

```javascript
import { supabase } from '../supabase.js';

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
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/index.html?reset=true'
    });
    return { data, error };
}

// Update password (for password reset flow)
export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });
    return { data, error };
}
```

---

## Phase 4: Update Login Page (index.html)

### 4.1 Modify `index.html`
Replace the hardcoded credentials with Supabase authentication:

```html
<!-- Update the form -->
<form class="login-form" id="loginForm">
    <div class="form-group">
        <label for="email">Email</label>
        <div class="input-wrapper">
            <i class="fa-solid fa-envelope"></i>
            <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="Enter your email"
                required
            >
        </div>
    </div>

    <div class="form-group">
        <label for="password">Password</label>
        <div class="input-wrapper">
            <i class="fa-solid fa-unlock"></i>
            <input 
                type="password" 
                id="password" 
                name="password" 
                placeholder="Enter your password"
                required
            >
            <i class="fa-solid fa-eye toggle-password" id="togglePassword"></i>
        </div>
    </div>

    <div class="form-options">
        <label class="remember-me">
            <input type="checkbox" name="remember" id="remember">
            <span>Remember me</span>
        </label>
        <a href="#" class="forgot-password" onclick="showForgotPassword()">Forgot Password?</a>
    </div>

    <button type="submit" class="login-btn" id="loginBtn">
        <i class="fa-solid fa-sign-in-alt"></i>
        Sign In
    </button>
    
    <!-- Loading spinner -->
    <div id="loginLoading" class="loading-overlay" style="display: none;">
        <i class="fa-solid fa-spinner fa-spin"></i>
    </div>
</form>

<!-- Add Forgot Password Modal -->
<div id="forgotPasswordModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Reset Password</h3>
            <button onclick="closeForgotPassword()">&times;</button>
        </div>
        <form id="forgotPasswordForm" onsubmit="handleForgotPassword(event)">
            <div class="form-group">
                <label for="resetEmail">Enter your email</label>
                <input type="email" id="resetEmail" required placeholder="your@email.com">
            </div>
            <div class="form-actions">
                <button type="button" onclick="closeForgotPassword()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Send Reset Link</button>
            </div>
        </form>
    </div>
</div>
```

### 4.2 Update Login Script in `index.html`
```javascript
import { signIn, isAuthenticated, resetPassword } from './src/js/auth/supabaseAuth.js';

// Check if already logged in
async function checkAuth() {
    const authenticated = await isAuthenticated();
    if (authenticated) {
        window.location.href = 'dashboard.html';
    }
}
checkAuth();

// Handle login form submission
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loading = document.getElementById('loginLoading');
    
    // Show loading
    loginBtn.disabled = true;
    loading.style.display = 'flex';
    
    try {
        const { data, error } = await signIn(email, password);
        
        if (error) {
            alert('Login failed: ' + error.message);
            return;
        }
        
        // Store user info in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userId', data.user.id);
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Login error:', error);
        alert('An unexpected error occurred. Please try again.');
    } finally {
        loginBtn.disabled = false;
        loading.style.display = 'none';
    }
});

// Forgot Password Functions
function showForgotPassword() {
    document.getElementById('forgotPasswordModal').style.display = 'flex';
}

function closeForgotPassword() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    const { error } = await resetPassword(email);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('Password reset link sent to your email!');
        closeForgotPassword();
    }
}
```

---

## Phase 5: Update Auth Utilities (src/js/auth.js)

### 5.1 Update `src/js/auth.js`
```javascript
import { signOut, getCurrentUser, onAuthStateChange } from './auth/supabaseAuth.js';

// Logout function
async function logout() {
    const { error } = await signOut();
    if (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    window.location.href = 'index.html';
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
        window.location.href = 'index.html';
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
        window.location.href = 'index.html';
    }
});

// Auto-attach logout buttons
document.addEventListener('DOMContentLoaded', function () {
    var els = document.querySelectorAll('[data-logout]');
    els.forEach(function (el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    });
});

// Export for use in other files
window.checkAuth = checkAuth;
window.logout = logout;
window.currentAdmin = currentAdmin;
```

---

## Phase 6: Update Protected Pages

### 6.1 Update All Protected Pages
Update the authentication check in all pages:
- `dashboard.html`
- `src/pages/input.html`
- `src/pages/rooms.html`
- `src/pages/equipment.html`
- `src/pages/report.html`
- `src/pages/logs.html`

Replace:
```javascript
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'index.html';
}
```

With:
```javascript
// Check if user is logged in (works with both old and new auth)
if (!localStorage.getItem('isLoggedIn')) {
    window.location.href = 'index.html';
}
```

---

## Phase 7: Add Sign Up Functionality (Optional)

### 7.1 Create Registration Page or Modal
Add ability for admins to create new users:

```html
<!-- Add to index.html or create new page -->
<div id="signupModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Create Admin Account</h3>
            <button onclick="closeSignup()">&times;</button>
        </div>
        <form id="signupForm" onsubmit="handleSignup(event)">
            <div class="form-group">
                <label for="signupEmail">Email</label>
                <input type="email" id="signupEmail" required>
            </div>
            <div class="form-group">
                <label for="signupPassword">Password</label>
                <input type="password" id="signupPassword" required minlength="8">
            </div>
            <div class="form-group">
                <label for="signupConfirmPassword">Confirm Password</label>
                <input type="password" id="signupConfirmPassword" required>
            </div>
            <div class="form-actions">
                <button type="button" onclick="closeSignup()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Account</button>
            </div>
        </form>
    </div>
</div>
```

---

## Phase 8: Security Enhancements

### 8.1 Add Row Level Security (RLS) Policies
In Supabase SQL Editor:

```sql
-- Items table - only authenticated users can read/write
DROP POLICY IF EXISTS "Allow authenticated access to items" ON public.items;
CREATE POLICY "Allow authenticated access to items" ON public.items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Equipment table
DROP POLICY IF EXISTS "Allow authenticated access to equipment" ON public.equipment;
CREATE POLICY "Allow authenticated access to equipment" ON public.equipment
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Rooms table
DROP POLICY IF EXISTS "Allow authenticated access to rooms" ON public.rooms;
CREATE POLICY "Allow authenticated access to rooms" ON public.rooms
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

### 8.2 Add Activity Logging
Track user logins:

```sql
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    email TEXT,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT
);

-- Log login activity
CREATE OR REPLACE FUNCTION public.log_login()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.login_logs (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_login
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.log_login();
```

---

## Implementation Order

1. **Phase 1**: Supabase Dashboard Configuration (5-10 minutes)
2. **Phase 2**: Update Supabase Client (2 minutes)
3. **Phase 3**: Create Authentication Module (10 minutes)
4. **Phase 4**: Update Login Page (15-20 minutes)
5. **Phase 5**: Update Auth Utilities (5 minutes)
6. **Phase 6**: Update Protected Pages (10 minutes)
7. **Phase 7**: Add Sign Up (Optional) (10 minutes)
8. **Phase 8**: Security Enhancements (10 minutes)

**Total Estimated Time**: 1-1.5 hours

---

## Testing Checklist

- [ ] Test user registration (if enabled)
- [ ] Test user login with valid credentials
- [ ] Test login with invalid credentials (error handling)
- [ ] Test "Remember me" functionality
- [ ] Test "Forgot Password" flow
- [ ] Test logout functionality
- [ ] Test session persistence (close browser, reopen)
- [ ] Test redirect to login when not authenticated
- [ ] Test all protected pages
- [ ] Test auth state change detection

---

## Rollback Plan

If issues occur, you can temporarily revert to the old authentication:
1. Keep the old `index.html` login logic as backup
2. The localStorage-based auth check will still work
3. Supabase auth can be disabled from the dashboard if needed

---

## Next Steps After Implementation

1. Add multi-factor authentication (MFA) in Supabase dashboard
2. Set up email templates for password reset
3. Add user roles (admin, staff, viewer)
4. Implement audit logging for all data changes
5. Add session timeout functionality
6. Set up webhooks for user events

---

## Support Resources

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Supabase JS Client: https://supabase.com/docs/reference/javascript/start
- Community: https://github.com/supabase/supabase/discussions

---

*Document created for RMNHS Supplies Inventory System*
*Last updated: 2026*
