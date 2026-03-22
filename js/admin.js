/* NextGenLMS — Admin/Lecturer v4 FIXED */
'use strict';

let _aCourses = [];

function aNav(section, el) {
  closeSidebar();
  document.querySelectorAll('#a-sidebar .nav-link').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles = { dashboard:'Dashboard', courses:'My Courses', students:'Students', settings:'Settings' };
  document.getElementById('a-page-title').textContent = titles[section] || section;
  document.getElementById('a-content').innerHTML = '<div class="page-load"><div class="spin spin-lg"></div></div>';
  ({ dashboard:aRenderDashboard, courses:aRenderCourses, students:aRenderStudents, settings:aRenderSettings }[section] || aRenderDashboard)();
}

window.addEventListener('DOMContentLoaded', () => {
  const u = APP.user;
  document.getElementById('a-user-name').textContent   = u.name;
  document.getElementById('a-user-role').textContent   = u.role;
  document.getElementById('a-avatar-text').textContent = initials(u.name);
  document.getElementById('a-sidebar-tag').textContent = u.role === 'Super_Admin' ? 'Super Admin' : 'Lecturer Portal';
  if (u.role === 'Super_Admin') {
    const w = document.getElementById('sa-link-wrap');
    if (w) w.innerHTML = `<div class="nav-section">Super Admin</div><a class="nav-link" id="sa-portal-link"><i class="fa-solid fa-crown"></i> Super Admin Panel</a>`;
    document.getElementById('sa-portal-link')?.addEventListener('click', () => { window.location.href = 'superadmin.html'; });
  }
  aNav('dashboard', document.querySelector('#a-sidebar .nav-link'));
});

// ── Dashboard ─────────────────────────────────────
async function aRenderDashboard() {
  const res = await call('getAdminCourses', { adminId: APP.user.id, role: APP.user.role });
  _aCourses = res.courses || [];
  const ct = document.getElementById('a-content');
  ct.innerHTML = `
  <div class="anim">
    <div style="margin-bottom:22px">
      <h2 style="font-size:1.45rem;font-weight:900;margin-bottom:4px">Hello, ${esc(APP.user.name.split(' ')[0])} 👋</h2>
      <p style="color:var(--tx2);font-size:.87rem">${esc(APP.user.role)} · NextGenLMS</p>
    </div>
    <div class="grid-3" style="margin-bottom:22px">
      <div class="card stat-card"><div class="stat-ico ic-purple"><i class="fa-solid fa-book-open"></i></div><div><div class="stat-num">${_aCourses.length}</div><div class="stat-label">My Courses</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-green"><i class="fa-solid fa-users"></i></div><div><div class="stat-num" id="a-sc">—</div><div class="stat-label">Total Students</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-teal"><i class="fa-solid fa-layer-group"></i></div><div><div class="stat-num" id="a-lc">—</div><div class="stat-label">Total Lessons</div></div></div>
    </div>
    <div class="sec-head">
      <div class="sec-head-info"><h2>My Courses</h2></div>
      <button class="btn btn-primary btn-sm" id="a-new-course"><i class="fa-solid fa-plus"></i> New Course</button>
    </div>
    ${_aCourses.length === 0
      ? `<div class="card"><div class="empty"><div class="empty-icon">📚</div><h4>No courses yet</h4><button class="btn btn-primary" style="margin-top:14px" id="a-new-course2"><i class="fa-solid fa-plus"></i> Create First</button></div></div>`
      : `<div class="grid-3" id="a-dash-grid">${_aCourses.slice(0,6).map(aCourseCard).join('')}</div>`}
  </div>`;

  document.getElementById('a-new-course')?.addEventListener('click', aOpenCreateCourse);
  document.getElementById('a-new-course2')?.addEventListener('click', aOpenCreateCourse);
  _bindAdminCourseCards(ct);

  let sc = 0, lc = 0;
  for (const c of _aCourses.slice(0,5)) {
    const [sr,cr] = await Promise.all([call('getCourseStudents',{courseId:c.Course_ID}),call('getCourseContent',{courseId:c.Course_ID})]);
    sc += (sr.students||[]).length; lc += (cr.contents||[]).length;
  }
  const sel = document.getElementById('a-sc'), lel = document.getElementById('a-lc');
  if (sel) sel.textContent = sc; if (lel) lel.textContent = lc;
}

function aCourseCard(c) {
  const img = c.Thumbnail_URL
    ? `<div class="course-thumb a-course-thumb" data-id="${esc(str(c.Course_ID))}" data-name="${esc(c.Course_Name)}"><img src="${esc(c.Thumbnail_URL)}" loading="lazy" onerror="this.style.display='none'"/></div>`
    : `<div class="course-thumb a-course-thumb" data-id="${esc(str(c.Course_ID))}" data-name="${esc(c.Course_Name)}" style="background:linear-gradient(135deg,var(--p-glass),rgba(167,139,250,.15))">📚</div>`;
  return `<div class="card course-card">
    ${img}
    <div class="course-body">
      <div class="course-title a-course-title" data-id="${esc(str(c.Course_ID))}" data-name="${esc(c.Course_Name)}" style="cursor:pointer">${esc(c.Course_Name)}</div>
      <p style="font-size:.79rem;color:var(--tx2);margin-top:4px;line-height:1.4">${esc((c.Course_Description||'').slice(0,80))}${(c.Course_Description||'').length>80?'...':''}</p>
      <div style="margin-top:11px;display:flex;align-items:center;gap:7px;flex-wrap:wrap">
        <span class="course-pin">${esc(c.Course_PIN)}</span>
        <button class="btn btn-ghost btn-sm a-copy-pin" data-pin="${esc(c.Course_PIN)}" data-name="${esc(c.Course_Name)}" style="padding:3px 9px;font-size:.72rem">
          <i class="fa-regular fa-copy"></i> Copy
        </button>
      </div>
    </div>
  </div>`;
}

function _bindAdminCourseCards(container) {
  container.querySelectorAll('.a-course-thumb, .a-course-title').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id, name = el.dataset.name;
      if (id) aOpenCourseDetail(id, name);
    });
  });
  container.querySelectorAll('.a-copy-pin').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      copyToClipboard(btn.dataset.pin, `PIN for "${btn.dataset.name}"`);
    });
  });
}

// ── Courses Page ──────────────────────────────────
async function aRenderCourses() {
  const res = await call('getAdminCourses', { adminId: APP.user.id, role: APP.user.role });
  _aCourses = res.courses || [];
  const ct = document.getElementById('a-content');
  ct.innerHTML = `
  <div class="anim">
    <div class="sec-head">
      <div class="sec-head-info"><h2>My Courses</h2><p>${_aCourses.length} courses</p></div>
      <button class="btn btn-primary btn-sm" id="ac-new"><i class="fa-solid fa-plus"></i> New Course</button>
    </div>
    <div style="margin-bottom:15px;max-width:320px">
      <div class="search-wrap"><i class="fa-solid fa-search"></i>
        <input type="search" placeholder="Search courses..." id="ac-q"/>
      </div>
    </div>
    <div class="grid-3" id="ac-grid">
      ${_aCourses.length === 0
        ? `<div class="card" style="grid-column:1/-1"><div class="empty"><div class="empty-icon">📚</div><h4>No courses</h4></div></div>`
        : _aCourses.map(aCourseCard).join('')}
    </div>
  </div>`;

  document.getElementById('ac-new')?.addEventListener('click', aOpenCreateCourse);
  document.getElementById('ac-q')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    const f = q ? _aCourses.filter(c => c.Course_Name.toLowerCase().includes(q)||(c.Course_Description||'').toLowerCase().includes(q)) : _aCourses;
    const grid = document.getElementById('ac-grid');
    if (grid) {
      grid.innerHTML = f.length === 0
        ? `<div class="card" style="grid-column:1/-1"><div class="empty"><div class="empty-icon">🔍</div><h4>No matches</h4></div></div>`
        : f.map(aCourseCard).join('');
      _bindAdminCourseCards(grid);
    }
  });
  _bindAdminCourseCards(ct);
}

// ── Course Detail ─────────────────────────────────
async function aOpenCourseDetail(courseId, courseName) {
  const ct = document.getElementById('a-content');
  document.getElementById('a-page-title').textContent = courseName;
  ct.innerHTML = '<div class="page-load"><div class="spin spin-lg"></div></div>';

  const [conRes,studRes,annRes,qzRes] = await Promise.all([
    call('getCourseContent',{courseId}), call('getCourseStudents',{courseId}),
    call('getAnnouncements',{courseId}), call('getQuizzes',{courseId}),
  ]);
  const contents = conRes.contents||[], students = studRes.students||[];
  const anns = annRes.announcements||[], quizzes = qzRes.quizzes||[];
  window._aCId = courseId; window._aCName = courseName;

  ct.innerHTML = `
  <div class="anim">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" id="acd-back"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div style="flex:1;min-width:0">
        <h2 style="font-size:1.1rem;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(courseName)}</h2>
        <p style="font-size:.74rem;color:var(--tx3)">${contents.length} lessons · ${students.length} students</p>
      </div>
      <button class="btn btn-ghost btn-sm" id="acd-edit"><i class="fa-solid fa-pen"></i> Edit</button>
      <button class="btn btn-danger btn-sm" id="acd-del"><i class="fa-solid fa-trash"></i></button>
    </div>
    <div class="tabs-bar" id="acd-tabs" style="margin-bottom:16px">
      <button class="tab-pill active" data-tab="acd-c">Content (${contents.length})</button>
      <button class="tab-pill" data-tab="acd-s">Students (${students.length})</button>
      <button class="tab-pill" data-tab="acd-a">Announcements (${anns.length})</button>
      <button class="tab-pill" data-tab="acd-q">Quizzes (${quizzes.length})</button>
    </div>

    <div id="acd-c">
      <div style="display:flex;justify-content:flex-end;margin-bottom:11px">
        <button class="btn btn-primary btn-sm" id="acd-add-lesson"><i class="fa-solid fa-plus"></i> Add Lesson</button>
      </div>
      ${contents.length === 0
        ? `<div class="card"><div class="empty"><div class="empty-icon">🎥</div><h4>No lessons yet</h4></div></div>`
        : `<div style="display:flex;flex-direction:column;gap:9px" id="acd-lesson-list">${contents.map(c => aLessonRow(c)).join('')}</div>`}
    </div>

    <div id="acd-s" class="hidden">
      <div style="margin-bottom:11px;max-width:280px">
        <div class="search-wrap"><i class="fa-solid fa-search"></i>
          <input type="search" placeholder="Search students..." id="astu-q"/>
        </div>
      </div>
      <div class="tbl-wrap" id="astu-tbl">${aStudTbl(students)}</div>
    </div>

    <div id="acd-a" class="hidden">
      <div style="display:flex;justify-content:flex-end;margin-bottom:11px">
        <button class="btn btn-primary btn-sm" id="acd-add-ann"><i class="fa-solid fa-plus"></i> Post</button>
      </div>
      ${anns.length === 0
        ? `<div class="card"><div class="empty"><div class="empty-icon">📢</div><h4>No announcements</h4></div></div>`
        : `<div style="display:flex;flex-direction:column;gap:9px" id="ann-list">
            ${anns.map(a => `<div class="card ann-item" data-ann-id="${esc(a.Announcement_ID)}">
              <div style="display:flex;gap:9px">
                <div style="flex:1">
                  <div class="ann-title no-copy">${esc(a.Title)}</div>
                  <div class="ann-body no-copy">${esc(a.Message)}</div>
                  <div class="ann-foot">${fmtDateTime(a.Posted_Date)}</div>
                </div>
                <button class="btn btn-danger btn-sm btn-icon del-ann" data-id="${esc(a.Announcement_ID)}"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>`).join('')}
          </div>`}
    </div>

    <div id="acd-q" class="hidden">
      <div style="display:flex;justify-content:flex-end;margin-bottom:11px">
        <button class="btn btn-primary btn-sm" id="acd-add-quiz"><i class="fa-solid fa-plus"></i> Add Quiz</button>
      </div>
      ${quizzes.length === 0
        ? `<div class="card"><div class="empty"><div class="empty-icon">📝</div><h4>No quizzes</h4></div></div>`
        : `<div style="display:flex;flex-direction:column;gap:9px" id="quiz-list">
            ${quizzes.map(q => `<div class="card card-inner" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <div class="lesson-ico lic-quiz"><i class="fa-solid fa-clipboard-list"></i></div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(q.Quiz_Title)}</div>
                ${q.Deadline?`<div style="font-size:.79rem;color:var(--tx3)">Due: ${fmtDate(q.Deadline)}</div>`:''}
              </div>
              <a href="${esc(q.Google_Form_Link)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><i class="fa-solid fa-external-link"></i></a>
              <button class="btn btn-danger btn-sm btn-icon del-quiz" data-id="${esc(q.Quiz_ID)}"><i class="fa-solid fa-trash"></i></button>
            </div>`).join('')}
          </div>`}
    </div>
  </div>`;

  // Button bindings
  document.getElementById('acd-back')?.addEventListener('click', () => aNav('courses', null));
  document.getElementById('acd-edit')?.addEventListener('click', () => aOpenEditCourse(courseId, courseName));
  document.getElementById('acd-del')?.addEventListener('click', () => aConfirmDeleteCourse(courseId));
  document.getElementById('acd-add-lesson')?.addEventListener('click', () => aOpenAddLesson(courseId));
  document.getElementById('acd-add-ann')?.addEventListener('click', () => aOpenAddAnn(courseId, courseName));
  document.getElementById('acd-add-quiz')?.addEventListener('click', () => aOpenAddQuiz(courseId, courseName));

  // Tab switching
  document.querySelectorAll('#acd-tabs .tab-pill').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#acd-tabs .tab-pill').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tab = this.dataset.tab;
      ['acd-c','acd-s','acd-a','acd-q'].forEach(id => document.getElementById(id)?.classList.toggle('hidden', id !== tab));
    });
  });

  // Student search
  document.getElementById('astu-q')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#astu-tbl tbody tr').forEach(row => {
      row.style.display = q && !row.textContent.toLowerCase().includes(q) ? 'none' : '';
    });
  });

  // Delete lesson (event delegation)
  document.getElementById('acd-lesson-list')?.addEventListener('click', e => {
    const delBtn = e.target.closest('.del-lesson');
    const editBtn = e.target.closest('.edit-lesson');
    if (delBtn) {
      const id = delBtn.dataset.id, title = delBtn.dataset.title;
      aConfirmDelContent(id, title, courseId, courseName);
    }
    if (editBtn) {
      const id = editBtn.dataset.id;
      aOpenEditLesson(id, courseId, courseName);
    }
  });

  // Delete announcement
  document.getElementById('ann-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.del-ann');
    if (btn) aConfirmDelAnn(btn.dataset.id, courseId, courseName);
  });

  // Delete quiz
  document.getElementById('quiz-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.del-quiz');
    if (btn) aConfirmDelQuiz(btn.dataset.id, courseId, courseName);
  });

  // Remove student
  document.getElementById('astu-tbl')?.addEventListener('click', e => {
    const btn = e.target.closest('.remove-stud');
    if (btn) aConfirmRemoveStudent(btn.dataset.eid, btn.dataset.name, courseId, courseName);
  });
}

function aStudTbl(students) {
  const rows = students.length === 0
    ? `<tr><td colspan="5"><div class="empty" style="padding:28px"><div class="empty-icon">👥</div><p>No students enrolled.</p></div></td></tr>`
    : students.map((s,i) => `<tr>
        <td>${i+1}</td>
        <td><div style="display:flex;align-items:center;gap:9px">
          <div class="avatar av-32 av-p">${initials(s.User_Name)}</div>
          <span style="font-weight:700">${esc(s.User_Name)}</span>
        </div></td>
        <td><code style="background:var(--surface2);padding:2px 7px;border-radius:5px;font-size:.76rem;font-family:var(--ff-mono)">${esc(String(s.Reg_No))}</code></td>
        <td style="color:var(--tx2)">${esc(s.Email||'—')}</td>
        <td><button class="btn btn-danger btn-sm remove-stud" data-eid="${esc(s.enrollmentId)}" data-name="${esc(s.User_Name)}">
          <i class="fa-solid fa-user-minus"></i> Remove
        </button></td>
      </tr>`).join('');
  return `<table><thead><tr><th>#</th><th>Student</th><th>NIC/Reg</th><th>Email</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function aLessonRow(c) {
  const icons = { Video:'fa-play-circle', PDF:'fa-file-pdf', Quiz:'fa-clipboard-list', Text:'fa-file-lines', Presentation:'fa-file-powerpoint' };
  const cls   = { Video:'lic-video', PDF:'lic-pdf', Quiz:'lic-quiz', Text:'lic-other', Presentation:'lic-other' };
  const mLabel = { preview:'👁 Preview', download:'⬇ Download', 'preview-download':'👁⬇ Both' };
  return `<div class="lesson-item" style="cursor:default">
    <div class="lesson-ico ${cls[c.Content_Type]||'lic-other'}"><i class="fa-solid ${icons[c.Content_Type]||'fa-file'}"></i></div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.Topic_Title)}</div>
      <div style="font-size:.74rem;color:var(--tx3);display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:2px">
        <span>${esc(c.Content_Type)}</span>
        ${c._mode ? `<span class="badge badge-gray" style="font-size:.66rem">${mLabel[c._mode]||c._mode}</span>` : ''}
        ${c._url ? `<a href="${esc(c._url)}" target="_blank" rel="noopener" style="color:var(--p)" onclick="event.stopPropagation()">Link</a>` : ''}
      </div>
    </div>
    <button class="btn btn-ghost btn-sm btn-icon edit-lesson" data-id="${esc(str(c.Content_ID))}"><i class="fa-solid fa-pen"></i></button>
    <button class="btn btn-danger btn-sm btn-icon del-lesson" data-id="${esc(str(c.Content_ID))}" data-title="${esc(c.Topic_Title)}"><i class="fa-solid fa-trash"></i></button>
  </div>`;
}

// ── Add Lesson Modal ──────────────────────────────
function aOpenAddLesson(courseId) {
  buildModal('m-lesson', 'Add Lesson', `
    <div class="field"><label>Title *</label>
      <input class="input" id="ls-title" placeholder="e.g. Introduction to Python"/>
    </div>
    <div class="field"><label>Description</label>
      <textarea class="textarea" id="ls-desc" style="min-height:65px" placeholder="What will students learn?"></textarea>
    </div>
    <div class="form-grid-2">
      <div class="field"><label>Content Type *</label>
        <select class="select" id="ls-type">
          <option value="Video">🎬 Video</option>
          <option value="PDF">📄 PDF Document</option>
          <option value="Presentation">📊 Presentation</option>
          <option value="Text">📝 Text / Article</option>
          <option value="Quiz">📋 Quiz / Form</option>
          <option value="Other">📎 Other</option>
        </select>
      </div>
      <div class="field"><label>Access Mode</label>
        <select class="select" id="ls-mode">
          <option value="preview">👁 Preview Only</option>
          <option value="preview-download">👁⬇ Preview &amp; Download</option>
          <option value="download">⬇ Download Only</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>URL / Link *</label>
      <div class="input-wrap"><i class="iico fa-solid fa-link"></i>
        <input class="input" id="ls-url" placeholder="YouTube, Google Drive, Slides, Forms..."/>
      </div>
      <div id="ls-hint" class="hint" style="margin-top:5px"></div>
    </div>
    <div id="ls-prev-area" style="display:none">
      <div style="font-size:.75rem;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:7px">Live Preview</div>
      <div id="ls-prev-frame" style="border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--b1)"></div>
    </div>
  `,`
    <button class="btn btn-ghost" id="ls-cancel">Cancel</button>
    <button class="btn btn-ghost btn-sm" id="ls-preview-btn"><i class="fa-solid fa-eye"></i> Preview</button>
    <button class="btn btn-primary" id="ls-add-btn"><i class="fa-solid fa-plus"></i> Add Lesson</button>
  `, true);

  document.getElementById('ls-cancel')?.addEventListener('click', () => closeModal('m-lesson'));
  document.getElementById('ls-url')?.addEventListener('input', aUpdateLessonHint);
  document.getElementById('ls-type')?.addEventListener('change', aUpdateLessonHint);
  document.getElementById('ls-preview-btn')?.addEventListener('click', aShowLessonPreview);
  document.getElementById('ls-add-btn')?.addEventListener('click', () => aAddLesson(courseId));
}

function aUpdateLessonHint() {
  const url  = (document.getElementById('ls-url')?.value || '').trim();
  const hint = document.getElementById('ls-hint');
  if (!hint) return;
  if (!url) { hint.textContent = ''; return; }
  if (ytEmbed(url))                         hint.innerHTML = `<span style="color:var(--success)">✅ YouTube — will embed player</span>`;
  else if (url.includes('presentation'))    hint.innerHTML = `<span style="color:var(--success)">✅ Google Slides — will embed</span>`;
  else if (url.includes('docs.google.com/forms')||url.includes('forms.gle')) hint.innerHTML = `<span style="color:var(--success)">✅ Google Form — will embed</span>`;
  else if (url.includes('drive.google.com')) hint.innerHTML = `<span style="color:var(--success)">✅ Google Drive — will embed</span>`;
  else if (url.includes('docs.google.com')) hint.innerHTML = `<span style="color:var(--success)">✅ Google Doc — will embed</span>`;
  else if (url.startsWith('http'))          hint.innerHTML = `<span style="color:var(--info)">ℹ️ External link — will open as button</span>`;
  else hint.textContent = '';
}

function aShowLessonPreview() {
  const url  = (document.getElementById('ls-url')?.value || '').trim();
  const type = document.getElementById('ls-type')?.value || '';
  if (!url) { toast('Enter a URL first', 'warning'); return; }
  const embed = detectEmbed(url, type);
  if (!embed) { toast('This URL cannot be previewed — will show as a link button', 'info', 5000); return; }
  const area  = document.getElementById('ls-prev-area');
  const frame = document.getElementById('ls-prev-frame');
  if (!area || !frame) return;
  area.style.display = 'block';
  const h = ytEmbed(url) ? '240px' : '360px';
  frame.innerHTML = `<iframe src="${esc(embed)}" style="width:100%;height:${h};border:none;display:block" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"></iframe>`;
}

async function aAddLesson(courseId) {
  const title = (document.getElementById('ls-title')?.value || '').trim();
  const url   = (document.getElementById('ls-url')?.value   || '').trim();
  if (!title || !url) { toast('Title and URL are required', 'warning'); return; }
  const btn = document.getElementById('ls-add-btn');
  setBtnLoading(btn, true, 'Adding...');
  const res = await call('addContent', {
    adminId: APP.user.id, role: APP.user.role, courseId,
    title, type: document.getElementById('ls-type')?.value || 'Other',
    url, desc: document.getElementById('ls-desc')?.value.trim() || '',
    mode: document.getElementById('ls-mode')?.value || 'preview'
  });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast('Lesson added!', 'success');
  closeModal('m-lesson');
  aOpenCourseDetail(courseId, window._aCName || '');
}

// ── Edit Lesson Modal ─────────────────────────────
async function aOpenEditLesson(contentId, courseId, courseName) {
  const res  = await call('getCourseContent', { courseId });
  const item = (res.contents||[]).find(x => str(x.Content_ID) === str(contentId));
  if (!item) { toast('Lesson not found', 'error'); return; }

  buildModal('m-edit-lesson', 'Edit Lesson', `
    <div class="field"><label>Title *</label>
      <input class="input" id="els-title" value="${esc(item.Topic_Title)}"/>
    </div>
    <div class="field"><label>Description</label>
      <textarea class="textarea" id="els-desc" style="min-height:65px">${esc(item._desc||'')}</textarea>
    </div>
    <div class="form-grid-2">
      <div class="field"><label>Type</label>
        <select class="select" id="els-type">
          <option value="Video" ${item.Content_Type==='Video'?'selected':''}>🎬 Video</option>
          <option value="PDF" ${item.Content_Type==='PDF'?'selected':''}>📄 PDF</option>
          <option value="Presentation" ${item.Content_Type==='Presentation'?'selected':''}>📊 Presentation</option>
          <option value="Text" ${item.Content_Type==='Text'?'selected':''}>📝 Text</option>
          <option value="Quiz" ${item.Content_Type==='Quiz'?'selected':''}>📋 Quiz</option>
          <option value="Other" ${item.Content_Type==='Other'?'selected':''}>📎 Other</option>
        </select>
      </div>
      <div class="field"><label>Access Mode</label>
        <select class="select" id="els-mode">
          <option value="preview" ${(item._mode||'preview')==='preview'?'selected':''}>👁 Preview Only</option>
          <option value="preview-download" ${item._mode==='preview-download'?'selected':''}>👁⬇ Preview &amp; Download</option>
          <option value="download" ${item._mode==='download'?'selected':''}>⬇ Download Only</option>
        </select>
      </div>
    </div>
    <div class="field"><label>URL *</label>
      <div class="input-wrap"><i class="iico fa-solid fa-link"></i>
        <input class="input" id="els-url" value="${esc(item._url||'')}"/>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" id="els-cancel">Cancel</button>
    <button class="btn btn-primary" id="els-save"><i class="fa-solid fa-save"></i> Save</button>
  `, true);

  document.getElementById('els-cancel')?.addEventListener('click', () => closeModal('m-edit-lesson'));
  document.getElementById('els-save')?.addEventListener('click', () => aUpdateLesson(contentId, courseId));
}

async function aUpdateLesson(contentId, courseId) {
  const title = (document.getElementById('els-title')?.value || '').trim();
  const url   = (document.getElementById('els-url')?.value   || '').trim();
  if (!title || !url) { toast('Title and URL required', 'warning'); return; }
  const btn = document.getElementById('els-save');
  setBtnLoading(btn, true, 'Saving...');
  const res = await call('updateContent', {
    contentId, title, type: document.getElementById('els-type')?.value || 'Other',
    url, desc: document.getElementById('els-desc')?.value.trim() || '',
    mode: document.getElementById('els-mode')?.value || 'preview'
  });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast('Updated!', 'success');
  closeModal('m-edit-lesson');
  aOpenCourseDetail(courseId, window._aCName || '');
}

// ── Course CRUD ───────────────────────────────────
function aOpenCreateCourse() {
  buildModal('m-cc', 'Create Course', `
    <div class="field"><label>Name *</label><input class="input" id="cc-n" placeholder="e.g. Web Development 101"/></div>
    <div class="field"><label>Description</label><textarea class="textarea" id="cc-d" placeholder="What will students learn?"></textarea></div>
    <div class="field"><label>Thumbnail URL</label><input class="input" id="cc-t" placeholder="https://... (optional)"/></div>
  `, `
    <button class="btn btn-ghost" id="cc-cancel">Cancel</button>
    <button class="btn btn-primary" id="cc-create"><i class="fa-solid fa-plus"></i> Create</button>
  `);
  document.getElementById('cc-cancel')?.addEventListener('click', () => closeModal('m-cc'));
  document.getElementById('cc-create')?.addEventListener('click', aCreateCourse);
}
async function aCreateCourse() {
  const name = (document.getElementById('cc-n')?.value||'').trim();
  if (!name) { toast('Name required','warning'); return; }
  const btn = document.getElementById('cc-create');
  setBtnLoading(btn, true, 'Creating...');
  const res = await call('createCourse', { adminId:APP.user.id, name, description:document.getElementById('cc-d')?.value.trim()||'', thumbnail:document.getElementById('cc-t')?.value.trim()||'' });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message,'error'); return; }
  toast(`Created! PIN: ${res.pin}`, 'success', 6000);
  closeModal('m-cc'); aNav('courses', null);
}

function aOpenEditCourse(courseId, courseName) {
  buildModal('m-ec', 'Edit Course', `
    <div class="field"><label>Name</label><input class="input" id="ec-n" value="${esc(courseName)}"/></div>
    <div class="field"><label>Description</label><textarea class="textarea" id="ec-d"></textarea></div>
    <div class="field"><label>Thumbnail URL</label><input class="input" id="ec-t"/></div>
  `, `
    <button class="btn btn-ghost" id="ec-cancel">Cancel</button>
    <button class="btn btn-primary" id="ec-save"><i class="fa-solid fa-save"></i> Save</button>
  `);
  document.getElementById('ec-cancel')?.addEventListener('click', () => closeModal('m-ec'));
  document.getElementById('ec-save')?.addEventListener('click', () => aUpdateCourse(courseId));
}
async function aUpdateCourse(courseId) {
  const btn = document.getElementById('ec-save');
  setBtnLoading(btn, true, 'Saving...');
  const res = await call('updateCourse', { adminId:APP.user.id, role:APP.user.role, courseId, name:document.getElementById('ec-n')?.value.trim()||'', description:document.getElementById('ec-d')?.value.trim()||'', thumbnail:document.getElementById('ec-t')?.value.trim()||'' });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message,'error'); return; }
  toast('Updated!','success'); closeModal('m-ec'); aNav('courses', null);
}

function aConfirmDeleteCourse(courseId) {
  confirm2('Delete Course', 'Permanently delete this course?', async () => {
    const res = await call('deleteCourse', { adminId:APP.user.id, role:APP.user.role, courseId });
    if (!res.success) { toast(res.message,'error'); return; }
    toast('Deleted','success'); aNav('courses', null);
  });
}
function aConfirmDelContent(id, title, courseId, courseName) {
  confirm2('Delete Lesson', `Delete "${title}"?`, async () => {
    await call('deleteContent', { contentId:id });
    toast('Deleted','success'); aOpenCourseDetail(courseId, courseName);
  });
}
function aConfirmRemoveStudent(eid, name, courseId, courseName) {
  confirm2('Remove Student', `Remove "${name}"?`, async () => {
    const res = await call('removeStudent', { adminId:APP.user.id, enrollmentId:eid, courseId });
    if (!res.success) { toast(res.message,'error'); return; }
    toast('Removed','success'); aOpenCourseDetail(courseId, courseName);
  }, { label:'Remove', type:'danger' });
}

// ── Announcements ─────────────────────────────────
function aOpenAddAnn(courseId, courseName) {
  buildModal('m-an', 'Post Announcement', `
    <div class="field"><label>Title *</label><input class="input" id="an-t" placeholder="Title"/></div>
    <div class="field"><label>Message *</label><textarea class="textarea" id="an-m" placeholder="Message..."></textarea></div>
  `, `
    <button class="btn btn-ghost" id="an-cancel">Cancel</button>
    <button class="btn btn-primary" id="an-post"><i class="fa-solid fa-bullhorn"></i> Post</button>
  `);
  document.getElementById('an-cancel')?.addEventListener('click', () => closeModal('m-an'));
  document.getElementById('an-post')?.addEventListener('click', () => aPostAnn(courseId, courseName));
}
async function aPostAnn(courseId, courseName) {
  const t = (document.getElementById('an-t')?.value||'').trim();
  const m = (document.getElementById('an-m')?.value||'').trim();
  if (!t || !m) { toast('Fill all fields','warning'); return; }
  const btn = document.getElementById('an-post');
  setBtnLoading(btn, true, 'Posting...');
  const res = await call('addAnnouncement', { courseId, title:t, message:m });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message,'error'); return; }
  toast('Posted!','success'); closeModal('m-an'); aOpenCourseDetail(courseId, courseName);
}
function aConfirmDelAnn(annId, courseId, courseName) {
  confirm2('Delete Announcement', 'Delete this?', async () => {
    await call('deleteAnnouncement', { announcementId:annId });
    toast('Deleted','success'); aOpenCourseDetail(courseId, courseName);
  });
}

// ── Quizzes ───────────────────────────────────────
function aOpenAddQuiz(courseId, courseName) {
  buildModal('m-qz', 'Add Quiz', `
    <div class="field"><label>Title *</label><input class="input" id="qz-t" placeholder="Quiz title"/></div>
    <div class="field"><label>Google Form URL *</label><input class="input" id="qz-l" placeholder="https://forms.google.com/..."/></div>
    <div class="field"><label>Deadline</label><input class="input" type="date" id="qz-d"/></div>
  `, `
    <button class="btn btn-ghost" id="qz-cancel">Cancel</button>
    <button class="btn btn-primary" id="qz-add"><i class="fa-solid fa-plus"></i> Add</button>
  `);
  document.getElementById('qz-cancel')?.addEventListener('click', () => closeModal('m-qz'));
  document.getElementById('qz-add')?.addEventListener('click', () => aAddQuiz(courseId, courseName));
}
async function aAddQuiz(courseId, courseName) {
  const t = (document.getElementById('qz-t')?.value||'').trim();
  const l = (document.getElementById('qz-l')?.value||'').trim();
  if (!t || !l) { toast('Fill required fields','warning'); return; }
  const btn = document.getElementById('qz-add');
  setBtnLoading(btn, true, 'Adding...');
  const res = await call('addQuiz', { courseId, title:t, formLink:l, deadline:document.getElementById('qz-d')?.value||'' });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message,'error'); return; }
  toast('Added!','success'); closeModal('m-qz'); aOpenCourseDetail(courseId, courseName);
}
function aConfirmDelQuiz(quizId, courseId, courseName) {
  confirm2('Delete Quiz', 'Delete this quiz?', async () => {
    await call('deleteQuiz', { quizId });
    toast('Deleted','success'); aOpenCourseDetail(courseId, courseName);
  });
}

// ── Students Page ─────────────────────────────────
async function aRenderStudents() {
  const res = await call('getAdminCourses', { adminId:APP.user.id, role:APP.user.role });
  let all = []; const seen = new Set();
  for (const c of res.courses||[]) {
    const r = await call('getCourseStudents', { courseId:c.Course_ID });
    (r.students||[]).forEach(s => { const k=str(s.Reg_No); if(!seen.has(k)){ seen.add(k); all.push({...s,_cn:c.Course_Name}); } });
  }
  const ct = document.getElementById('a-content');
  ct.innerHTML = `
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>Students</h2><p>${all.length} unique</p></div></div>
    <div style="margin-bottom:14px;max-width:300px">
      <div class="search-wrap"><i class="fa-solid fa-search"></i><input type="search" placeholder="Search..." id="as-q"/></div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr><th>#</th><th>Student</th><th>NIC/Reg</th><th>Course</th><th>Email</th><th>Joined</th></tr></thead>
      <tbody id="as-tb">${aAllStudRows(all)}</tbody></table>
    </div>
  </div>`;
  document.getElementById('as-q')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    const f = q ? all.filter(s=>(s.User_Name||'').toLowerCase().includes(q)||String(s.Reg_No).toLowerCase().includes(q)||(s._cn||'').toLowerCase().includes(q)) : all;
    const tb = document.getElementById('as-tb');
    if (tb) tb.innerHTML = aAllStudRows(f);
  });
}
function aAllStudRows(list) {
  if (!list.length) return `<tr><td colspan="6"><div class="empty" style="padding:28px"><div class="empty-icon">👥</div><p>No students.</p></div></td></tr>`;
  return list.map((s,i) => `<tr>
    <td>${i+1}</td>
    <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar av-32 av-p">${initials(s.User_Name)}</div><span style="font-weight:700">${esc(s.User_Name)}</span></div></td>
    <td><code style="background:var(--surface2);padding:2px 7px;border-radius:5px;font-size:.76rem;font-family:var(--ff-mono)">${esc(String(s.Reg_No))}</code></td>
    <td><span class="badge badge-primary">${esc(s._cn||'—')}</span></td>
    <td style="color:var(--tx2)">${esc(s.Email||'—')}</td>
    <td style="color:var(--tx3)">${fmtDate(s.joinedDate)}</td>
  </tr>`).join('');
}

// ── Settings ──────────────────────────────────────
function aRenderSettings() {
  const u = APP.user;
  const ct = document.getElementById('a-content');
  ct.innerHTML = `
  <div class="anim" style="max-width:540px">
    <div class="sec-head"><div class="sec-head-info"><h2>Settings</h2></div></div>
    <div class="card" style="padding:26px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:15px;margin-bottom:20px">
        <div class="avatar av-72 av-o">${initials(u.name)}</div>
        <div>
          <div style="font-size:1rem;font-weight:900">${esc(u.name)}</div>
          <div style="color:var(--tx3);font-size:.82rem">@${esc(u.username||'')}</div>
          <span class="badge badge-primary" style="margin-top:7px">${esc(u.role)}</span>
        </div>
      </div>
      <div class="divider" style="margin-bottom:18px"></div>
      <h3 style="font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.07em;color:var(--tx2);margin-bottom:14px">Change Password</h3>
      <div style="display:flex;flex-direction:column;gap:13px">
        <div class="field"><label>Current Password</label>
          <div class="input-wrap"><i class="iico fa-solid fa-lock"></i>
            <input class="input" type="password" id="a-op" autocomplete="current-password"/>
            <i class="fa-solid fa-eye input-suffix" id="a-op-tog"></i>
          </div>
        </div>
        <div class="field"><label>New Password</label>
          <div class="input-wrap"><i class="iico fa-solid fa-key"></i>
            <input class="input" type="password" id="a-np" autocomplete="new-password"/>
            <i class="fa-solid fa-eye input-suffix" id="a-np-tog"></i>
          </div>
          <div class="pw-strength" id="a-pw-str"><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div></div>
        </div>
        <div class="field"><label>Confirm</label>
          <div class="input-wrap"><i class="iico fa-solid fa-key"></i>
            <input class="input" type="password" id="a-np2" autocomplete="new-password"/>
          </div>
        </div>
        <button class="btn btn-primary" style="align-self:flex-start" id="a-chpw"><i class="fa-solid fa-save"></i> Update</button>
      </div>
    </div>
    <div class="card" style="padding:18px;display:flex;align-items:center;justify-content:space-between;gap:14px">
      <div><div style="font-weight:700">Theme</div><div style="font-size:.81rem;color:var(--tx2)">Dark / Light mode</div></div>
      <button class="btn btn-ghost" id="a-theme-btn"><i class="fa-solid fa-moon" data-theme-icon></i> Toggle</button>
    </div>
  </div>`;

  document.getElementById('a-op-tog')?.addEventListener('click', function() { togglePw('a-op', this); });
  document.getElementById('a-np-tog')?.addEventListener('click', function() { togglePw('a-np', this); });
  document.getElementById('a-chpw')?.addEventListener('click', aChangePw);
  document.getElementById('a-theme-btn')?.addEventListener('click', toggleTheme);
  renderPwStrength('a-np', 'a-pw-str');
  _syncTheme(document.documentElement.getAttribute('data-theme') || 'light');
}

async function aChangePw() {
  const op = (document.getElementById('a-op')?.value||'').trim();
  const np = (document.getElementById('a-np')?.value||'').trim();
  const c2 = (document.getElementById('a-np2')?.value||'').trim();
  if (!op||!np) { toast('Fill all fields','warning'); return; }
  if (np!==c2)  { toast('No match','error'); return; }
  if (np.length<6) { toast('Min 6 chars','warning'); return; }
  const btn = document.getElementById('a-chpw');
  setBtnLoading(btn, true, 'Updating...');
  const res = await call('changeAdminPassword', { adminId:APP.user.id, oldPassword:op, newPassword:np });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message,'error'); return; }
  toast('Password updated!','success');
}
