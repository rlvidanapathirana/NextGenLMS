/* NextGenLMS — Student v4 FIXED */
'use strict';

let _sCourses = [];
let _sLessons = {}; // cache: courseId -> contents

function sNav(section, el) {
  closeSidebar();
  document.querySelectorAll('#s-sidebar .nav-link').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles = { dashboard:'Dashboard', courses:'My Courses', join:'Join a Course', progress:'My Progress', quizzes:'Quizzes', settings:'Settings' };
  document.getElementById('s-page-title').textContent = titles[section] || section;
  document.getElementById('s-content').innerHTML = '<div class="page-load"><div class="spin spin-lg"></div></div>';
  ({ dashboard:sRenderDashboard, courses:sRenderCourses, join:sRenderJoin, progress:sRenderProgress, quizzes:sRenderQuizzes, settings:sRenderSettings }[section] || sRenderDashboard)();
}

window.addEventListener('DOMContentLoaded', () => {
  const u = APP.user;
  document.getElementById('s-user-name').textContent   = u.name;
  document.getElementById('s-user-role').textContent   = 'Student';
  document.getElementById('s-avatar-text').textContent = initials(u.name);
  sNav('dashboard', document.querySelector('#s-sidebar .nav-link'));
});

// ── Render helpers ───────────────────────────────
function sCourseCard(c) {
  const img = c.Thumbnail_URL
    ? `<div class="course-thumb"><img src="${esc(c.Thumbnail_URL)}" loading="lazy" onerror="this.style.display='none'"/></div>`
    : `<div class="course-thumb" style="background:linear-gradient(135deg,var(--p-glass),rgba(167,139,250,.15))">📚</div>`;
  return `<div class="card course-card card-hover s-course-card" data-id="${esc(str(c.Course_ID))}" data-name="${esc(c.Course_Name)}">
    ${img}
    <div class="course-body">
      <div class="course-title">${esc(c.Course_Name)}</div>
      <p style="font-size:.8rem;color:var(--tx2);margin-top:4px;line-height:1.4">${esc((c.Course_Description||'').slice(0,85))}${(c.Course_Description||'').length>85?'...':''}</p>
      <div style="margin-top:10px"><span class="badge badge-primary">▶ Open</span></div>
    </div>
  </div>`;
}

// ── Dashboard ─────────────────────────────────────
async function sRenderDashboard() {
  const res = await call('getMyCourses', { regNo: APP.user.regNo });
  _sCourses = res.courses || [];
  const ct = document.getElementById('s-content');
  ct.innerHTML = `
  <div class="anim">
    <div style="margin-bottom:22px">
      <h2 style="font-size:1.45rem;font-weight:900;margin-bottom:4px">Hello, ${esc(APP.user.name.split(' ')[0])} 👋</h2>
      <p style="color:var(--tx2);font-size:.87rem">Keep up the great work!</p>
    </div>
    <div class="grid-3" style="margin-bottom:22px">
      <div class="card stat-card"><div class="stat-ico ic-purple"><i class="fa-solid fa-book-open"></i></div><div><div class="stat-num">${_sCourses.length}</div><div class="stat-label">Enrolled Courses</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-green"><i class="fa-solid fa-circle-check"></i></div><div><div class="stat-num" id="s-done">—</div><div class="stat-label">Lessons Done</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-yellow"><i class="fa-solid fa-chart-line"></i></div><div><div class="stat-num" id="s-pct">—</div><div class="stat-label">Progress</div></div></div>
    </div>
    <div class="sec-head">
      <div class="sec-head-info"><h2>My Courses</h2></div>
      <button class="btn btn-primary btn-sm" id="s-join-btn"><i class="fa-solid fa-plus"></i> Join Course</button>
    </div>
    ${_sCourses.length === 0
      ? `<div class="card"><div class="empty"><div class="empty-icon">📚</div><h4>No courses yet</h4><p>Enter a PIN from your lecturer to join.</p><button class="btn btn-primary" style="margin-top:14px" id="s-join-btn2"><i class="fa-solid fa-plus"></i> Join a Course</button></div></div>`
      : `<div class="grid-3" id="s-dash-grid">${_sCourses.slice(0,6).map(sCourseCard).join('')}</div>`}
  </div>`;

  // Bind buttons with addEventListener (no inline onclick)
  document.getElementById('s-join-btn')?.addEventListener('click', () => sNav('join', null));
  document.getElementById('s-join-btn2')?.addEventListener('click', () => sNav('join', null));
  _bindCourseCards(ct);

  // Load progress
  call('getProgress', { regNo: APP.user.regNo }).then(pr => {
    const done = (pr.progress || []).filter(p => p.Status === 'Completed').length;
    const el1 = document.getElementById('s-done'), el2 = document.getElementById('s-pct');
    if (el1) el1.textContent = done;
    if (el2) el2.textContent = done + ' done';
  });
}

function _bindCourseCards(container) {
  container.querySelectorAll('.s-course-card').forEach(card => {
    card.addEventListener('click', () => {
      const id   = card.dataset.id;
      const name = card.dataset.name;
      if (id) sOpenCourse(id, name);
    });
  });
}

// ── My Courses ────────────────────────────────────
async function sRenderCourses() {
  const res = await call('getMyCourses', { regNo: APP.user.regNo });
  _sCourses = res.courses || [];
  const ct = document.getElementById('s-content');
  ct.innerHTML = `
  <div class="anim">
    <div class="sec-head">
      <div class="sec-head-info"><h2>My Courses</h2><p>${_sCourses.length} enrolled</p></div>
      <button class="btn btn-primary btn-sm" id="sc-join"><i class="fa-solid fa-plus"></i> Join New</button>
    </div>
    <div style="margin-bottom:16px;max-width:340px">
      <div class="search-wrap"><i class="fa-solid fa-search"></i>
        <input type="search" placeholder="Search courses..." id="sc-q"/>
      </div>
    </div>
    <div class="grid-3" id="sc-grid">${_sCourses.length === 0
      ? `<div class="card" style="grid-column:1/-1"><div class="empty"><div class="empty-icon">📚</div><h4>No courses yet</h4></div></div>`
      : _sCourses.map(sCourseCard).join('')}</div>
  </div>`;
  document.getElementById('sc-join')?.addEventListener('click', () => sNav('join', null));
  document.getElementById('sc-q')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    const f = q ? _sCourses.filter(c => c.Course_Name.toLowerCase().includes(q)||(c.Course_Description||'').toLowerCase().includes(q)) : _sCourses;
    const grid = document.getElementById('sc-grid');
    if (grid) grid.innerHTML = f.length === 0
      ? `<div class="card" style="grid-column:1/-1"><div class="empty"><div class="empty-icon">🔍</div><h4>No matches for "${esc(q)}"</h4></div></div>`
      : f.map(sCourseCard).join('');
    _bindCourseCards(ct);
  });
  _bindCourseCards(ct);
}

// ── Course Viewer ─────────────────────────────────
async function sOpenCourse(courseId, courseName) {
  const ct = document.getElementById('s-content');
  document.getElementById('s-page-title').textContent = courseName;
  ct.innerHTML = '<div class="page-load"><div class="spin spin-lg"></div></div>';

  const [conRes, annRes, qzRes, prRes] = await Promise.all([
    call('getCourseContent',  { courseId }),
    call('getAnnouncements',  { courseId }),
    call('getQuizzes',        { courseId }),
    call('getProgress',       { regNo: APP.user.regNo }),
  ]);
  const contents = conRes.contents || [];
  const anns     = annRes.announcements || [];
  const quizzes  = qzRes.quizzes || [];
  const progMap  = {};
  (prRes.progress || []).forEach(p => { progMap[str(p.Content_ID)] = p.Status; });

  // Cache for lesson opening
  _sLessons[courseId] = contents;

  const done = contents.filter(c => progMap[str(c.Content_ID)] === 'Completed').length;
  const pct  = contents.length ? Math.round(done / contents.length * 100) : 0;

  ct.innerHTML = `
  <div class="anim">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" id="cv-back"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div style="flex:1;min-width:0">
        <h2 style="font-size:1.1rem;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(courseName)}</h2>
        <p style="font-size:.75rem;color:var(--tx3)">${contents.length} lessons · ${quizzes.length} quizzes</p>
      </div>
    </div>
    <div class="card" style="padding:16px 20px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px">
        <span style="font-size:.82rem;font-weight:700;color:var(--tx2)">Your Progress</span>
        <span style="font-size:.82rem;font-weight:800;color:var(--p)">${done}/${contents.length} · ${pct}%</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="tabs-bar" id="cv-tabs" style="margin-bottom:16px">
      <button class="tab-pill active" data-tab="cv-lessons">Lessons (${contents.length})</button>
      <button class="tab-pill" data-tab="cv-anns">Announcements${anns.length ? ` <span class="nav-badge">${anns.length}</span>` : ''}</button>
      <button class="tab-pill" data-tab="cv-quizzes">Quizzes${quizzes.length ? ` <span class="nav-badge">${quizzes.length}</span>` : ''}</button>
    </div>

    <div id="cv-lessons">
      ${contents.length === 0
        ? `<div class="card"><div class="empty"><div class="empty-icon">🎥</div><h4>No lessons yet</h4></div></div>`
        : `<div style="display:flex;flex-direction:column;gap:10px" id="cv-lesson-list">
            ${contents.map(c => sLessonRow(c, progMap)).join('')}
          </div>`}
    </div>
    <div id="cv-anns" class="hidden">
      ${anns.length === 0
        ? `<div class="card"><div class="empty"><div class="empty-icon">📢</div><h4>No announcements</h4></div></div>`
        : anns.map(a => `<div class="card ann-item" style="margin-bottom:10px">
            <div class="ann-title no-copy">${esc(a.Title)}</div>
            <div class="ann-body no-copy">${esc(a.Message)}</div>
            <div class="ann-foot">${fmtDateTime(a.Posted_Date)}</div>
          </div>`).join('')}
    </div>
    <div id="cv-quizzes" class="hidden">
      ${quizzes.length === 0
        ? `<div class="card"><div class="empty"><div class="empty-icon">📝</div><h4>No quizzes</h4></div></div>`
        : `<div style="display:flex;flex-direction:column;gap:10px" id="cv-quiz-list">
            ${quizzes.map(q => `<div class="card card-inner" style="display:flex;align-items:center;gap:13px;flex-wrap:wrap">
              <div class="lesson-ico lic-quiz"><i class="fa-solid fa-clipboard-list"></i></div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:800">${esc(q.Quiz_Title)}</div>
                ${q.Deadline ? `<div style="font-size:.79rem;color:var(--tx3)">Due: ${fmtDate(q.Deadline)}</div>` : ''}
              </div>
              <a href="${esc(q.Google_Form_Link)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
                <i class="fa-solid fa-external-link"></i> Take Quiz
              </a>
            </div>`).join('')}
          </div>`}
    </div>
  </div>`;

  // Back button
  document.getElementById('cv-back')?.addEventListener('click', () => sNav('courses', null));

  // Tab switching
  document.querySelectorAll('#cv-tabs .tab-pill').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#cv-tabs .tab-pill').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tab = this.dataset.tab;
      ['cv-lessons','cv-anns','cv-quizzes'].forEach(id => {
        document.getElementById(id)?.classList.toggle('hidden', id !== tab);
      });
    });
  });

  // Lesson click — use event delegation
  const lessonList = document.getElementById('cv-lesson-list');
  if (lessonList) {
    lessonList.addEventListener('click', e => {
      const item = e.target.closest('.lesson-item');
      if (!item) return;
      const contentId = item.dataset.id;
      const lesson = contents.find(c => str(c.Content_ID) === contentId);
      if (lesson) sOpenLesson(lesson, courseId, courseName);
    });
  }

  window._sCourseId   = courseId;
  window._sCourseName = courseName;
}

function sLessonRow(c, progMap) {
  const done  = progMap[str(c.Content_ID)] === 'Completed';
  const icons = { Video:'fa-play-circle', PDF:'fa-file-pdf', Quiz:'fa-clipboard-list', Text:'fa-file-lines', Presentation:'fa-file-powerpoint' };
  const cls   = { Video:'lic-video', PDF:'lic-pdf', Quiz:'lic-quiz', Text:'lic-other', Presentation:'lic-other' };
  return `<div class="lesson-item${done?' done':''}" data-id="${esc(str(c.Content_ID))}">
    <div class="lesson-ico ${cls[c.Content_Type]||'lic-other'}">
      <i class="fa-solid ${icons[c.Content_Type]||'fa-file'}"></i>
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.Topic_Title)}</div>
      <div style="font-size:.74rem;color:var(--tx3);margin-top:2px">${esc(c.Content_Type)}</div>
    </div>
    ${done
      ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Done</span>`
      : `<span class="badge badge-gray">Start</span>`}
    <i class="fa-solid fa-chevron-right" style="color:var(--tx3);font-size:.78rem;flex-shrink:0"></i>
  </div>`;
}

function sOpenLesson(c, courseId, courseName) {
  const url  = c._url  || '';
  const mode = c._mode || 'preview';
  const desc = c._desc || '';

  const descBlock = desc
    ? `<div class="no-copy" style="background:var(--surface2);border:1px solid var(--b1);border-radius:var(--r-sm);padding:14px 16px;font-size:.875rem;color:var(--tx2);line-height:1.65;margin-bottom:16px">${esc(desc)}</div>`
    : '';

  const canPreview  = mode !== 'download';
  const canDownload = mode === 'download' || mode === 'preview-download';

  let body = '';

  if (!url) {
    body = `${descBlock}<div class="empty"><div class="empty-icon">🔗</div><p>No link provided.</p></div>`;
  } else if (mode === 'download') {
    body = `${descBlock}
      <div style="text-align:center;padding:28px">
        <div style="width:72px;height:72px;border-radius:20px;background:var(--p-glass);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 16px">⬇</div>
        <p style="color:var(--tx2);margin-bottom:20px;font-size:.88rem">This resource is available for download only.</p>
        <a href="${esc(url)}" target="_blank" rel="noopener" class="btn btn-primary btn-lg">
          <i class="fa-solid fa-download"></i> Download
        </a>
      </div>`;
  } else {
    const embed = detectEmbed(url, c.Content_Type);
    if (embed) {
      const isVideo = !!(ytEmbed(url));
      const frameH  = isVideo ? '340px' : '460px';
      body = `${descBlock}
        <div style="border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--b1);background:#000;margin-bottom:${canDownload?'14px':'0'}">
          <iframe src="${esc(embed)}"
            style="width:100%;height:${frameH};border:none;display:block"
            allowfullscreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-top-navigation-by-user-activation">
          </iframe>
        </div>
        ${canDownload ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><i class="fa-solid fa-download"></i> Download</a>` : ''}`;
    } else {
      body = `${descBlock}
        <div style="text-align:center;padding:28px">
          <div style="width:72px;height:72px;border-radius:20px;background:var(--p-glass);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 16px">🔗</div>
          <p style="color:var(--tx2);margin-bottom:20px;font-size:.88rem">Click below to open this resource.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <a href="${esc(url)}" target="_blank" rel="noopener" class="btn btn-primary">
              <i class="fa-solid fa-external-link"></i> Open Resource
            </a>
            ${canDownload ? `<a href="${esc(url)}" target="_blank" rel="noopener" download class="btn btn-ghost"><i class="fa-solid fa-download"></i> Download</a>` : ''}
          </div>
        </div>`;
    }
  }

  const contentId = str(c.Content_ID);
  buildModal('lesson-modal', esc(c.Topic_Title), body,
    `<button class="btn btn-ghost" id="lm-close">Close</button>
     <button class="btn btn-success" id="lm-done"><i class="fa-solid fa-check"></i> Mark Complete</button>`,
    true);

  // Bind buttons via addEventListener
  document.getElementById('lm-close')?.addEventListener('click', () => closeModal('lesson-modal'));
  document.getElementById('lm-done')?.addEventListener('click', () => sMarkDone(contentId, courseId, courseName));
}

async function sMarkDone(contentId, courseId, courseName) {
  await call('markProgress', { regNo: APP.user.regNo, contentId, status: 'Completed' });
  toast('Marked as complete! 🎉', 'success');
  closeModal('lesson-modal');
  sOpenCourse(courseId, courseName);
}

// ── Join Course ───────────────────────────────────
function sRenderJoin() {
  const ct = document.getElementById('s-content');
  ct.innerHTML = `
  <div class="anim" style="max-width:440px;margin:0 auto">
    <div class="card" style="padding:36px">
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:70px;height:70px;border-radius:18px;background:var(--p-glass);display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 14px;border:1px solid var(--b1)">🔑</div>
        <h2 style="font-size:1.25rem;font-weight:900">Join a Course</h2>
        <p style="font-size:.85rem;color:var(--tx2);margin-top:5px">Enter the Course PIN from your lecturer</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="field"><label>Course PIN</label>
          <input class="input" id="join-pin" maxlength="10" autocomplete="off"
            style="text-align:center;letter-spacing:6px;font-size:1.3rem;font-weight:800;font-family:var(--ff-mono);text-transform:uppercase"
            placeholder="ABC123"/>
        </div>
        <button class="btn btn-primary btn-full btn-lg" id="join-btn">
          <i class="fa-solid fa-right-to-bracket"></i> Join Course
        </button>
      </div>
    </div>
  </div>`;
  const pinInput = document.getElementById('join-pin');
  if (pinInput) pinInput.addEventListener('input', e => e.target.value = e.target.value.toUpperCase());
  document.getElementById('join-btn')?.addEventListener('click', sJoinCourse);
}

async function sJoinCourse() {
  const pinEl = document.getElementById('join-pin');
  const pin   = (pinEl?.value || '').trim().toUpperCase();
  if (!pin) { toast('Enter a course PIN.', 'warning'); return; }
  const btn = document.getElementById('join-btn');
  setBtnLoading(btn, true, 'Joining...');
  const res = await call('joinCourse', { regNo: APP.user.regNo, pin });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast(`Joined "${res.course.Course_Name}"!`, 'success');
  sNav('courses', null);
}

// ── Progress ──────────────────────────────────────
async function sRenderProgress() {
  const [cRes, prRes] = await Promise.all([
    call('getMyCourses', { regNo: APP.user.regNo }),
    call('getProgress',  { regNo: APP.user.regNo })
  ]);
  const courses = cRes.courses || [];
  const progMap = {};
  (prRes.progress || []).forEach(p => { progMap[str(p.Content_ID)] = p.Status; });

  let html = '';
  for (const c of courses) {
    const cr   = await call('getCourseContent', { courseId: c.Course_ID });
    const cont = cr.contents || [];
    const done = cont.filter(l => progMap[str(l.Content_ID)] === 'Completed').length;
    const pct  = cont.length ? Math.round(done / cont.length * 100) : 0;
    html += `<div class="card" style="padding:20px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.Course_Name)}</div>
          <div style="font-size:.79rem;color:var(--tx3)">${cont.length} lessons</div>
        </div>
        <span class="badge ${pct===100?'badge-success':'badge-primary'}">${done}/${cont.length} · ${pct}%</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>`;
  }
  document.getElementById('s-content').innerHTML = `
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>My Progress</h2></div></div>
    ${courses.length === 0
      ? `<div class="card"><div class="empty"><div class="empty-icon">📈</div><h4>No courses yet</h4></div></div>`
      : html}
  </div>`;
}

// ── Quizzes ───────────────────────────────────────
async function sRenderQuizzes() {
  const cr = await call('getMyCourses', { regNo: APP.user.regNo });
  let all = [];
  for (const c of cr.courses || []) {
    const r = await call('getQuizzes', { courseId: c.Course_ID });
    (r.quizzes || []).forEach(q => all.push({ ...q, _cn: c.Course_Name }));
  }
  document.getElementById('s-content').innerHTML = `
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>Quizzes</h2><p>${all.length} available</p></div></div>
    ${all.length === 0
      ? `<div class="card"><div class="empty"><div class="empty-icon">📝</div><h4>No quizzes yet</h4></div></div>`
      : `<div style="display:flex;flex-direction:column;gap:10px">
          ${all.map(q => `<div class="card card-inner" style="display:flex;align-items:center;gap:13px;flex-wrap:wrap">
            <div class="lesson-ico lic-quiz"><i class="fa-solid fa-clipboard-list"></i></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(q.Quiz_Title)}</div>
              <div style="font-size:.77rem;color:var(--tx3)">${esc(q._cn)}${q.Deadline?` · Due: ${fmtDate(q.Deadline)}`:''}</div>
            </div>
            <a href="${esc(q.Google_Form_Link)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-external-link"></i> Open
            </a>
          </div>`).join('')}
        </div>`}
  </div>`;
}

// ── Settings ──────────────────────────────────────
function sRenderSettings() {
  const u = APP.user;
  document.getElementById('s-content').innerHTML = `
  <div class="anim" style="max-width:540px">
    <div class="sec-head"><div class="sec-head-info"><h2>Account Settings</h2></div></div>
    <div class="card" style="padding:26px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:15px;margin-bottom:20px">
        <div class="avatar av-72 av-p">${initials(u.name)}</div>
        <div>
          <div style="font-size:1rem;font-weight:900">${esc(u.name)}</div>
          <div style="color:var(--tx3);font-size:.82rem;font-family:var(--ff-mono)">NIC: ${esc(u.regNo)}</div>
          <span class="badge badge-success" style="margin-top:7px"><i class="fa-solid fa-circle" style="font-size:.4rem"></i> Active</span>
        </div>
      </div>
      <div class="divider" style="margin-bottom:18px"></div>
      <h3 style="font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.07em;color:var(--tx2);margin-bottom:14px">Change PIN</h3>
      <div style="display:flex;flex-direction:column;gap:13px">
        <div class="field"><label>Current PIN</label>
          <div class="input-wrap"><i class="iico fa-solid fa-lock"></i>
            <input class="input" type="password" id="old-pin" placeholder="Current PIN" autocomplete="current-password"/>
            <i class="fa-solid fa-eye input-suffix" id="old-pin-toggle"></i>
          </div>
        </div>
        <div class="field"><label>New PIN</label>
          <div class="input-wrap"><i class="iico fa-solid fa-key"></i>
            <input class="input" type="password" id="new-pin" placeholder="New PIN (min 4)" autocomplete="new-password"/>
            <i class="fa-solid fa-eye input-suffix" id="new-pin-toggle"></i>
          </div>
          <div class="pw-strength" id="s-pw-str">
            <div class="pw-bar"></div><div class="pw-bar"></div>
            <div class="pw-bar"></div><div class="pw-bar"></div>
          </div>
        </div>
        <div class="field"><label>Confirm PIN</label>
          <div class="input-wrap"><i class="iico fa-solid fa-key"></i>
            <input class="input" type="password" id="new-pin2" placeholder="Repeat" autocomplete="new-password"/>
          </div>
        </div>
        <button class="btn btn-primary" style="align-self:flex-start" id="chpin-btn">
          <i class="fa-solid fa-save"></i> Update PIN
        </button>
      </div>
    </div>
    <div class="card" style="padding:18px;display:flex;align-items:center;justify-content:space-between;gap:14px">
      <div><div style="font-weight:700">Theme</div><div style="font-size:.81rem;color:var(--tx2)">Dark / Light mode</div></div>
      <button class="btn btn-ghost" id="theme-toggle-s">
        <i class="fa-solid fa-moon" data-theme-icon></i> Toggle
      </button>
    </div>
  </div>`;

  // Bind events
  document.getElementById('old-pin-toggle')?.addEventListener('click', function() { togglePw('old-pin', this); });
  document.getElementById('new-pin-toggle')?.addEventListener('click', function() { togglePw('new-pin', this); });
  document.getElementById('chpin-btn')?.addEventListener('click', sChangePin);
  document.getElementById('theme-toggle-s')?.addEventListener('click', toggleTheme);
  renderPwStrength('new-pin', 's-pw-str');

  // Sync theme icon
  _syncTheme(document.documentElement.getAttribute('data-theme') || 'light');
}

async function sChangePin() {
  const op = (document.getElementById('old-pin')?.value || '').trim();
  const np = (document.getElementById('new-pin')?.value || '').trim();
  const cn = (document.getElementById('new-pin2')?.value|| '').trim();
  if (!op || !np) { toast('Fill all fields.', 'warning'); return; }
  if (np !== cn)  { toast('PINs do not match.', 'error'); return; }
  if (np.length < 4) { toast('PIN must be ≥ 4 characters.', 'warning'); return; }
  const btn = document.getElementById('chpin-btn');
  setBtnLoading(btn, true, 'Updating...');
  const res = await call('changeStudentPin', { regNo: APP.user.regNo, oldPin: op, newPin: np });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast('PIN updated!', 'success');
  ['old-pin','new-pin','new-pin2'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
}
