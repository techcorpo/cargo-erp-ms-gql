// SW registration (optional)
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(console.warn); }

// Helpers
window.store = { read(k,fb){ try{return JSON.parse(localStorage.getItem(k)) ?? fb;}catch{return fb;} },
                 write(k,v){ localStorage.setItem(k, JSON.stringify(v)); } };

window.auth = {
  ensureInShell(){ if (!localStorage.getItem('sessionKey')) location.replace('login.html'); },
  register(email,password){
    const users = store.read('users', []);
    if (users.find(u=>u.email===email)) throw new Error('User already exists');
    users.push({email,password}); store.write('users', users);
  },
  login(email,password){
    const users = store.read('users', []);
    if (!users.find(u=>u.email===email && u.password===password)) throw new Error('Invalid credentials');
    localStorage.setItem('sessionKey', Math.random().toString(36).slice(2));
  }
};

// Shell-only UI
window.addEventListener('DOMContentLoaded', ()=>{
  // logout in shell
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', ()=>{ localStorage.removeItem('sessionKey'); location.href='login.html'; });

  // drawer
  const drawer = document.getElementById('drawer');
  const toggle = document.getElementById('toggleDrawer');
  if (drawer && toggle){
    toggle.addEventListener('click', ()=>{
      drawer.classList.toggle('collapsed');
      localStorage.setItem('drawer-collapsed', drawer.classList.contains('collapsed') ? '1':'0');
    });
    if (localStorage.getItem('drawer-collapsed')==='1') drawer.classList.add('collapsed');
  }
});
