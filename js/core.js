/* NextGenLMS — Core v4 FIXED */
'use strict';

const API = 'https://script.google.com/macros/s/AKfycbw5pCrGRNHgUvC9oC5Jc8utcaijZx6mQP7_Zshihx7eb3Y9s7LfiFUuGBS7GsGVvRjL/exec';
let APP = { user: null };

// ── Year ──────────────────────────────────────────
document.querySelectorAll('.auto-year').forEach(el => el.textContent = new Date().getFullYear());

// ── Theme ─────────────────────────────────────────
const THEME_KEY = 'nglms_theme';
(function () {
  const t = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', t);
  _syncTheme(t);
})();
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  _syncTheme(next);
}
function _syncTheme(t) {
  document.querySelectorAll('[data-theme-icon]').forEach(el => {
    el.className = el.className
      .replace(/fa-sun|fa-moon/g, '')
      .trim() + (t === 'dark' ? ' fa-sun' : ' fa-moon');
  });
}

// ── API ───────────────────────────────────────────
async function call(action, data = {}) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      body: JSON.stringify({ action, ...data }),
      headers: { 'Content-Type': 'text/plain' }
    });
    return await res.json();
  } catch (e) {
    console.error('[API]', action, e);
    return { success: false, message: 'Connection error. Please try again.' };
  }
}

// ── Toast ─────────────────────────────────────────
function toast(msg, type = 'info', dur = 4000) {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info', warning:'fa-triangle-exclamation' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.info} toast-icon"></i><span class="toast-msg">${esc(String(msg))}</span><i class="fa-solid fa-xmark toast-close"></i>`;
  el.querySelector('.toast-close').addEventListener('click', () => el.remove());
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s forwards';
    setTimeout(() => el.remove(), 320);
  }, dur);
}

// ── Confirm ───────────────────────────────────────
let _confCb = null;
function confirm2(title, msg, cb, { label = 'Delete', type = 'danger' } = {}) {
  document.getElementById('conf-title').textContent = title;
  document.getElementById('conf-msg').textContent = msg;
  const ok = document.getElementById('conf-ok');
  ok.textContent = label; ok.className = `btn btn-${type}`;
  _confCb = cb;
  document.getElementById('conf-overlay').classList.add('open');
}
function closeConfirm() { document.getElementById('conf-overlay').classList.remove('open'); _confCb = null; }

const _confOk = document.getElementById('conf-ok');
const _confCa = document.getElementById('conf-cancel');
if (_confOk) _confOk.addEventListener('click', () => { if (_confCb) _confCb(); closeConfirm(); });
if (_confCa) _confCa.addEventListener('click', closeConfirm);

// ── Modals ────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function buildModal(id, title, body, footer = '', large = false) {
  document.getElementById(id)?.remove();
  const el = document.createElement('div');
  el.id = id; el.className = 'modal-overlay';
  el.innerHTML = `
    <div class="modal${large?' modal-xl':''}">
      <div class="modal-head">
        <h3>${String(title)}</h3>
        <button class="btn btn-ghost btn-sm btn-icon" id="${id}-close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  // Close on backdrop click
  el.addEventListener('click', e => { if (e.target === el) closeModal(id); });
  // Close on X button
  el.querySelector(`#${id}-close`)?.addEventListener('click', () => closeModal(id));
  document.getElementById('modals-root').appendChild(el);
  requestAnimationFrame(() => openModal(id));
}

// ── Sidebar ───────────────────────────────────────
function openSidebar(id) {
  document.getElementById(id)?.classList.add('open');
  const ov = document.getElementById('sb-overlay');
  if (ov) { ov.classList.add('open'); ov.style.display = 'block'; }
}
function closeSidebar() {
  document.querySelectorAll('.sidebar').forEach(s => s.classList.remove('open'));
  const ov = document.getElementById('sb-overlay');
  if (ov) { ov.classList.remove('open'); }
}

// ── Helpers ───────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function str(v) { return String(v === null || v === undefined ? '' : v).replace(/\.0+$/, '').trim(); }
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }
  catch { return String(d); }
}
function fmtDateTime(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return String(d); }
}
function initials(name) { return String(name || '?').trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?'; }

// URL embed helpers
function ytEmbed(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([^&?/\s#]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1` : null;
}
function gdEmbed(url) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
}
function gSlideEmbed(url) {
  const m = url.match(/presentation\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false` : null;
}
function gDocEmbed(url) {
  const m = url.match(/document\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://docs.google.com/document/d/${m[1]}/preview` : null;
}
function gFormEmbed(url) {
  if (!url.includes('docs.google.com/forms') && !url.includes('forms.gle')) return null;
  const clean = url.replace('/viewform','').replace('/edit','');
  return clean + (clean.includes('?') ? '&' : '?') + 'embedded=true';
}
function detectEmbed(url, type) {
  if (!url) return null;
  if (type === 'Video')        return ytEmbed(url) || gdEmbed(url);
  if (type === 'PDF')          return gdEmbed(url);
  if (type === 'Quiz')         return gFormEmbed(url);
  if (type === 'Presentation') return gSlideEmbed(url);
  if (type === 'Text')         return gDocEmbed(url) || gSlideEmbed(url);
  return ytEmbed(url) || gSlideEmbed(url) || gDocEmbed(url) || gdEmbed(url) || gFormEmbed(url);
}

// Password helpers
function pwStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
function renderPwStrength(inputId, containerId) {
  const input = document.getElementById(inputId);
  const cont  = document.getElementById(containerId);
  if (!input || !cont) return;
  const bars = cont.querySelectorAll('.pw-bar');
  input.addEventListener('input', () => {
    const s = pwStrength(input.value);
    bars.forEach((b, i) => {
      b.className = 'pw-bar';
      if (i < s) b.classList.add(s <= 1 ? 'weak' : s <= 2 ? 'medium' : 'strong');
    });
  });
}

function togglePw(inputId, iconEl) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    iconEl.className = iconEl.className.replace('fa-eye', 'fa-eye-slash');
  } else {
    inp.type = 'password';
    iconEl.className = iconEl.className.replace('fa-eye-slash', 'fa-eye');
  }
}

function setBtnLoading(btn, loading, text = '') {
  if (loading) {
    btn._orig = btn.innerHTML;
    btn.innerHTML = `<span class="spin"></span> ${text || 'Loading...'}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn._orig || text;
    btn.disabled = false;
  }
}

function copyToClipboard(text, label = '') {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => _fallbackCopy(text));
  } else {
    _fallbackCopy(text);
  }
  if (label) toast(`${label} copied!`, 'success');
}
function _fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text; el.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(el); el.focus(); el.select();
  document.execCommand('copy'); el.remove();
}

// ── Copy protection — CONTENT ONLY, not interactive elements ──
// Applied only to text content nodes, NOT to the whole page
function applyNoCopy(el) {
  if (!el) return;
  el.classList.add('no-copy');
  // Extra: block context menu only inside content text (not buttons)
  el.addEventListener('contextmenu', e => {
    // Only block if target is plain text, not a button/link/input
    if (!e.target.closest('button,a,input,select,textarea,.btn,.nav-link,.lesson-item,.card-hover,.user-card')) {
      e.preventDefault();
    }
  });
}

// ── Keyboard shortcuts ────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeConfirm(); closeSidebar();
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ── Logout ────────────────────────────────────────
function logout() {
  sessionStorage.removeItem('nglms_session');
  APP.user = null;
  window.location.href = 'index.html';
}
