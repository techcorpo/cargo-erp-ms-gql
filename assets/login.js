document.getElementById('loginForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  err.style.display='none';
  try {
    auth.login(email, password);                     // sets sessionKey in localStorage
    location.replace('layout.html#//dashboard');     // enter the shell
  } catch(e){ err.textContent = e.message || 'Login error'; err.style.display='block'; }
});
