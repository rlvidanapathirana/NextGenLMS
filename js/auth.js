/* NextGenLMS — Auth v4 FIXED */
'use strict';

const SESSION_KEY = 'nglms_session';

function saveSession(u) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); APP.user = u; }
function loadSession()  { try { const d = sessionStorage.getItem(SESSION_KEY); return d ? JSON.parse(d) : null; } catch { return null; } }

const PAGE = document.body.dataset.page || 'auth';

function goStudent()    { window.location.href = 'student.html'; }
function goAdmin()      { window.location.href = 'admin.html'; }
function goSuperAdmin() { window.location.href = 'superadmin.html'; }
function goAuth()       { window.location.href = 'index.html'; }

// ── Protected page guard ──────────────────────────
if (PAGE !== 'auth') {
  const sess = loadSession();
  if (!sess) { goAuth(); }
  else {
    APP.user = sess;
    const r = sess.role;
    if (PAGE === 'student'    && r !== 'student')                               { r === 'Super_Admin' ? goSuperAdmin() : goAdmin(); }
    if (PAGE === 'admin'      && !['Admin','Lecturer','Super_Admin'].includes(r)) { goAuth(); }
    if (PAGE === 'superadmin' && r !== 'Super_Admin')                            { r === 'student' ? goAuth() : goAdmin(); }
  }
}

// ── Auth Page ─────────────────────────────────────
if (PAGE === 'auth') {
  const existing = loadSession();
  if (existing) {
    if (existing.role === 'student')         goStudent();
    else if (existing.role === 'Super_Admin') goSuperAdmin();
    else goAdmin();
  }

  let authView  = 'login';
  let loginRole = 'student';

  window.setLoginRole = function (role, btn) {
    loginRole = role;
    document.querySelectorAll('.role-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const idInp = document.getElementById('l-id');
    const pwInp = document.getElementById('l-pw');
    if (idInp) idInp.placeholder = role === 'student' ? 'NIC / Passport number' : 'Admin username';
    if (pwInp) pwInp.placeholder = role === 'student' ? 'Your PIN' : 'Password';
  };

  window.showView = function (v) {
    authView = v;
    document.querySelectorAll('[data-view]').forEach(el => {
      el.classList.toggle('hidden', el.dataset.view !== v);
    });
  };

  // ── LOGIN ──────────────────────────────────────
  window.doLogin = async function () {
    const btn = document.getElementById('login-btn');
    const identifier = (document.getElementById('l-id')?.value || '').trim();
    const password   = (document.getElementById('l-pw')?.value || '').trim();
    if (!identifier || !password) { toast('Please fill in all fields.', 'warning'); return; }

    setBtnLoading(btn, true, 'Signing in...');
    const res = await call(
      loginRole === 'student' ? 'studentLogin' : 'adminLogin',
      loginRole === 'student' ? { identifier, pin: password } : { username: identifier, password }
    );
    setBtnLoading(btn, false);

    if (!res.success) { toast(res.message || 'Invalid credentials.', 'error'); return; }
    saveSession(res.user);
    toast(`Welcome, ${res.user.name}! 👋`, 'success');
    setTimeout(() => {
      const r = res.user.role;
      if (r === 'student')         goStudent();
      else if (r === 'Super_Admin') goSuperAdmin();
      else goAdmin();
    }, 600);
  };

  // ── STUDENT REGISTER ───────────────────────────
  window.doStudentRegister = async function () {
    const btn  = document.getElementById('sreg-btn');
    const name = (document.getElementById('sr-name')?.value || '').trim();
    const nic  = (document.getElementById('sr-nic')?.value  || '').trim();
    const email= (document.getElementById('sr-email')?.value|| '').trim();
    const pin  = (document.getElementById('sr-pin')?.value  || '').trim();
    const pin2 = (document.getElementById('sr-pin2')?.value || '').trim();
    if (!name || !nic || !pin) { toast('Name, NIC/Passport and PIN are required.', 'warning'); return; }
    if (pin !== pin2)          { toast('PINs do not match.', 'error'); return; }
    if (pin.length < 4)        { toast('PIN must be at least 4 characters.', 'warning'); return; }
    setBtnLoading(btn, true, 'Creating...');
    const res = await call('studentRegister', { name, nic, email, pin });
    setBtnLoading(btn, false);
    if (!res.success) { toast(res.message, 'error'); return; }
    toast('Account created! You can now sign in.', 'success');
    const idInp = document.getElementById('l-id');
    if (idInp) idInp.value = nic;
    window.showView('login');
    document.querySelectorAll('.role-tab').forEach((b, i) => {
      i === 0 ? b.classList.add('active') : b.classList.remove('active');
    });
    loginRole = 'student';
  };

  // ── LECTURER REGISTER ──────────────────────────
  window.doLecturerRegister = async function () {
    const btn  = document.getElementById('lreg-btn');
    const name = (document.getElementById('lr-name')?.value || '').trim();
    const uname= (document.getElementById('lr-user')?.value || '').trim();
    const email= (document.getElementById('lr-email')?.value|| '').trim();
    const dept = (document.getElementById('lr-dept')?.value || '').trim();
    const pw   = (document.getElementById('lr-pw')?.value   || '').trim();
    const pw2  = (document.getElementById('lr-pw2')?.value  || '').trim();
    if (!name || !uname || !pw) { toast('Name, username and password are required.', 'warning'); return; }
    if (pw !== pw2)             { toast('Passwords do not match.', 'error'); return; }
    if (pw.length < 6)          { toast('Password must be at least 6 characters.', 'warning'); return; }
    setBtnLoading(btn, true, 'Submitting...');
    const res = await call('lecturerRegister', { name, username: uname, email, department: dept, password: pw });
    setBtnLoading(btn, false);
    if (!res.success) { toast(res.message, 'error'); return; }
    toast('Application submitted! A Super Admin will review it.', 'success', 6000);
    window.showView('login');
  };

  // Enter key on login form
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && authView === 'login') doLogin();
  });

  // Init password strength meters
  setTimeout(() => {
    renderPwStrength('sr-pin', 'sr-pw-str');
    renderPwStrength('lr-pw',  'lr-pw-str');
  }, 200);
}
