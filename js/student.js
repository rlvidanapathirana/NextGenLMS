/* NextGenLMS — Student v4 */
let _sAllCourses = [];

function sNav(section, el) {
  closeSidebar();
  document.querySelectorAll('#s-sidebar .nav-link').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const titles={dashboard:'Dashboard',courses:'My Courses',join:'Join a Course',progress:'My Progress',quizzes:'Quizzes',settings:'Settings'};
  document.getElementById('s-page-title').textContent=titles[section]||section;
  document.getElementById('s-content').innerHTML=`<div class="page-load"><div class="spin spin-lg"></div></div>`;
  ({dashboard:sRenderDashboard,courses:sRenderCourses,join:sRenderJoin,progress:sRenderProgress,quizzes:sRenderQuizzes,settings:sRenderSettings}[section]||sRenderDashboard)();
}

window.addEventListener('DOMContentLoaded',()=>{
  const u=APP.user;
  document.getElementById('s-user-name').textContent=u.name;
  document.getElementById('s-user-role').textContent='Student';
  document.getElementById('s-avatar-text').textContent=initials(u.name);
  sNav('dashboard',document.querySelector('#s-sidebar .nav-link'));
});

async function sRenderDashboard(){
  const res=await call('getMyCourses',{regNo:APP.user.regNo});
  _sAllCourses=res.courses||[];
  const ct=document.getElementById('s-content');
  ct.innerHTML=`
  <div class="anim">
    <div style="margin-bottom:24px"><h2 style="font-size:1.5rem;font-weight:900;margin-bottom:4px">Hello, ${esc(APP.user.name.split(' ')[0])} 👋</h2><p style="color:var(--tx2);font-size:.88rem">Keep up the great work on your learning journey.</p></div>
    <div class="grid-3" style="margin-bottom:24px">
      <div class="card stat-card"><div class="stat-ico ic-purple"><i class="fa-solid fa-book-open"></i></div><div><div class="stat-num">${_sAllCourses.length}</div><div class="stat-label">Enrolled Courses</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-green"><i class="fa-solid fa-circle-check"></i></div><div><div class="stat-num" id="s-done">—</div><div class="stat-label">Lessons Done</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-yellow"><i class="fa-solid fa-fire"></i></div><div><div class="stat-num" id="s-pct">—</div><div class="stat-label">Progress</div></div></div>
    </div>
    <div class="sec-head">
      <div class="sec-head-info"><h2>My Courses</h2><p>${_sAllCourses.length} enrolled</p></div>
      <button class="btn btn-primary btn-sm" onclick="sNav('join',null)"><i class="fa-solid fa-plus"></i> Join Course</button>
    </div>
    ${_sAllCourses.length===0
      ?`<div class="card"><div class="empty"><div class="empty-icon">📚</div><h4>No courses yet</h4><p>Use a PIN from your lecturer to join.</p><button class="btn btn-primary" style="margin-top:14px" onclick="sNav('join',null)"><i class="fa-solid fa-plus"></i> Join a Course</button></div></div>`
      :`<div class="grid-3">${_sAllCourses.slice(0,6).map(sCourseCard).join('')}</div>`}
  </div>`;
  call('getProgress',{regNo:APP.user.regNo}).then(pr=>{
    const done=(pr.progress||[]).filter(p=>p.Status==='Completed').length;
    const el1=document.getElementById('s-done'),el2=document.getElementById('s-pct');
    if(el1) el1.textContent=done;
    if(el2) el2.textContent=done>0?done+' done':'0%';
  });
}

async function sRenderCourses(){
  const res=await call('getMyCourses',{regNo:APP.user.regNo});
  _sAllCourses=res.courses||[];
  document.getElementById('s-content').innerHTML=`
  <div class="anim">
    <div class="sec-head">
      <div class="sec-head-info"><h2>My Courses</h2><p>${_sAllCourses.length} enrolled</p></div>
      <button class="btn btn-primary btn-sm" onclick="sNav('join',null)"><i class="fa-solid fa-plus"></i> Join New</button>
    </div>
    <div style="margin-bottom:16px;max-width:340px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input placeholder="Search courses..." id="sc-q" oninput="sFilterCourses()"/></div></div>
    <div class="grid-3" id="sc-grid">${_sAllCourses.length===0?`<div class="card" style="grid-column:1/-1"><div class="empty"><div class="empty-icon">📚</div><h4>No courses yet</h4></div></div>`:_sAllCourses.map(sCourseCard).join('')}</div>
  </div>`;
}

function sFilterCourses(){
  const q=document.getElementById('sc-q').value.toLowerCase();
  const f=q?_sAllCourses.filter(c=>c.Course_Name.toLowerCase().includes(q)||(c.Course_Description||'').toLowerCase().includes(q)):_sAllCourses;
  document.getElementById('sc-grid').innerHTML=f.length===0?`<div class="card" style="grid-column:1/-1"><div class="empty"><div class="empty-icon">🔍</div><h4>No matches</h4></div></div>`:f.map(sCourseCard).join('');
}

function sCourseCard(c){
  const img=c.Thumbnail_URL
    ?`<div class="course-thumb"><img src="${esc(c.Thumbnail_URL)}" loading="lazy" onerror="this.style.display='none'"/></div>`
    :`<div class="course-thumb" style="background:linear-gradient(135deg,var(--p-glass),rgba(167,139,250,.15))"><span style="font-size:2.6rem">📚</span></div>`;
  return `<div class="card course-card card-hover" onclick="sOpenCourse('${esc(c.Course_ID)}','${esc(c.Course_Name)}')">${img}<div class="course-body"><div class="course-title">${esc(c.Course_Name)}</div><p style="font-size:.8rem;color:var(--tx2);margin-top:4px;line-height:1.4">${esc((c.Course_Description||'').slice(0,85))}${(c.Course_Description||'').length>85?'...':''}</p><div style="margin-top:12px"><span class="badge badge-primary"><i class="fa-solid fa-play-circle"></i> Open</span></div></div></div>`;
}

async function sOpenCourse(courseId,courseName){
  const ct=document.getElementById('s-content');
  document.getElementById('s-page-title').textContent=courseName;
  ct.innerHTML=`<div class="page-load"><div class="spin spin-lg"></div></div>`;
  const[conRes,annRes,qzRes,prRes]=await Promise.all([
    call('getCourseContent',{courseId}),call('getAnnouncements',{courseId}),
    call('getQuizzes',{courseId}),call('getProgress',{regNo:APP.user.regNo}),
  ]);
  const contents=conRes.contents||[],anns=annRes.announcements||[],quizzes=qzRes.quizzes||[];
  const progMap={};
  (prRes.progress||[]).forEach(p=>progMap[str(p.Content_ID)]=p.Status);
  const done=contents.filter(c=>progMap[str(c.Content_ID)]==='Completed').length;
  const pct=contents.length?Math.round(done/contents.length*100):0;
  window._sCourseId=courseId; window._sCourseName=courseName;

  ct.innerHTML=`
  <div class="anim">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="sNav('courses',null)"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div style="flex:1"><h2 style="font-size:1.15rem;font-weight:900">${esc(courseName)}</h2><p style="font-size:.76rem;color:var(--tx3)">${contents.length} lessons · ${quizzes.length} quizzes</p></div>
    </div>
    <div class="card" style="padding:18px 22px;margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:.83rem;font-weight:700;color:var(--tx2)">Your Progress</span>
        <span style="font-size:.83rem;font-weight:800;color:var(--p)">${done}/${contents.length} · ${pct}%</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="tabs-bar" id="cv-tabs" style="margin-bottom:18px">
      <button class="tab-pill active" onclick="cvSwitch('cv-lessons',this)"><i class="fa-solid fa-video"></i> Lessons (${contents.length})</button>
      <button class="tab-pill" onclick="cvSwitch('cv-anns',this)"><i class="fa-solid fa-bullhorn"></i> Announcements${anns.length?` <span class="nav-badge">${anns.length}</span>`:''}</button>
      <button class="tab-pill" onclick="cvSwitch('cv-quizzes',this)"><i class="fa-solid fa-clipboard-list"></i> Quizzes${quizzes.length?` <span class="nav-badge">${quizzes.length}</span>`:''}</button>
    </div>
    <div id="cv-lessons">${contents.length===0?`<div class="card"><div class="empty"><div class="empty-icon">🎥</div><h4>No lessons yet</h4></div></div>`:`<div style="display:flex;flex-direction:column;gap:10px">${contents.map(c=>sLessonRow(c,progMap,courseId,courseName)).join('')}</div>`}</div>
    <div id="cv-anns" class="hidden">${anns.length===0?`<div class="card"><div class="empty"><div class="empty-icon">📢</div><h4>No announcements</h4></div></div>`:anns.map(a=>`<div class="card ann-item" style="margin-bottom:10px"><div class="ann-title">${esc(a.Title)}</div><div class="ann-body">${esc(a.Message)}</div><div class="ann-foot"><i class="fa-regular fa-clock"></i> ${fmtDateTime(a.Posted_Date)}</div></div>`).join('')}</div>
    <div id="cv-quizzes" class="hidden">${quizzes.length===0?`<div class="card"><div class="empty"><div class="empty-icon">📝</div><h4>No quizzes</h4></div></div>`:`<div style="display:flex;flex-direction:column;gap:10px">${quizzes.map(q=>`<div class="card card-inner" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div class="lesson-ico lic-quiz"><i class="fa-solid fa-clipboard-list"></i></div><div style="flex:1"><div style="font-weight:800">${esc(q.Quiz_Title)}</div>${q.Deadline?`<div style="font-size:.8rem;color:var(--tx3)">Due: ${fmtDate(q.Deadline)}</div>`:''}</div><a href="${esc(q.Google_Form_Link)}" target="_blank" class="btn btn-primary btn-sm"><i class="fa-solid fa-external-link"></i> Take</a></div>`).join('')}</div>`}</div>
  </div>`;
}

function cvSwitch(tab,btn){
  document.querySelectorAll('#cv-tabs .tab-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  ['cv-lessons','cv-anns','cv-quizzes'].forEach(id=>document.getElementById(id)?.classList.toggle('hidden',id!==tab));
}

function sLessonRow(c,progMap,courseId,courseName){
  const done=progMap[str(c.Content_ID)]==='Completed';
  const icmap={Video:'fa-play-circle',PDF:'fa-file-pdf',Quiz:'fa-clipboard-list',Text:'fa-file-lines',Presentation:'fa-file-powerpoint'};
  const clmap={Video:'lic-video',PDF:'lic-pdf',Quiz:'lic-quiz',Text:'lic-other',Presentation:'lic-other'};
  return `<div class="lesson-item${done?' done':''}" onclick="sOpenLesson(${JSON.stringify(c)},${JSON.stringify(courseId)},${JSON.stringify(courseName)})">
    <div class="lesson-ico ${clmap[c.Content_Type]||'lic-other'}"><i class="fa-solid ${icmap[c.Content_Type]||'fa-file'}"></i></div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:.9rem">${esc(c.Topic_Title)}</div>
      <div style="font-size:.75rem;color:var(--tx3);margin-top:2px">${esc(c.Content_Type)}</div>
    </div>
    ${done?`<span class="badge badge-success"><i class="fa-solid fa-check"></i> Done</span>`:`<span class="badge badge-gray">Start</span>`}
    <i class="fa-solid fa-chevron-right" style="color:var(--tx3);font-size:.78rem"></i>
  </div>`;
}

function sOpenLesson(c, courseId, courseName) {
  const url  = c._url  || '';
  const mode = c._mode || 'preview';
  const desc = c._desc || '';
  const type = c.Content_Type;

  let bodyHtml = '';

  // Description block
  const descBlock = desc
    ? `<div style="background:var(--surface2);border:1px solid var(--b1);border-radius:var(--r-sm);padding:14px 16px;font-size:.875rem;color:var(--tx2);line-height:1.65;margin-bottom:16px;user-select:none;-webkit-user-select:none">${esc(desc)}</div>`
    : '';

  // Mode handling
  const canPreview  = mode === 'preview' || mode === 'preview-download';
  const canDownload = mode === 'download' || mode === 'preview-download';

  if (!url) {
    bodyHtml = `${descBlock}<div class="empty"><div class="empty-icon">🔗</div><p>No link provided for this lesson.</p></div>`;
  } else if (mode === 'download') {
    // Download only — no preview, just button
    bodyHtml = `${descBlock}
      <div style="text-align:center;padding:32px">
        <div style="width:72px;height:72px;border-radius:20px;background:var(--p-glass);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 16px">⬇</div>
        <p style="color:var(--tx2);margin-bottom:20px;font-size:.88rem">This content is available for download only.</p>
        <a href="${esc(url)}" target="_blank" class="btn btn-primary btn-lg"><i class="fa-solid fa-download"></i> Download</a>
      </div>`;
  } else {
    // Try to embed
    const embed = detectEmbed(url, type);
    if (embed) {
      const isVideo = !!ytEmbed(url);
      const frameH  = isVideo ? '360px' : '480px';
      bodyHtml = `${descBlock}
        <div style="border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--b1);margin-bottom:${canDownload?'14px':'0'}">
          <iframe src="${esc(embed)}" style="width:100%;height:${frameH};border:none;display:block"
            allowfullscreen allow="autoplay;encrypted-media;fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-top-navigation-by-user-activation"></iframe>
        </div>
        ${canDownload ? `<a href="${esc(url)}" target="_blank" class="btn btn-ghost btn-sm"><i class="fa-solid fa-download"></i> Download</a>` : ''}`;
    } else {
      // No embed — show open link + optional download
      bodyHtml = `${descBlock}
        <div style="text-align:center;padding:28px">
          <div style="width:72px;height:72px;border-radius:20px;background:var(--p-glass);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 16px">🔗</div>
          <p style="color:var(--tx2);margin-bottom:20px;font-size:.88rem">Click below to open this resource.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <a href="${esc(url)}" target="_blank" class="btn btn-primary"><i class="fa-solid fa-external-link"></i> Open Resource</a>
            ${canDownload ? `<a href="${esc(url)}" target="_blank" download class="btn btn-ghost"><i class="fa-solid fa-download"></i> Download</a>` : ''}
          </div>
        </div>`;
    }
  }

  const footer = `
    <button class="btn btn-ghost" onclick="closeModal('lesson-modal')">Close</button>
    <button class="btn btn-success" onclick="sMarkDone('${str(c.Content_ID)}','${courseId}','${courseName}')"><i class="fa-solid fa-check"></i> Mark Complete</button>`;

  buildModal('lesson-modal', esc(c.Topic_Title), bodyHtml, footer, true);

  // Apply copy protection to modal content
  setTimeout(() => {
    const modal = document.getElementById('lesson-modal');
    if (modal) enableCopyProtection(modal.querySelector('.modal-body'));
  }, 50);
}

async function sMarkDone(contentId, courseId, courseName) {
  await call('markProgress', { regNo: APP.user.regNo, contentId, status: 'Completed' });
  toast('Marked as complete! 🎉', 'success');
  closeModal('lesson-modal');
  sOpenCourse(courseId, courseName);
}

function sRenderJoin(){
  document.getElementById('s-content').innerHTML=`
  <div class="anim" style="max-width:460px;margin:0 auto">
    <div class="card" style="padding:40px">
      <div style="text-align:center;margin-bottom:30px">
        <div style="width:72px;height:72px;border-radius:20px;background:var(--p-glass);display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 16px;border:1px solid var(--b1)">🔑</div>
        <h2 style="font-size:1.3rem;font-weight:900">Join a Course</h2>
        <p style="font-size:.86rem;color:var(--tx2);margin-top:6px">Enter the Course PIN from your lecturer</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:18px">
        <div class="field"><label>Course PIN</label>
          <input class="input" id="join-pin" style="text-align:center;letter-spacing:8px;font-size:1.4rem;font-weight:800;font-family:var(--ff-mono);text-transform:uppercase" placeholder="ABC123" maxlength="10"/>
        </div>
        <button class="btn btn-primary btn-lg btn-full" id="join-btn" onclick="sJoinCourse()"><i class="fa-solid fa-right-to-bracket"></i> Join Course</button>
      </div>
    </div>
  </div>`;
  document.getElementById('join-pin').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase());
}

async function sJoinCourse(){
  const pin=document.getElementById('join-pin').value.trim().toUpperCase();
  if(!pin){toast('Enter a course PIN.','warning');return;}
  const btn=document.getElementById('join-btn');
  setBtnLoading(btn,true,'Joining...');
  const res=await call('joinCourse',{regNo:APP.user.regNo,pin});
  setBtnLoading(btn,false);
  if(!res.success){toast(res.message,'error');return;}
  toast(`Joined "${res.course.Course_Name}"!`,'success');
  sNav('courses',null);
}

async function sRenderProgress(){
  const[coursesRes,prRes]=await Promise.all([call('getMyCourses',{regNo:APP.user.regNo}),call('getProgress',{regNo:APP.user.regNo})]);
  const courses=coursesRes.courses||[];
  const progMap={};(prRes.progress||[]).forEach(p=>progMap[str(p.Content_ID)]=p.Status);
  let html='';
  for(const c of courses){
    const cr=await call('getCourseContent',{courseId:c.Course_ID});
    const cont=cr.contents||[];
    const done=cont.filter(l=>progMap[str(l.Content_ID)]==='Completed').length;
    const pct=cont.length?Math.round(done/cont.length*100):0;
    html+=`<div class="card" style="padding:22px;margin-bottom:12px"><div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap"><div style="flex:1"><div style="font-weight:800">${esc(c.Course_Name)}</div><div style="font-size:.8rem;color:var(--tx3)">${cont.length} lessons</div></div><span class="badge ${pct===100?'badge-success':'badge-primary'}">${done}/${cont.length} · ${pct}%</span></div><div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
  }
  document.getElementById('s-content').innerHTML=`<div class="anim"><div class="sec-head"><div class="sec-head-info"><h2>My Progress</h2></div></div>${courses.length===0?`<div class="card"><div class="empty"><div class="empty-icon">📈</div><h4>No courses yet</h4></div></div>`:html}</div>`;
}

async function sRenderQuizzes(){
  const cr=await call('getMyCourses',{regNo:APP.user.regNo});
  let all=[];
  for(const c of cr.courses||[]){const r=await call('getQuizzes',{courseId:c.Course_ID});(r.quizzes||[]).forEach(q=>all.push({...q,_cn:c.Course_Name}));}
  document.getElementById('s-content').innerHTML=`<div class="anim"><div class="sec-head"><div class="sec-head-info"><h2>Quizzes</h2><p>${all.length} available</p></div></div>${all.length===0?`<div class="card"><div class="empty"><div class="empty-icon">📝</div><h4>No quizzes yet</h4></div></div>`:`<div style="display:flex;flex-direction:column;gap:10px">${all.map(q=>`<div class="card card-inner" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div class="lesson-ico lic-quiz"><i class="fa-solid fa-clipboard-list"></i></div><div style="flex:1"><div style="font-weight:800">${esc(q.Quiz_Title)}</div><div style="font-size:.78rem;color:var(--tx3)">${esc(q._cn)}${q.Deadline?` · Due: ${fmtDate(q.Deadline)}`:''}</div></div><a href="${esc(q.Google_Form_Link)}" target="_blank" class="btn btn-primary btn-sm"><i class="fa-solid fa-external-link"></i> Open</a></div>`).join('')}</div>`}</div>`;
}

function sRenderSettings(){
  const u=APP.user;
  document.getElementById('s-content').innerHTML=`<div class="anim" style="max-width:560px"><div class="sec-head"><div class="sec-head-info"><h2>Account Settings</h2></div></div><div class="card" style="padding:28px;margin-bottom:16px"><div style="display:flex;align-items:center;gap:16px;margin-bottom:22px"><div class="avatar av-72 av-p">${initials(u.name)}</div><div><div style="font-size:1.05rem;font-weight:900">${esc(u.name)}</div><div style="color:var(--tx3);font-size:.83rem;font-family:var(--ff-mono)">NIC: ${esc(u.regNo)}</div><span class="badge badge-success" style="margin-top:8px"><i class="fa-solid fa-circle" style="font-size:.45rem"></i> Active</span></div></div><div class="divider" style="margin-bottom:20px"></div><h3 style="font-weight:800;font-size:.8rem;text-transform:uppercase;letter-spacing:.07em;color:var(--tx2);margin-bottom:14px">Change PIN</h3><div style="display:flex;flex-direction:column;gap:14px"><div class="field"><label>Current PIN</label><div class="input-wrap"><i class="iico fa-solid fa-lock"></i><input class="input" type="password" id="old-pin" placeholder="Current PIN"/><i class="fa-solid fa-eye input-suffix" onclick="togglePw('old-pin',this)"></i></div></div><div class="field"><label>New PIN</label><div class="input-wrap"><i class="iico fa-solid fa-key"></i><input class="input" type="password" id="new-pin" placeholder="New (min 4)"/><i class="fa-solid fa-eye input-suffix" onclick="togglePw('new-pin',this)"></i></div><div class="pw-strength" id="s-pw-str"><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div></div></div><div class="field"><label>Confirm</label><div class="input-wrap"><i class="iico fa-solid fa-key"></i><input class="input" type="password" id="new-pin2" placeholder="Repeat"/></div></div><button class="btn btn-primary" style="align-self:flex-start" id="chpin-btn" onclick="sChangePin()"><i class="fa-solid fa-save"></i> Update PIN</button></div></div><div class="card" style="padding:20px;display:flex;align-items:center;justify-content:space-between"><div><div style="font-weight:700">Theme</div><div style="font-size:.82rem;color:var(--tx2)">Dark / Light mode</div></div><button class="btn btn-ghost" onclick="toggleTheme()"><i class="fa-solid fa-moon" data-theme-icon></i> Toggle</button></div></div>`;
  renderPwStrength('new-pin','s-pw-str');
}

async function sChangePin(){
  const op=document.getElementById('old-pin').value.trim(),np=document.getElementById('new-pin').value.trim(),cn=document.getElementById('new-pin2').value.trim();
  if(!op||!np){toast('Fill all fields.','warning');return;}
  if(np!==cn){toast('PINs do not match.','error');return;}
  if(np.length<4){toast('Min 4 characters.','warning');return;}
  const btn=document.getElementById('chpin-btn');
  setBtnLoading(btn,true,'Updating...');
  const res=await call('changeStudentPin',{regNo:APP.user.regNo,oldPin:op,newPin:np});
  setBtnLoading(btn,false);
  if(!res.success){toast(res.message,'error');return;}
  toast('PIN updated!','success');
  ['old-pin','new-pin','new-pin2'].forEach(id=>document.getElementById(id).value='');
}
