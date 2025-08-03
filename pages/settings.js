export function init(){
  const form = document.getElementById('settingsForm');
  const nameEl = document.getElementById('displayName');
  const tzEl = document.getElementById('timezone');
  const msg = document.getElementById('settingsMsg');

  const prefs = store.read('prefs', { displayName:'User', timezone:'Asia/Kolkata' });
  nameEl.value = prefs.displayName || '';
  tzEl.value = prefs.timezone || 'Asia/Kolkata';

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    store.write('prefs', { displayName: nameEl.value.trim(), timezone: tzEl.value.trim() });
    msg.style.display='block'; setTimeout(()=>msg.style.display='none',1500);
  });
}
