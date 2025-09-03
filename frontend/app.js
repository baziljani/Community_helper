// Fetch all users (admin only)
async function fetchAllUsers() {
  const res = await fetch(API + '/admin/users', { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) return [];
  return res.json();
}

// Fetch live users (admin only)
async function fetchLiveUsers() {
  const res = await fetch(API + '/admin/live-users', { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) return [];
  return res.json();
}
const API = 'http://localhost:5000';
let token = localStorage.getItem('token') || '';


const el = id => document.getElementById(id);
const authMsg = el('authMsg');


// Navbar navigation for new layout
function setupNavbarNav() {
  const navHome = el('navHome');
  const navForms = el('navForms');
  const navAbout = el('navAbout');
  const navAdmin = el('navAdmin');
  const navLogout = el('navLogout');
  if (navHome) navHome.onclick = (e) => { e.preventDefault(); showSection('homeSection'); showHomeForms(); };
  if (navForms) navForms.onclick = (e) => { e.preventDefault(); showSection('formsSection'); showFormsSection(); };
  if (navAbout) navAbout.onclick = (e) => { e.preventDefault(); showSection('aboutSection'); };
  if (navAdmin) navAdmin.onclick = (e) => { e.preventDefault(); showSection('adminSection'); };
  if (navLogout) navLogout.onclick = logout;
}

function showSection(sectionId) {
  const sections = ['homeSection', 'formsSection', 'aboutSection', 'adminSection'];
  sections.forEach(id => {
    const sec = document.getElementById(id);
    if (sec) sec.classList.add('hidden');
  });
  const active = document.getElementById(sectionId);
  if (active) active.classList.remove('hidden');
  // Highlight active nav link
  document.querySelectorAll('.navbar-links a').forEach(a => a.classList.remove('active'));
  const navMap = { homeSection: 'navHome', formsSection: 'navForms', aboutSection: 'navAbout', adminSection: 'navAdmin' };
  if (navMap[sectionId]) {
    const nav = document.getElementById(navMap[sectionId]);
    if (nav) nav.classList.add('active');
  }
}


function showHomeSection() {
  hideAllMainContent();
  const homeDiv = el('homeDetails');
  homeDiv.innerHTML = `
    <div class="home-info">
      <h2>Welcome!</h2>
      <p><b>Bazil Jani</b> <br>Creator of this site<br>Web Developer / WordPress Developer</p>
      <p>Find me on:
        <a href="https://github.com/baziljani" target="_blank" rel="noopener">GitHub</a> |
        <a href="https://linkedin.com/in/baziljani" target="_blank" rel="noopener">LinkedIn</a> |
        <a href="https://twitter.com/baziljani" target="_blank" rel="noopener">Twitter</a>
      </p>
      <p>Job Sites:
        <a href="https://indeed.com" target="_blank" rel="noopener">Indeed</a> |
        <a href="https://naukri.com" target="_blank" rel="noopener">Naukri</a>
      </p>
      <p>Study Materials: <a href="https://yourstudymaterials.com" target="_blank" rel="noopener">yourstudymaterials.com</a></p>
    </div>
  `;
  homeDiv.classList.remove('hidden');
}

function hideAllMainContent() {
  el('homeDetails').classList.add('hidden');
  el('formDetails').classList.add('hidden');
}

function showAdminSection() {
  el('adminSection').classList.remove('hidden');
  loadAdminPanel();
}


// Show all forms as cards in Home section (clickable)
async function showHomeForms() {
  const formsListContainerHome = document.getElementById('formsListContainerHome');
  if (!formsListContainerHome) return;
  const forms = await fetchForms();
  formsListContainerHome.innerHTML = '';
  forms.forEach(form => {
    const div = document.createElement('div');
    div.className = 'form-card';
    div.innerHTML = `<b>${form.name}</b><br><span style='color:#555'>${form.description || ''}</span>`;
    div.onclick = () => {
      showSection('formsSection');
      showFormsSection(form.id);
      setTimeout(() => {
        const sel = el('formsSelect');
        if (sel) sel.value = form.id;
        el('genBtn').click();
      }, 100);
    };
    formsListContainerHome.appendChild(div);
  });
}

// Show all forms as cards and dropdown in Forms section (clickable)
async function showFormsSection(selectedId) {
  const formsSelect = el('formsSelect');
  const formsListContainer = document.getElementById('formsListContainer');
  if (!formsSelect || !formsListContainer) return;
  const forms = await fetchForms();
  formsSelect.innerHTML = '<option value="">-- choose --</option>';
  formsListContainer.innerHTML = '';
  forms.forEach(form => {
    // Dropdown option
    const opt = document.createElement('option');
    opt.value = form.id;
    opt.textContent = form.name;
    formsSelect.appendChild(opt);
    // Visible form card/list
    const div = document.createElement('div');
    div.className = 'form-card' + (selectedId === form.id ? ' selected' : '');
    div.innerHTML = `<b>${form.name}</b><br><span style='color:#555'>${form.description || ''}</span>`;
    div.onclick = () => {
      formsSelect.value = form.id;
      el('genBtn').click();
      // Highlight selected
      document.querySelectorAll('.form-card').forEach(card => card.classList.remove('selected'));
      div.classList.add('selected');
    };
    formsListContainer.appendChild(div);
  });
  // Clear preview and iframe code
  el('preview').innerHTML = '';
  el('iframeCode').value = '';
  // If a form is selected, select it and generate
  if (selectedId) {
    formsSelect.value = selectedId;
    el('genBtn').click();
  }
}

function showFormDetails(form) {
  hideAllMainContent();
  const formDiv = el('formDetails');
  formDiv.innerHTML = `
    <div class="form-info">
      <h2>${form.name}</h2>
      <p>${form.description || ''}</p>
      <button onclick="document.getElementById('formsSelect').value='${form.id}';document.getElementById('genBtn').click();">Generate This Form</button>
    </div>
  `;
  formDiv.classList.remove('hidden');
}

// Admin: show live users
async function showLiveUsers() {
  const liveUsersDiv = el('adminLiveUsers');
  if (!liveUsersDiv) return;
  const users = await fetchLiveUsers();
  if (!users.length) {
    liveUsersDiv.textContent = 'No users online.';
    return;
  }
  liveUsersDiv.innerHTML = '<b>Logged in users:</b><br>' + users.map(u => `<span style="color:#ffcc33">${u.username}</span>`).join(', ');
}

async function login(username, password) {
  try {
    const res = await fetch(API + '/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password })});
    const data = await res.json();
    if (!res.ok) { authMsg.textContent = data.message || 'Login failed'; return false; }
    token = data.token;
    localStorage.setItem('token', token);
    localStorage.setItem('role', data.role);
    // After login, update UI for new layout
    setupNavbarNav();
    showSection('homeSection');
    showHomeForms();
    if (data.role === 'admin') showLiveUsers();
    return true;
  } catch (err) {
    authMsg.textContent = 'Unable to connect to server. Please check if backend is running.';
    return false;
  }
}

async function signup(username, password) {
  try {
    const res = await fetch(API + '/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password })});
    const data = await res.json();
    if (!res.ok) { authMsg.textContent = data.message || 'Signup failed'; return false; }
    authMsg.textContent = 'User created. You can login now.';
    return true;
  } catch (err) {
    authMsg.textContent = 'Unable to connect to server. Please check if backend is running.';
    return false;
  }
}

async function fetchForms() {
  const res = await fetch(API + '/forms', { headers:{ Authorization: 'Bearer ' + token }});
  if (!res.ok) { console.error('fetch forms failed'); return []; }
  return res.json();
}

async function generate(formId) {
  const res = await fetch(API + '/generate', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ formId })});
  return res.json();
}

async function loadAdminLogs() {
  const res = await fetch(API + '/admin/logs', { headers:{ Authorization: 'Bearer ' + token }});
  if (!res.ok) return [];
  return res.json();
}


// On page load, setup navbar and show Home
window.addEventListener('DOMContentLoaded', () => {
  setupNavbarNav();
  showSection('homeSection');
  showHomeForms();
  if (localStorage.getItem('role') === 'admin') showLiveUsers();
});

function validateEmail(email) {
  // Simple email regex
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// UI wiring
el('loginBtn').addEventListener('click', async () => {
  const username = el('username').value.trim();
  const password = el('password').value.trim();
  if (!username || !password) { authMsg.textContent = 'Enter credentials'; return; }
  const ok = await login(username, password);
  if (ok) initApp();
});

el('signupBtn').addEventListener('click', async () => {
  const username = el('username').value.trim();
  const password = el('password').value.trim();
  if (!username || !password) { authMsg.textContent = 'Enter credentials'; return; }
  const ok = await signup(username, password);
  if (ok) {
    authMsg.textContent = 'Signup successful. Please login.';
  }
});

el('logoutBtn').addEventListener('click', () => {
  token = '';
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  document.getElementById('auth').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
});

el('genBtn').addEventListener('click', async () => {
  const select = el('formsSelect');
  const formId = select.value;
  if (!formId) return alert('Choose a form');
  const data = await generate(formId);
  if (data.formHtml) {
    // Parse the form HTML and replace date fields with input type="date"
    let html = data.formHtml;
    // Replace text inputs for date fields with type="date"
    html = html.replace(/<label>([^<]*Date[^<]*)<\/label><input([^>]*)type=\"?text\"?([^>]*)>/gi, (match, label, before, after) => {
      return `<label>${label}</label><input type="date"${before}${after}>`;
    });
    el('preview').innerHTML = html;
    el('iframeCode').value = data.iframeCode;
  } else if (data.iframeCode) {
    el('preview').innerHTML = data.iframeCode;
    el('iframeCode').value = data.iframeCode;
  } else {
    alert(data.message || 'Error');
  }
});


async function initApp() {
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  const role = localStorage.getItem('role') || 'user';
  el('welcome').textContent = 'Hello, ' + (role === 'admin' ? 'Admin' : 'User');
  showSection('homeSection');
  showHomeForms();
  if (role === 'admin') {
    document.getElementById('adminSection').style.display = 'block';
    try {
      const logs = await loadAdminLogs();
      const logsDiv = el('logs');
      logsDiv.innerHTML = logs.map(l => `<div>${new Date(l.date).toLocaleString()} — ${l.username} — ${l.formName}</div>`).join('');
    } catch (err) {
      el('logs').innerHTML = '<div>Failed to load logs.</div>';
    }
    // Fetch and show all users
    try {
      const users = await fetchAllUsers();
      const usersDiv = document.getElementById('usersList');
      usersDiv.innerHTML = users.map(u => `<div>${u.username} (${u.role})</div>`).join('');
    } catch (err) {
      document.getElementById('usersList').innerHTML = '<div>Failed to load users.</div>';
    }
  } else {
    document.getElementById('adminSection').style.display = 'none';
  }
}

// Auto-init if token present
if (token) initApp();
