const form = document.getElementById('settingsForm');
const nameEl = document.getElementById('displayName');
const tzEl = document.getElementById('timezone');
const msg = document.getElementById('settingsMsg');

document.addEventListener('DOMContentLoaded', () => {
  const pref = store.read('prefs', { displayName: 'User', timezone: 'Asia/Kolkata' });
  nameEl.value = pref.displayName || '';
  tzEl.value = pref.timezone || 'Asia/Kolkata';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  store.write('prefs', { displayName: nameEl.value.trim(), timezone: tzEl.value.trim() });
  msg.style.display = 'block';
  setTimeout(() => (msg.style.display = 'none'), 1500);
});
