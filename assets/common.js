// Service worker registration + shared UI + simple auth helpers
(function(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }

  // Drawer + nav highlighting + logout
  window.addEventListener('DOMContentLoaded', () => {
    // Protect pages (except login/register/index/offline)
    const protectedPages = ['dashboard.html', 'items.html', 'settings.html'];
    const path = location.pathname.split('/').pop();
    if (protectedPages.includes(path)) {
      if (!localStorage.getItem('sessionKey')) location.replace('login.html');
    }

    const drawer = document.getElementById('drawer');
    const toggle = document.getElementById('toggleDrawer');
    if (drawer && toggle) {
      toggle.addEventListener('click', () => {
        drawer.classList.toggle('collapsed');
        localStorage.setItem('drawer-collapsed', drawer.classList.contains('collapsed') ? '1' : '0');
      });
      if (localStorage.getItem('drawer-collapsed') === '1') drawer.classList.add('collapsed');
      const links = drawer.querySelectorAll('.list-group a');
      links.forEach(a => {
        if (location.pathname.endsWith(a.getAttribute('href'))) a.classList.add('active');
      });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('sessionKey');
        location.href = 'login.html';
      });
    }
  });

  // Tiny auth + storage helpers (localStorage only)
  window.store = {
    read(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  };

  window.auth = {
    register(email, password) {
      const users = store.read('users', []);
      if (users.find(u => u.email === email)) throw new Error('User already exists');
      users.push({ email, password });
      store.write('users', users);
    },
    login(email, password) {
      const users = store.read('users', []);
      const ok = users.find(u => u.email === email && u.password === password);
      if (!ok) throw new Error('Invalid credentials');
      const session = Math.random().toString(36).slice(2);
      localStorage.setItem('sessionKey', session);
    }
  };

  // Admin session management functions for ES6 modules
  window.getSession = function() {
    const session = sessionStorage.getItem('adminSession');
    if (!session) return null;
    
    const sessionData = JSON.parse(session);
    if (Date.now() > sessionData.expiresAt) {
      sessionStorage.removeItem('adminSession');
      return null;
    }
    
    return sessionData;
  };

  window.setSession = function(systemUserId, email, role) {
    const sessionData = {
      systemUserId,
      email,
      role,
      loginTime: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    sessionStorage.setItem('adminSession', JSON.stringify(sessionData));
  };

  window.logout = function() {
    sessionStorage.removeItem('adminSession');
    localStorage.removeItem('auth_token');
    window.location.href = 'admin-login.html';
  };
})();

// ES6 module exports for admin dashboard compatibility
export function getSession() {
  const session = sessionStorage.getItem('adminSession');
  if (!session) return null;
  
  const sessionData = JSON.parse(session);
  if (Date.now() > sessionData.expiresAt) {
    sessionStorage.removeItem('adminSession');
    return null;
  }
  
  return sessionData;
}

export function setSession(systemUserId, email, role) {
  const sessionData = {
    systemUserId,
    email,
    role,
    loginTime: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  sessionStorage.setItem('adminSession', JSON.stringify(sessionData));
}

export function logout() {
  sessionStorage.removeItem('adminSession');
  localStorage.removeItem('auth_token');
  window.location.href = 'admin-login.html';
}
