/* ═══════════════════════════════════════════════
   NextGenLMS — Auth Logic (Fixed)
═══════════════════════════════════════════════ */

const SESSION_KEY = 'nglms_session';

function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  APP.user = user;
}
function loadSession() {
  try {
    const d = sessionStorage.getItem(SESSION_KEY);
    return d ? JSON.parse(d) : null;
  } catch { return null; }
}

const PAGE = document.body.dataset.page || 'auth';

function goStudent()    { window.location.href = 'student.html'; }
function goAdmin()      { window.location.href = 'admin.html'; }
function goSuperAdmin() { window.location.href = 'superadmin.html'; }
function goAuth()       { window.location.href = 'index.html'; }

// ─── Protected page guard ────────────────────────
if (PAGE !== 'auth') {
  const sess = loadSession();
  if (!sess) {
    goAuth();
  } else {
    APP.user = sess;
    const r = sess.role;
    if (PAGE === 'student' && r !== 'student') {
      r === 'Super_Admin' ? goSuperAdmin() : goAdmin();
    }
    // admin.html accepts Lecturer, Admin, Super_Admin
    if (PAGE === 'admin' && !['Admin','Lecturer','Super_Admin'].includes(r)) {
      goAuth();
    }
    if (PAGE === 'superadmin' && r !== 'Super_Admin') {
      r === 'student' ? goAuth() : goAdmin();
    }
  }
}

// ─── AUTH PAGE ───────────────────────────────────
if (PAGE === 'auth') {
  const existing = loadSession();
  if (existing) {
    if (existing.role === 'student')         goStudent();
    else if (existing.role === 'Super_Admin') goSuperAdmin();
    else goAdmin();
  }

  let authView  = 'login';
  let loginRole = 'student';

  window.setLoginRole = function(role, btn) {
    loginRole = role;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Update placeholder
    const idField = document.getElementById('l-id');
    const pwField = document.getElementById('l-pw');
    if (role === 'student') {
      idField.placeholder = 'NIC / Passport number';
      pwField.placeholder = 'Your PIN';
    } else {
      idField.placeholder = 'Admin username';
      pwField.placeholder = 'Password';
    }
  };

  window.showView = function(v) {
    authView = v;
    document.querySelectorAll('[data-view]').forEach(el => {
      el.classList.toggle('hidden', el.dataset.view !== v);
    });
    const heads = {
      'login':       { h: 'Welcome Back',        p: 'Sign in to your NextGenLMS account.' },
      'reg-student': { h: 'Create Account',       p: 'Register with your NIC or Passport number.' },
      'reg-lecturer':{ h: 'Apply as Lecturer',    p: 'Submit your application — a Super Admin will approve it.' },
    };
    const info = heads[v] || heads['login'];
    document.getElementById('form-title').textContent = info.h;
    document.getElementById('form-sub').textContent   = info.p;
  };

  // ── LOGIN ──────────────────────────────────────
  window.doLogin = async function() {
    const btn        = document.getElementById('login-btn');
    const identifier = document.getElementById('l-id').value.trim();
    const password   = document.getElementById('l-pw').value.trim();
    if (!identifier || !password) { toast('Please fill in all fields.', 'warning'); return; }

    setBtnLoading(btn, true, 'Signing in...');
    const action = loginRole === 'student' ? 'studentLogin' : 'adminLogin';
    const payload = loginRole === 'student'
      ? { identifier, pin: password }
      : { username: identifier, password };
    const res = await call(action, payload);
    setBtnLoading(btn, false);

    if (!res.success) { toast(res.message || 'Invalid credentials.', 'error'); return; }

    saveSession(res.user);
    toast(`Welcome, ${res.user.name}! 👋`, 'success');
    setTimeout(() => {
      const r = res.user.role;
      if (r === 'student')         goStudent();
      else if (r === 'Super_Admin') goSuperAdmin();
      else goAdmin();
    }, 700);
  };

  // ── STUDENT REGISTER ───────────────────────────
  window.doStudentRegister = async function() {
    const btn  = document.getElementById('sreg-btn');
    const name = document.getElementById('sr-name').value.trim();
    const nic  = document.getElementById('sr-nic').value.trim();
    const email= document.getElementById('sr-email').value.trim();
    const pin  = document.getElementById('sr-pin').value.trim();
    const pin2 = document.getElementById('sr-pin2').value.trim();
    if (!name || !nic || !pin) { toast('Name, NIC/Passport and PIN are required.', 'warning'); return; }
    if (pin !== pin2)          { toast('PINs do not match.', 'error'); return; }
    if (pin.length < 4)        { toast('PIN must be at least 4 characters.', 'warning'); return; }

    setBtnLoading(btn, true, 'Creating account...');
    const res = await call('studentRegister', { name, nic, email, pin });
    setBtnLoading(btn, false);
    if (!res.success) { toast(res.message, 'error'); return; }

    toast('Account created! You can now sign in.', 'success');
    document.getElementById('l-id').value = nic;
    document.getElementById('l-pw').value = '';
    window.showView('login');
    // Switch to student tab
    const btns = document.querySelectorAll('.role-btn');
    btns.forEach(b => b.classList.remove('active'));
    if (btns[0]) { btns[0].classList.add('active'); loginRole = 'student'; }
  };

  // ── LECTURER REGISTER ──────────────────────────
  window.doLecturerRegister = async function() {
    const btn  = document.getElementById('lreg-btn');
    const name = document.getElementById('lr-name').value.trim();
    const uname= document.getElementById('lr-user').value.trim();
    const email= document.getElementById('lr-email').value.trim();
    const dept = document.getElementById('lr-dept').value.trim();
    const pw   = document.getElementById('lr-pw').value.trim();
    const pw2  = document.getElementById('lr-pw2').value.trim();
    if (!name || !uname || !pw) { toast('Name, username and password are required.', 'warning'); return; }
    if (pw !== pw2)             { toast('Passwords do not match.', 'error'); return; }
    if (pw.length < 6)          { toast('Password must be at least 6 characters.', 'warning'); return; }

    setBtnLoading(btn, true, 'Submitting...');
    const res = await call('lecturerRegister', { name, username: uname, email, department: dept, password: pw });
    setBtnLoading(btn, false);
    if (!res.success) { toast(res.message, 'error'); return; }
    toast('Application submitted! A Super Admin will review your account.', 'success', 6000);
    window.showView('login');
  };

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && authView === 'login') doLogin();
  });

  setTimeout(() => {
    renderPwStrength('sr-pin', 'sr-pw-strength');
    renderPwStrength('lr-pw', 'lr-pw-strength');
  }, 300);
}
