/* NextGenLMS — Admin/Lecturer v4 */
let _aCourses = [];

function aNav(section, el) {
  closeSidebar();
  document.querySelectorAll('#a-sidebar .nav-link').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles = { dashboard:'Dashboard', courses:'My Courses', students:'Students', settings:'Settings' };
  document.getElementById('a-page-title').textContent = titles[section] || section;
  document.getElementById('a-content').innerHTML = `<div class="page-load"><div class="spin spin-lg"></div></div>`;
  ({ dashboard:aRenderDashboard, courses:aRenderCourses, students:aRenderStudents, settings:aRenderSettings }[section]||aRenderDashboard)();
}

window.addEventListener('DOMContentLoaded', () => {
  const u = APP.user;
  document.getElementById('a-user-name').textContent   = u.name;
  document.getElementById('a-user-role').textContent   = u.role;
  document.getElementById('a-avatar-text').textContent = initials(u.name);
  document.getElementById('a-sidebar-tag').textContent = u.role === 'Super_Admin' ? 'Super Admin' : 'Lecturer Portal';
  if (u.role === 'Super_Admin') {
    const w = document.getElementById('sa-link-wrap');
    if (w) w.innerHTML = `<div class="nav-section">Super Admin</div><a class="nav-link" onclick="window.location.href='superadmin.html'"><i class="fa-solid fa-crown"></i> Super Admin Panel</a>`;
  }
  aNav('dashboard', document.querySelector('#a-sidebar .nav-link'));
});

async function aRenderDashboard() {
  const res = await call('getAdminCourses', { adminId: APP.user.id, role: APP.user.role });
  _aCourses = res.courses || [];
  document.getElementById('a-content').innerHTML = `
  <div class="anim">
    <div style="margin-bottom:24px"><h2 style="font-size:1.5rem;font-weight:900;margin-bottom:4px">Hello, ${esc(APP.user.name.split(' ')[0])} 👋</h2><p style="color:var(--tx2);font-size:.88rem">${esc(APP.user.role)} · NextGenLMS</p></div>
    <div class="grid-3" style="margin-bottom:24px">
      <div class="card stat-card"><div class="stat-ico ic-purple"><i class="fa-solid fa-book-open"></i></div><div><div class="stat-num">${_aCourses.length}</div><div class="stat-label">My Courses</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-green"><i class="fa-solid fa-users"></i></div><div><div class="stat-num" id="a-sc">—</div><div class="stat-label">Total Students</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-teal"><i class="fa-solid fa-layer-group"></i></div><div><div class="stat-num" id="a-lc">—</div><div class="stat-label">Total Lessons</div></div></div>
    </div>
    <div class="sec-head">
      <div class="sec-head-info"><h2>My Courses</h2></div>
      <button class="btn btn-primary btn-sm" onclick="aOpenCreateCourse()"><i class="fa-solid fa-plus"></i> New Course</button>
    </div>
    ${_aCourses.length===0
      ? `<div class="card"><div class="empty"><div class="empty-icon">📚</div><h4>No courses yet</h4><button class="btn btn-primary" style="margin-top:14px" onclick="aOpenCreateCourse()"><i class="fa-solid fa-plus"></i> Create First</button></div></div>`
      : `<div class="grid-3">${_aCourses.slice(0,6).map(aCourseCard).join('')}</div>`}
  </div>`;
  let sc=0,lc=0;
  for(const c of _aCourses.slice(0,5)){
    const[sr,cr]=await Promise.all([call('getCourseStudents',{courseId:c.Course_ID}),call('getCourseContent',{courseId:c.Course_ID})]);
    sc+=(sr.students||[]).length; lc+=(cr.contents||[]).length;
  }
  const se=document.getElementById('a-sc'), le=document.getElementById('a-lc');
  if(se) se.textContent=sc; if(le) le.textContent=lc;
}

async function aRenderCourses() {
  const res = await call('getAdminCourses', { adminId: APP.user.id, role: APP.user.role });
  _aCourses = res.courses || [];
  document.getElementById('a-content').innerHTML = `
  <div class="anim">
    <div class="sec-head">
      <div class="sec-head-info"><h2>My Courses</h2><p>${_aCourses.length} courses</p></div>
      <button class="btn btn-primary btn-sm" onclick="aOpenCreateCourse()"><i class="fa-solid fa-plus"></i> New Course</button>
    </div>
    <div style="margin-bottom:16px;max-width:340px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input placeholder="Search courses..." id="ac-q" oninput="aFilterCourses()"/></div></div>
    <div class="grid-3" id="ac-grid">${_aCourses.length===0?`<div class="card" style="grid-column:1/-1"><div class="empty"><div class="empty-icon">📚</div><h4>No courses</h4></div></div>`:_aCourses.map(aCourseCard).join('')}</div>
  </div>`;
}

function aFilterCourses() {
  const q = document.getElementById('ac-q').value.toLowerCase();
  const f = q ? _aCourses.filter(c => c.Course_Name.toLowerCase().includes(q)||(c.Course_Description||'').toLowerCase().includes(q)) : _aCourses;
  document.getElementById('ac-grid').innerHTML = f.length===0
    ? `<div class="card" style="grid-column:1/-1"><div class="empty"><div class="empty-icon">🔍</div><h4>No matches</h4></div></div>`
    : f.map(aCourseCard).join('');
}

function aCourseCard(c) {
  const img = c.Thumbnail_URL
    ? `<div class="course-thumb" onclick="aOpenCourseDetail('${esc(c.Course_ID)}','${esc(c.Course_Name)}')" style="cursor:pointer"><img src="${esc(c.Thumbnail_URL)}" loading="lazy" onerror="this.style.display='none'"/></div>`
    : `<div class="course-thumb" onclick="aOpenCourseDetail('${esc(c.Course_ID)}','${esc(c.Course_Name)}')" style="cursor:pointer;background:linear-gradient(135deg,var(--p-glass),rgba(167,139,250,.15))"><span style="font-size:2.6rem">📚</span></div>`;
  return `
  <div class="card course-card">
    ${img}
    <div class="course-body">
      <div class="course-title" onclick="aOpenCourseDetail('${esc(c.Course_ID)}','${esc(c.Course_Name)}')" style="cursor:pointer">${esc(c.Course_Name)}</div>
      <p style="font-size:.8rem;color:var(--tx2);margin-top:4px;line-height:1.4">${esc((c.Course_Description||'').slice(0,80))}${(c.Course_Description||'').length>80?'...':''}</p>
      <div style="margin-top:12px;display:flex;align-items:center;gap:7px;flex-wrap:wrap">
        <span class="course-pin">${esc(c.Course_PIN)}</span>
        <button class="btn btn-ghost btn-sm" style="padding:3px 9px;font-size:.73rem" onclick="copyToClipboard('${esc(c.Course_PIN)}','PIN')"><i class="fa-regular fa-copy"></i> Copy</button>
      </div>
    </div>
  </div>`;
}

async function aOpenCourseDetail(courseId, courseName) {
  const ct = document.getElementById('a-content');
  document.getElementById('a-page-title').textContent = courseName;
  ct.innerHTML = `<div class="page-load"><div class="spin spin-lg"></div></div>`;
  const [conRes,studRes,annRes,qzRes] = await Promise.all([
    call('getCourseContent',{courseId}), call('getCourseStudents',{courseId}),
    call('getAnnouncements',{courseId}), call('getQuizzes',{courseId}),
  ]);
  const contents=conRes.contents||[], students=studRes.students||[], anns=annRes.announcements||[], quizzes=qzRes.quizzes||[];
  window._aCourseId=courseId; window._aCourseName=courseName;

  ct.innerHTML = `
  <div class="anim">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="aNav('courses',null)"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div style="flex:1"><h2 style="font-size:1.15rem;font-weight:900">${esc(courseName)}</h2><p style="font-size:.76rem;color:var(--tx3)">${contents.length} lessons · ${students.length} students</p></div>
      <button class="btn btn-ghost btn-sm" onclick="aOpenEditCourse('${esc(courseId)}','${esc(courseName)}')"><i class="fa-solid fa-pen"></i> Edit</button>
      <button class="btn btn-danger btn-sm" onclick="aConfirmDeleteCourse('${esc(courseId)}')"><i class="fa-solid fa-trash"></i></button>
    </div>
    <div class="tabs-bar" id="acd-tabs" style="margin-bottom:18px">
      <button class="tab-pill active" onclick="acdTab('acd-c',this)"><i class="fa-solid fa-layer-group"></i> Content (${contents.length})</button>
      <button class="tab-pill" onclick="acdTab('acd-s',this)"><i class="fa-solid fa-users"></i> Students (${students.length})</button>
      <button class="tab-pill" onclick="acdTab('acd-a',this)"><i class="fa-solid fa-bullhorn"></i> Announce (${anns.length})</button>
      <button class="tab-pill" onclick="acdTab('acd-q',this)"><i class="fa-solid fa-clipboard-list"></i> Quizzes (${quizzes.length})</button>
    </div>

    <!-- CONTENT TAB -->
    <div id="acd-c">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" onclick="aOpenAddLesson('${esc(courseId)}')"><i class="fa-solid fa-plus"></i> Add Lesson</button>
      </div>
      ${contents.length===0 ? `<div class="card"><div class="empty"><div class="empty-icon">🎥</div><h4>No lessons yet</h4></div></div>`
        : `<div style="display:flex;flex-direction:column;gap:10px">${contents.map(c=>aLessonRow(c,courseId,courseName)).join('')}</div>`}
    </div>

    <!-- STUDENTS TAB -->
    <div id="acd-s" class="hidden">
      <div style="margin-bottom:12px;max-width:300px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input placeholder="Search students..." id="astu-q" oninput="aFilterStudInCourse()"/></div></div>
      <div class="tbl-wrap" id="astu-tbl">${aStudTbl(students,courseId,courseName)}</div>
    </div>

    <!-- ANNOUNCEMENTS TAB -->
    <div id="acd-a" class="hidden">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" onclick="aOpenAddAnn('${esc(courseId)}','${esc(courseName)}')"><i class="fa-solid fa-plus"></i> Post</button>
      </div>
      ${anns.length===0 ? `<div class="card"><div class="empty"><div class="empty-icon">📢</div><h4>No announcements</h4></div></div>`
        : anns.map(a=>`<div class="card ann-item" style="margin-bottom:10px"><div style="display:flex;gap:10px"><div style="flex:1"><div class="ann-title">${esc(a.Title)}</div><div class="ann-body">${esc(a.Message)}</div><div class="ann-foot">${fmtDateTime(a.Posted_Date)}</div></div><button class="btn btn-danger btn-sm btn-icon" onclick="aConfirmDelAnn('${esc(a.Announcement_ID)}','${esc(courseId)}','${esc(courseName)}')"><i class="fa-solid fa-trash"></i></button></div></div>`).join('')}
    </div>

    <!-- QUIZZES TAB -->
    <div id="acd-q" class="hidden">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" onclick="aOpenAddQuiz('${esc(courseId)}','${esc(courseName)}')"><i class="fa-solid fa-plus"></i> Add Quiz</button>
      </div>
      ${quizzes.length===0 ? `<div class="card"><div class="empty"><div class="empty-icon">📝</div><h4>No quizzes</h4></div></div>`
        : `<div style="display:flex;flex-direction:column;gap:10px">${quizzes.map(q=>`<div class="card card-inner" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div class="lesson-ico lic-quiz"><i class="fa-solid fa-clipboard-list"></i></div>
          <div style="flex:1"><div style="font-weight:800">${esc(q.Quiz_Title)}</div>${q.Deadline?`<div style="font-size:.8rem;color:var(--tx3)">Due: ${fmtDate(q.Deadline)}</div>`:''}</div>
          <a href="${esc(q.Google_Form_Link)}" target="_blank" class="btn btn-ghost btn-sm"><i class="fa-solid fa-external-link"></i></a>
          <button class="btn btn-danger btn-sm btn-icon" onclick="aConfirmDelQuiz('${esc(q.Quiz_ID)}','${esc(courseId)}','${esc(courseName)}')"><i class="fa-solid fa-trash"></i></button>
        </div>`).join('')}</div>`}
    </div>
  </div>`;
}

function acdTab(tab,btn){
  document.querySelectorAll('#acd-tabs .tab-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  ['acd-c','acd-s','acd-a','acd-q'].forEach(id=>document.getElementById(id)?.classList.toggle('hidden',id!==tab));
}

// ── LESSON ROW ────────────────────────────────────
function aLessonRow(c, courseId, courseName) {
  const icmap={Video:'fa-play-circle',PDF:'fa-file-pdf',Quiz:'fa-clipboard-list',Text:'fa-file-lines',Presentation:'fa-file-powerpoint'};
  const clmap={Video:'lic-video',PDF:'lic-pdf',Quiz:'lic-quiz',Text:'lic-other',Presentation:'lic-other'};
  const modeLabel = {preview:'👁 Preview Only', download:'⬇ Download Only', 'preview-download':'👁⬇ Preview & Download'};
  return `
  <div class="lesson-item">
    <div class="lesson-ico ${clmap[c.Content_Type]||'lic-other'}"><i class="fa-solid ${icmap[c.Content_Type]||'fa-file'}"></i></div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:.9rem">${esc(c.Topic_Title)}</div>
      <div style="font-size:.75rem;color:var(--tx3);margin-top:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span>${esc(c.Content_Type)}</span>
        ${c._mode ? `<span class="badge badge-gray" style="font-size:.68rem">${modeLabel[c._mode]||c._mode}</span>` : ''}
        ${c._url ? `<a href="${esc(c._url)}" target="_blank" style="color:var(--p)" onclick="event.stopPropagation()">Open Link</a>` : ''}
      </div>
    </div>
    <button class="btn btn-ghost btn-sm btn-icon" onclick="aOpenEditLesson('${esc(str(c.Content_ID))}','${esc(courseId)}','${esc(courseName)}')"><i class="fa-solid fa-pen"></i></button>
    <button class="btn btn-danger btn-sm btn-icon" onclick="aConfirmDelContent('${esc(str(c.Content_ID))}','${esc(c.Topic_Title)}','${esc(courseId)}','${esc(courseName)}')"><i class="fa-solid fa-trash"></i></button>
  </div>`;
}

// ── ADD LESSON MODAL ──────────────────────────────
function aOpenAddLesson(courseId) {
  buildModal('m-lesson', 'Add Lesson', `
    <div class="field"><label>Title *</label><input class="input" id="ls-title" placeholder="e.g. Introduction to Python"/></div>
    <div class="field"><label>Description</label><textarea class="textarea" id="ls-desc" placeholder="What will students learn in this lesson?" style="min-height:70px"></textarea></div>
    <div class="form-grid-2">
      <div class="field">
        <label>Content Type *</label>
        <select class="select" id="ls-type" onchange="aLessonTypeChange()">
          <option value="Video">🎬 Video</option>
          <option value="PDF">📄 PDF Document</option>
          <option value="Presentation">📊 Presentation (Slides)</option>
          <option value="Text">📝 Text / Article</option>
          <option value="Quiz">📋 Quiz / Form</option>
          <option value="Other">📎 Other</option>
        </select>
      </div>
      <div class="field">
        <label>Access Mode</label>
        <select class="select" id="ls-mode">
          <option value="preview">👁 Preview Only</option>
          <option value="preview-download">👁⬇ Preview & Download</option>
          <option value="download">⬇ Download Only</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>URL / Link *</label>
      <div class="input-wrap"><i class="iico fa-solid fa-link"></i>
        <input class="input" id="ls-url" placeholder="Paste YouTube, Google Drive, Slides, or PDF link"/>
      </div>
      <div id="ls-url-hint" class="hint" style="margin-top:6px"></div>
    </div>
    <div id="ls-preview-area" style="display:none;margin-top:4px">
      <div style="font-size:.78rem;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Live Preview</div>
      <div id="ls-preview-frame" style="border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--b1)"></div>
    </div>
  `,`
    <button class="btn btn-ghost" onclick="closeModal('m-lesson')">Cancel</button>
    <button class="btn btn-ghost btn-sm" onclick="aLessonPreview()"><i class="fa-solid fa-eye"></i> Preview</button>
    <button class="btn btn-primary" id="ls-btn" onclick="aAddLesson('${esc(courseId)}')"><i class="fa-solid fa-plus"></i> Add Lesson</button>
  `, true);

  // Live URL hints
  document.getElementById('ls-url').addEventListener('input', aUpdateUrlHint);
  aLessonTypeChange();
}

function aLessonTypeChange() {
  const type = document.getElementById('ls-type')?.value;
  const hints = {
    Video: '📹 YouTube / Google Drive video link',
    PDF:   '📄 Google Drive PDF link (share link)',
    Presentation: '📊 Google Slides share link',
    Text:  '📝 Any URL, Google Doc, or web article',
    Quiz:  '📋 Google Forms link',
    Other: '📎 Any URL'
  };
  const modeEl = document.getElementById('ls-mode');
  // Set default mode per type
  if (type === 'Video') modeEl.value = 'preview';
  if (type === 'PDF')   modeEl.value = 'preview-download';
  if (type === 'Quiz')  modeEl.value = 'preview';
  const hint = document.getElementById('ls-url-hint');
  if (hint) hint.textContent = hints[type] || '';
}

function aUpdateUrlHint() {
  const url = document.getElementById('ls-url').value.trim();
  const hint = document.getElementById('ls-url-hint');
  if (!hint || !url) return;
  if (ytEmbed(url)) hint.innerHTML = `<span style="color:var(--success)"><i class="fa-brands fa-youtube"></i> YouTube video detected — will embed in player</span>`;
  else if (url.includes('drive.google.com')) hint.innerHTML = `<span style="color:var(--success)"><i class="fa-brands fa-google-drive"></i> Google Drive — will embed in viewer</span>`;
  else if (url.includes('docs.google.com/presentation')) hint.innerHTML = `<span style="color:var(--success)"><i class="fa-solid fa-file-powerpoint"></i> Google Slides — will embed presentation</span>`;
  else if (url.includes('docs.google.com/forms') || url.includes('forms.gle')) hint.innerHTML = `<span style="color:var(--success)"><i class="fa-solid fa-clipboard-list"></i> Google Form — will embed quiz</span>`;
  else if (url.includes('docs.google.com/document')) hint.innerHTML = `<span style="color:var(--success)"><i class="fa-solid fa-file-lines"></i> Google Doc — will embed</span>`;
  else if (url.startsWith('http')) hint.innerHTML = `<span style="color:var(--info)"><i class="fa-solid fa-globe"></i> External link — will show as link</span>`;
  else hint.textContent = '';
}

function aLessonPreview() {
  const url = document.getElementById('ls-url').value.trim();
  const type = document.getElementById('ls-type').value;
  if (!url) { toast('Enter a URL first', 'warning'); return; }
  const embed = detectEmbed(url, type);
  const area = document.getElementById('ls-preview-area');
  const frame = document.getElementById('ls-preview-frame');
  if (!embed) {
    toast('Preview not available for this URL type — will open as link', 'info');
    return;
  }
  area.style.display = 'block';
  const isVideo = !!ytEmbed(url);
  const h = isVideo ? '240px' : '380px';
  frame.innerHTML = `<iframe src="${esc(embed)}" style="width:100%;height:${h};border:none" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"></iframe>`;
}

async function aAddLesson(courseId) {
  const title = document.getElementById('ls-title').value.trim();
  const url   = document.getElementById('ls-url').value.trim();
  if (!title || !url) { toast('Title and URL are required', 'warning'); return; }
  const btn = document.getElementById('ls-btn');
  setBtnLoading(btn, true, 'Adding...');
  const res = await call('addContent', {
    adminId: APP.user.id, role: APP.user.role, courseId,
    title, type: document.getElementById('ls-type').value,
    url, desc: document.getElementById('ls-desc').value.trim(),
    mode: document.getElementById('ls-mode').value
  });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast('Lesson added!', 'success');
  closeModal('m-lesson');
  aOpenCourseDetail(courseId, window._aCourseName || '');
}

// ── EDIT LESSON MODAL ─────────────────────────────
async function aOpenEditLesson(contentId, courseId, courseName) {
  // Fetch current content
  const res = await call('getCourseContent', { courseId });
  const item = (res.contents||[]).find(x => str(x.Content_ID) === str(contentId));
  if (!item) { toast('Lesson not found', 'error'); return; }

  buildModal('m-edit-lesson', 'Edit Lesson', `
    <div class="field"><label>Title *</label><input class="input" id="els-title" value="${esc(item.Topic_Title)}"/></div>
    <div class="field"><label>Description</label><textarea class="textarea" id="els-desc" style="min-height:70px">${esc(item._desc||'')}</textarea></div>
    <div class="form-grid-2">
      <div class="field">
        <label>Content Type</label>
        <select class="select" id="els-type">
          <option value="Video" ${item.Content_Type==='Video'?'selected':''}>🎬 Video</option>
          <option value="PDF" ${item.Content_Type==='PDF'?'selected':''}>📄 PDF</option>
          <option value="Presentation" ${item.Content_Type==='Presentation'?'selected':''}>📊 Presentation</option>
          <option value="Text" ${item.Content_Type==='Text'?'selected':''}>📝 Text</option>
          <option value="Quiz" ${item.Content_Type==='Quiz'?'selected':''}>📋 Quiz</option>
          <option value="Other" ${item.Content_Type==='Other'?'selected':''}>📎 Other</option>
        </select>
      </div>
      <div class="field">
        <label>Access Mode</label>
        <select class="select" id="els-mode">
          <option value="preview" ${(item._mode||'preview')==='preview'?'selected':''}>👁 Preview Only</option>
          <option value="preview-download" ${item._mode==='preview-download'?'selected':''}>👁⬇ Preview & Download</option>
          <option value="download" ${item._mode==='download'?'selected':''}>⬇ Download Only</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>URL *</label>
      <div class="input-wrap"><i class="iico fa-solid fa-link"></i>
        <input class="input" id="els-url" value="${esc(item._url||'')}"/>
      </div>
    </div>
  `,`
    <button class="btn btn-ghost" onclick="closeModal('m-edit-lesson')">Cancel</button>
    <button class="btn btn-primary" id="els-btn" onclick="aUpdateLesson('${esc(contentId)}','${esc(courseId)}')"><i class="fa-solid fa-save"></i> Save</button>
  `, true);
}

async function aUpdateLesson(contentId, courseId) {
  const title = document.getElementById('els-title').value.trim();
  const url   = document.getElementById('els-url').value.trim();
  if (!title || !url) { toast('Title and URL required', 'warning'); return; }
  const btn = document.getElementById('els-btn');
  setBtnLoading(btn, true, 'Saving...');
  const res = await call('updateContent', {
    contentId, title, type: document.getElementById('els-type').value,
    url, desc: document.getElementById('els-desc').value.trim(),
    mode: document.getElementById('els-mode').value
  });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast('Lesson updated!', 'success');
  closeModal('m-edit-lesson');
  aOpenCourseDetail(courseId, window._aCourseName || '');
}

// ── STUDENTS TABLE ────────────────────────────────
function aStudTbl(students, courseId, courseName) {
  const rows = students.length===0
    ? `<tr><td colspan="5"><div class="empty" style="padding:30px"><div class="empty-icon">👥</div><p>No students enrolled.</p></div></td></tr>`
    : students.map((s,i)=>`<tr>
        <td>${i+1}</td>
        <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar av-32 av-p">${initials(s.User_Name)}</div><span style="font-weight:700">${esc(s.User_Name)}</span></div></td>
        <td><code style="background:var(--surface2);padding:2px 8px;border-radius:5px;font-size:.78rem;font-family:var(--ff-mono)">${esc(String(s.Reg_No))}</code></td>
        <td style="color:var(--tx2)">${esc(s.Email||'—')}</td>
        <td><button class="btn btn-danger btn-sm" onclick="aConfirmRemoveStudent('${esc(s.enrollmentId)}','${esc(s.User_Name)}','${esc(courseId)}','${esc(courseName)}')"><i class="fa-solid fa-user-minus"></i> Remove</button></td>
      </tr>`).join('');
  return `<table><thead><tr><th>#</th><th>Student</th><th>NIC / Reg</th><th>Email</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function aFilterStudInCourse() {
  const q = document.getElementById('astu-q').value.toLowerCase();
  Array.from(document.querySelectorAll('#astu-tbl tbody tr')).forEach(row => {
    row.style.display = q && !row.textContent.toLowerCase().includes(q) ? 'none' : '';
  });
}

// ── COURSE MODALS ─────────────────────────────────
function aOpenCreateCourse(){buildModal('m-cc','Create Course',`<div class="field"><label>Name *</label><input class="input" id="cc-n" placeholder="e.g. Web Development 101"/></div><div class="field"><label>Description</label><textarea class="textarea" id="cc-d" placeholder="What will students learn?"></textarea></div><div class="field"><label>Thumbnail URL</label><input class="input" id="cc-t" placeholder="https://... (optional)"/></div>`,`<button class="btn btn-ghost" onclick="closeModal('m-cc')">Cancel</button><button class="btn btn-primary" id="cc-btn" onclick="aCreateCourse()"><i class="fa-solid fa-plus"></i> Create</button>`);}
async function aCreateCourse(){const n=document.getElementById('cc-n').value.trim();if(!n){toast('Name required','warning');return;}const btn=document.getElementById('cc-btn');setBtnLoading(btn,true,'Creating...');const res=await call('createCourse',{adminId:APP.user.id,name:n,description:document.getElementById('cc-d').value.trim(),thumbnail:document.getElementById('cc-t').value.trim()});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast(`Created! PIN: ${res.pin}`,'success',6000);closeModal('m-cc');aNav('courses',null);}
function aOpenEditCourse(id,name){buildModal('m-ec','Edit Course',`<div class="field"><label>Name</label><input class="input" id="ec-n" value="${esc(name)}"/></div><div class="field"><label>Description</label><textarea class="textarea" id="ec-d"></textarea></div><div class="field"><label>Thumbnail URL</label><input class="input" id="ec-t"/></div>`,`<button class="btn btn-ghost" onclick="closeModal('m-ec')">Cancel</button><button class="btn btn-primary" id="ec-btn" onclick="aUpdateCourse('${esc(id)}')"><i class="fa-solid fa-save"></i> Save</button>`);}
async function aUpdateCourse(id){const btn=document.getElementById('ec-btn');setBtnLoading(btn,true,'Saving...');const res=await call('updateCourse',{adminId:APP.user.id,role:APP.user.role,courseId:id,name:document.getElementById('ec-n').value.trim(),description:document.getElementById('ec-d').value.trim(),thumbnail:document.getElementById('ec-t').value.trim()});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Updated!','success');closeModal('m-ec');aNav('courses',null);}
function aConfirmDeleteCourse(id){confirm2('Delete Course','Permanently delete this course?',async()=>{const res=await call('deleteCourse',{adminId:APP.user.id,role:APP.user.role,courseId:id});if(!res.success){toast(res.message,'error');return;}toast('Deleted','success');aNav('courses',null);});}
function aConfirmDelContent(cid,title,courseId,cname){confirm2('Delete Lesson',`Delete "${title}"?`,async()=>{await call('deleteContent',{contentId:cid});toast('Deleted','success');aOpenCourseDetail(courseId,cname);});}
function aConfirmRemoveStudent(eid,name,cid,cname){confirm2('Remove Student',`Remove "${name}"?`,async()=>{const res=await call('removeStudent',{adminId:APP.user.id,enrollmentId:eid,courseId:cid});if(!res.success){toast(res.message,'error');return;}toast('Removed','success');aOpenCourseDetail(cid,cname);},{label:'Remove',type:'danger'});}
function aOpenAddAnn(cid,cname){buildModal('m-an','Post Announcement',`<div class="field"><label>Title *</label><input class="input" id="an-t" placeholder="Title"/></div><div class="field"><label>Message *</label><textarea class="textarea" id="an-m" placeholder="Message..."></textarea></div>`,`<button class="btn btn-ghost" onclick="closeModal('m-an')">Cancel</button><button class="btn btn-primary" id="an-btn" onclick="aPostAnn('${esc(cid)}','${esc(cname)}')"><i class="fa-solid fa-bullhorn"></i> Post</button>`);}
async function aPostAnn(cid,cname){const t=document.getElementById('an-t').value.trim(),m=document.getElementById('an-m').value.trim();if(!t||!m){toast('Fill all fields','warning');return;}const btn=document.getElementById('an-btn');setBtnLoading(btn,true,'Posting...');const res=await call('addAnnouncement',{courseId:cid,title:t,message:m});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Posted!','success');closeModal('m-an');aOpenCourseDetail(cid,cname);}
function aConfirmDelAnn(aid,cid,cname){confirm2('Delete Announcement','Delete this?',async()=>{await call('deleteAnnouncement',{announcementId:aid});toast('Deleted','success');aOpenCourseDetail(cid,cname);});}
function aOpenAddQuiz(cid,cname){buildModal('m-qz','Add Quiz',`<div class="field"><label>Title *</label><input class="input" id="qz-t" placeholder="Quiz title"/></div><div class="field"><label>Google Form URL *</label><input class="input" id="qz-l" placeholder="https://forms.google.com/..."/></div><div class="field"><label>Deadline</label><input class="input" type="date" id="qz-d"/></div>`,`<button class="btn btn-ghost" onclick="closeModal('m-qz')">Cancel</button><button class="btn btn-primary" id="qz-btn" onclick="aAddQuiz('${esc(cid)}','${esc(cname)}')"><i class="fa-solid fa-plus"></i> Add</button>`);}
async function aAddQuiz(cid,cname){const t=document.getElementById('qz-t').value.trim(),l=document.getElementById('qz-l').value.trim();if(!t||!l){toast('Fill required fields','warning');return;}const btn=document.getElementById('qz-btn');setBtnLoading(btn,true,'Adding...');const res=await call('addQuiz',{courseId:cid,title:t,formLink:l,deadline:document.getElementById('qz-d').value});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Added!','success');closeModal('m-qz');aOpenCourseDetail(cid,cname);}
function aConfirmDelQuiz(qid,cid,cname){confirm2('Delete Quiz','Delete?',async()=>{await call('deleteQuiz',{quizId:qid});toast('Deleted','success');aOpenCourseDetail(cid,cname);});}

// ── STUDENTS PAGE ─────────────────────────────────
async function aRenderStudents() {
  const res = await call('getAdminCourses', { adminId: APP.user.id, role: APP.user.role });
  let all = []; const seen = new Set();
  for (const c of res.courses||[]) {
    const r = await call('getCourseStudents', { courseId: c.Course_ID });
    (r.students||[]).forEach(s => { const k=str(s.Reg_No); if(!seen.has(k)){ seen.add(k); all.push({...s,_cn:c.Course_Name}); } });
  }
  document.getElementById('a-content').innerHTML = `
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>Students</h2><p>${all.length} unique</p></div></div>
    <div style="margin-bottom:14px;max-width:320px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input placeholder="Search..." id="as-q" oninput="aFilterAllStudents()"/></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Student</th><th>NIC/Reg</th><th>Course</th><th>Email</th><th>Joined</th></tr></thead>
    <tbody id="as-tb">${aAllStudRows(all)}</tbody></table></div>
  </div>`;
  document.getElementById('as-q')._all = all;
}

function aAllStudRows(list) {
  if(!list.length) return `<tr><td colspan="6"><div class="empty" style="padding:30px"><div class="empty-icon">👥</div><p>No students.</p></div></td></tr>`;
  return list.map((s,i)=>`<tr><td>${i+1}</td><td><div style="display:flex;align-items:center;gap:10px"><div class="avatar av-32 av-p">${initials(s.User_Name)}</div><span style="font-weight:700">${esc(s.User_Name)}</span></div></td><td><code style="background:var(--surface2);padding:2px 8px;border-radius:5px;font-size:.78rem;font-family:var(--ff-mono)">${esc(String(s.Reg_No))}</code></td><td><span class="badge badge-primary">${esc(s._cn||'—')}</span></td><td style="color:var(--tx2)">${esc(s.Email||'—')}</td><td style="color:var(--tx3)">${fmtDate(s.joinedDate)}</td></tr>`).join('');
}

function aFilterAllStudents() {
  const q=document.getElementById('as-q').value.toLowerCase();
  const all=document.getElementById('as-q')._all||[];
  const f=q?all.filter(s=>(s.User_Name||'').toLowerCase().includes(q)||String(s.Reg_No).toLowerCase().includes(q)||(s._cn||'').toLowerCase().includes(q)):all;
  document.getElementById('as-tb').innerHTML=aAllStudRows(f);
}

// ── SETTINGS ─────────────────────────────────────
function aRenderSettings(){const u=APP.user;document.getElementById('a-content').innerHTML=`<div class="anim" style="max-width:560px"><div class="sec-head"><div class="sec-head-info"><h2>Settings</h2></div></div><div class="card" style="padding:28px;margin-bottom:16px"><div style="display:flex;align-items:center;gap:16px;margin-bottom:22px"><div class="avatar av-72 av-o">${initials(u.name)}</div><div><div style="font-size:1.05rem;font-weight:900">${esc(u.name)}</div><div style="color:var(--tx3);font-size:.83rem">@${esc(u.username||'')}</div><span class="badge badge-primary" style="margin-top:8px">${esc(u.role)}</span></div></div><div class="divider" style="margin-bottom:20px"></div><h3 style="font-weight:800;font-size:.8rem;text-transform:uppercase;letter-spacing:.07em;color:var(--tx2);margin-bottom:14px">Change Password</h3><div style="display:flex;flex-direction:column;gap:14px"><div class="field"><label>Current Password</label><div class="input-wrap"><i class="iico fa-solid fa-lock"></i><input class="input" type="password" id="a-op" placeholder="Current"/><i class="fa-solid fa-eye input-suffix" onclick="togglePw('a-op',this)"></i></div></div><div class="field"><label>New Password</label><div class="input-wrap"><i class="iico fa-solid fa-key"></i><input class="input" type="password" id="a-np" placeholder="New (min 6)"/><i class="fa-solid fa-eye input-suffix" onclick="togglePw('a-np',this)"></i></div><div class="pw-strength" id="a-pw-str"><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div></div></div><div class="field"><label>Confirm</label><div class="input-wrap"><i class="iico fa-solid fa-key"></i><input class="input" type="password" id="a-np2" placeholder="Repeat"/></div></div><button class="btn btn-primary" style="align-self:flex-start" id="a-chpw" onclick="aChangePw()"><i class="fa-solid fa-save"></i> Update</button></div></div><div class="card" style="padding:20px;display:flex;align-items:center;justify-content:space-between"><div><div style="font-weight:700">Theme</div><div style="font-size:.82rem;color:var(--tx2)">Dark / Light mode</div></div><button class="btn btn-ghost" onclick="toggleTheme()"><i class="fa-solid fa-moon" data-theme-icon></i> Toggle</button></div></div>`;renderPwStrength('a-np','a-pw-str');}
async function aChangePw(){const op=document.getElementById('a-op').value.trim(),np=document.getElementById('a-np').value.trim(),c2=document.getElementById('a-np2').value.trim();if(!op||!np){toast('Fill all fields','warning');return;}if(np!==c2){toast('No match','error');return;}if(np.length<6){toast('Min 6','warning');return;}const btn=document.getElementById('a-chpw');setBtnLoading(btn,true,'Updating...');const res=await call('changeAdminPassword',{adminId:APP.user.id,oldPassword:op,newPassword:np});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Password updated!','success');}
