// Routes inside the shell only
const routes = {
  '#/dashboard': { tpl: 'pages/dashboard.html', script: null },
  '#/items':     { tpl: 'pages/items.html',     script: 'pages/items.js' },
  '#/settings':  { tpl: 'pages/settings.html',  script: 'pages/settings.js' },
  '':            { redirect: '#/dashboard' }
};

async function loadRoute(){
  auth.ensureInShell();  // <— if not logged in, go to login.html
  const hash = location.hash || '#/dashboard';
  const def = routes[hash] || routes[''];
  if (def.redirect) { location.hash = def.redirect; return; }

  const html = await (await fetch(def.tpl, { cache: 'no-cache' })).text();
  document.getElementById('app').innerHTML = html;

  if (def.script) {
    const mod = await import(`./${def.script}?v=${Date.now()}`);
    if (typeof mod.init === 'function') mod.init();
  }

  document.querySelectorAll('.list-group a').forEach(a=>{
    if (a.getAttribute('href') === hash) a.classList.add('active');
    else a.classList.remove('active');
  });
}

window.addEventListener('hashchange', loadRoute);
window.addEventListener('DOMContentLoaded', ()=>{
  if (!location.hash) location.hash = '#/dashboard';
  loadRoute();
});
