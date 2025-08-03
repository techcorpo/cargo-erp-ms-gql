// assets/admin-login.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://vvgsufumkaleisthgivp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Z3N1ZnVta2FsZWlzdGhnaXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTQ1NTcsImV4cCI6MjA2ODY5MDU1N30.Uexa8bgQgGS51pZLEz3zXRkFhF8SBySq3kvsB4Doui0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);

function showError(message) {
  const errorEl = $('loginError');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('d-none');
  } else {
    console.error('Error element not found:', message);
  }
}

function hideError() {
  const errorEl = $('loginError');
  if (errorEl) {
    errorEl.classList.add('d-none');
  }
}

function showSpinner(show = true) {
  const spinner = $('loginSpinner');
  const button = document.querySelector('button[type="submit"]');
  
  if (!spinner || !button) {
    console.error('Spinner or button element not found');
    return;
  }
  
  if (show) {
    spinner.classList.remove('d-none');
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';
  } else {
    spinner.classList.add('d-none');
    button.disabled = false;
    button.innerHTML = 'Sign In';
  }
}

// Simple session management
function setSession(systemUserId, email, role) {
  const sessionData = {
    systemUserId,
    email,
    role,
    loginTime: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  sessionStorage.setItem('adminSession', JSON.stringify(sessionData));
}

function getSession() {
  const session = sessionStorage.getItem('adminSession');
  if (!session) return null;
  
  const sessionData = JSON.parse(session);
  if (Date.now() > sessionData.expiresAt) {
    sessionStorage.removeItem('adminSession');
    return null;
  }
  
  return sessionData;
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in
  const session = getSession();
  if (session) {
    window.location.href = 'admin-dashboard.html';
    return;
  }

  // Add form submit handler
  const form = document.getElementById('adminLoginForm');
  if (!form) {
    console.error('Login form not found');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    hideError();
    showSpinner(true);
    
    const emailEl = $('email');
    const passwordEl = $('password');
    
    if (!emailEl || !passwordEl) {
      showError('Form elements not found');
      showSpinner(false);
      return;
    }
    
    const email = emailEl.value.trim();
    const password = passwordEl.value;
  
  try {
    // Query system_users table to verify credentials
    console.log('Attempting login for:', email);
    
    const { data: users, error } = await supabase
      .from('system_users')
      .select('id, email, first_name, last_name, role, password_hash')
      .eq('email', email)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single();
      
    console.log('Database response:', { users, error });
      
    if (error || !users) {
      console.error('Database error or user not found:', error);
      throw new Error('Invalid credentials');
    }
    
    // For demo purposes with simple password check
    // In production, you would call a secure Edge Function to verify the password
    // For now, we'll use a simple comparison (NOT SECURE for production)
    
    // Simple password verification (replace with proper bcrypt verification in production)
    let passwordValid = false;
    
    console.log('Checking password:', password, 'against hash:', users.password_hash);
    
    // Check if it's the default password
    if (password === 'admin123' && users.password_hash === '$2b$10$uUSmW30iWROhzcgqhbAXdOTI2Yl/3kfojQK9ga5qNQAfk2W25J7GC') {
      passwordValid = true;
    }
    
    // TODO: In production, create an Edge Function that uses bcrypt.compare() server-side
    // Example Edge Function call:
    // const { data: verification } = await supabase.functions.invoke('verify-admin-password', {
    //   body: { email, password }
    // });
    // passwordValid = verification.valid;
    
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Set session
    setSession(users.id, users.email, users.role);
    
    // Redirect to admin dashboard
    window.location.href = 'admin-dashboard.html';
    
  } catch (error) {
    showError(error.message || 'Login failed. Please try again.');
  } finally {
    showSpinner(false);
  }
  });
});
