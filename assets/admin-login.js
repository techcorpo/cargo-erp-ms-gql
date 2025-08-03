// assets/admin-login.js
import { apiClient } from './api-client.js';

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
    window.location.href = 'https://cargo-erp.netlify.app/admin-dashboard.html';
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
      // Use GraphQL login mutation
      console.log('Attempting login for:', email);
      
      const mutation = `
        mutation AdminLogin($input: LoginInput!) {
          login(input: $input) {
            success
            message
            token
            user {
              id
              email
              firstName
              lastName
              role
            }
          }
        }
      `;
      
      const variables = { input: { email, password } };
      const result = await apiClient.graphqlQuery(mutation, variables);
      
      console.log('Login response:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (!result.login.success) {
        throw new Error(result.login.message || 'Invalid credentials');
      }
      
      const { token, user } = result.login;
      
      // Store the auth token
      localStorage.setItem('auth_token', token);
      
      // Set session
      setSession(user.id, user.email, user.role);
      
      // Redirect to admin dashboard
      window.location.href = 'https://cargo-erp.netlify.app/admin-dashboard.html';
      
    } catch (error) {
      console.error('Login error:', error);
      showError(error.message || 'Login failed. Please try again.');
    } finally {
      showSpinner(false);
    }
  });
});
