// Balou Puppycoach — Firebase synchronisatie (GitHub Pages, zonder bundler)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBGT6gyTuXkQLXNG6O6VDgk7GzNi3Kc34A',
  authDomain: 'balou-puppycoach.firebaseapp.com',
  projectId: 'balou-puppycoach',
  storageBucket: 'balou-puppycoach.firebasestorage.app',
  messagingSenderId: '51837085587',
  appId: '1:51837085587:web:e534132c4f98dbd0856a66',
  measurementId: 'G-8D3GHC5L1T'
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let unsubscribeTasks = null;
let unsubscribeSettings = null;
let currentUser = null;
let ready = false;
const status = document.createElement('div');
status.id = 'balou-sync-status';
status.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;max-width:650px;margin:auto;background:#184f43;color:white;padding:9px 12px;border-radius:12px;font-size:12px;text-align:center;z-index:12;box-shadow:0 2px 12px #0003';
status.textContent = 'Verbinding maken…';
document.body.append(status);
const login = document.createElement('div');
login.id = 'balou-login';
login.style.cssText = 'position:fixed;inset:0;z-index:20;background:#f5f6f1;display:flex;align-items:center;justify-content:center;padding:20px';
login.innerHTML = `<form id="balou-login-form" style="width:100%;max-width:420px;background:white;border-radius:20px;padding:24px;box-shadow:0 3px 16px #0001"><h1>🐾 Balou Puppycoach</h1><p>Log in om jullie gezamenlijke voortgang te bekijken.</p><label for="balou-email">E-mailadres</label><input id="balou-email" type="email" autocomplete="username" required style="width:100%;padding:12px;border:1px solid #ccd8cf;border-radius:10px;font-size:16px"><label for="balou-password">Wachtwoord</label><input id="balou-password" type="password" autocomplete="current-password" required style="width:100%;padding:12px;border:1px solid #ccd8cf;border-radius:10px;font-size:16px"><p id="balou-login-error" role="alert" style="color:#a33333;font-size:13px"></p><button class="btn" style="width:100%" type="submit">Inloggen</button></form>`;
document.body.append(login);
const setStatus = msg => { status.textContent = msg; };
const taskDoc = day => doc(db, 'balouDays', day);
const configDoc = doc(db, 'balouShared', 'settings');
const dayString = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function updateChecks(data) {
  document.querySelectorAll('[data-check]').forEach(el => {
    const record = data?.[el.dataset.check];
    el.checked = !!record?.done;
    const key = 'balou_' + dayString() + '_' + el.dataset.check;
    localStorage.setItem(key, el.checked ? '1' : '0');
    const label = el.closest('.item');
    if (!label) return;
    let by = label.querySelector('.balou-by');
    if (!by) { by = document.createElement('small'); by.className = 'balou-by'; label.querySelector('span')?.append(by); }
    const when = record?.at?.toDate?.();
    by.textContent = record?.done ? `✓ ${record.by || 'Gezin'}${when ? ' · ' + when.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}) : ''}` : '';
  });
  if (typeof window.balouUpdateProgress === 'function') window.balouUpdateProgress();
}
function attachListeners() {
  unsubscribeTasks?.(); unsubscribeSettings?.();
  unsubscribeTasks = onSnapshot(taskDoc(dayString()), snapshot => {
    ready = true;
    updateChecks(snapshot.exists() ? snapshot.data().tasks || {} : {});
    setStatus(`✓ Gedeeld met gezin · ${currentUser.email}`);
  }, error => { ready = false; setStatus('Synchronisatie mislukt: ' + error.code); });
  unsubscribeSettings = onSnapshot(configDoc(), snapshot => {
    if (!snapshot.exists()) return;
    const incoming = snapshot.data().config;
    if (!incoming) return;
    const old = JSON.parse(localStorage.getItem('balou_config') || '{}');
    if (JSON.stringify(old) !== JSON.stringify(incoming)) {
      localStorage.setItem('balou_config', JSON.stringify(incoming));
      // Opnieuw tekenen met de gedeelde instellingen, zonder eindeloze reload.
      if (!sessionStorage.getItem('balou-settings-reloading')) {
        sessionStorage.setItem('balou-settings-reloading','1');
        location.reload();
      } else { sessionStorage.removeItem('balou-settings-reloading'); }
    }
  }, error => setStatus('Instellingen niet beschikbaar: ' + error.code));
}
login.querySelector('form').addEventListener('submit', async e => {
  e.preventDefault();
  const err = document.getElementById('balou-login-error');
  err.textContent = '';
  try { await signInWithEmailAndPassword(auth, document.getElementById('balou-email').value.trim(), document.getElementById('balou-password').value); }
  catch (error) { err.textContent = 'Inloggen mislukt. Controleer e-mailadres en wachtwoord (' + error.code + ').'; }
});
onAuthStateChanged(auth, user => {
  currentUser = user;
  ready = false;
  if (!user) { unsubscribeTasks?.(); unsubscribeSettings?.(); login.style.display = 'flex'; setStatus('Log in om te synchroniseren'); return; }
  login.style.display = 'none';
  setStatus('Voortgang ophalen…');
  attachListeners();
});
window.balouSync = {
  async check(id, done) {
    if (!currentUser || !ready) { setStatus('Wacht op synchronisatie en probeer opnieuw'); return false; }
    try {
      await setDoc(taskDoc(dayString()), { tasks: { [id]: { done, by: currentUser.email, at: serverTimestamp() } } }, { merge: true });
      return true;
    } catch (e) { setStatus('Opslaan mislukt: ' + e.code); return false; }
  },
  async saveConfig(config) {
    if (!currentUser) throw new Error('Niet ingelogd');
    await setDoc(configDoc(), { config, updatedBy: currentUser.email, updatedAt: serverTimestamp() }, { merge: true });
  },
  logout: () => signOut(auth)
};
const logoutButton = document.createElement('button');
logoutButton.textContent = 'Uitloggen';
logoutButton.className = 'btn secondary';
logoutButton.style.cssText = 'margin:8px 0';
logoutButton.onclick = () => window.balouSync.logout();
const footer = document.querySelector('footer');
if (footer) { footer.textContent = 'Balou Puppycoach · Gezamenlijke voortgang via Firebase'; footer.before(logoutButton); }
