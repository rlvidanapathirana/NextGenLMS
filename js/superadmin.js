/* NextGenLMS — Super Admin v4 FIXED */
'use strict';

let _saAdmins=[], _saStudents=[], _saCourses=[];

function saNav(section, el) {
  closeSidebar();
  document.querySelectorAll('#sa-sidebar .nav-link').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const titles={dashboard:'Dashboard',lecturers:'Lecturers',students:'Students',courses:'All Courses',logs:'Activity Logs',settings:'Settings'};
  document.getElementById('sa-page-title').textContent=titles[section]||section;
  document.getElementById('sa-content').innerHTML='<div class="page-load"><div class="spin spin-lg"></div></div>';
  ({dashboard:saRenderDashboard,lecturers:saRenderLecturers,students:saRenderStudents,courses:saRenderCourses,logs:saRenderLogs,settings:saRenderSettings}[section]||saRenderDashboard)();
}

window.addEventListener('DOMContentLoaded',()=>{
  const u=APP.user;
  document.getElementById('sa-user-name').textContent=u.name;
  document.getElementById('sa-avatar-text').textContent=initials(u.name);
  saNav('dashboard',document.querySelector('#sa-sidebar .nav-link'));
});

// ── Dashboard ─────────────────────────────────────
async function saRenderDashboard(){
  const[ar,sr,cr]=await Promise.all([call('getAllAdmins',{}),call('getAllStudents',{}),call('getAllCourses',{})]);
  _saAdmins=ar.admins||[]; _saStudents=sr.students||[]; _saCourses=cr.courses||[];
  const pending=_saAdmins.filter(a=>a.Role==='Pending');
  const active=_saAdmins.filter(a=>['Admin','Lecturer'].includes(a.Role));
  const ct=document.getElementById('sa-content');
  ct.innerHTML=`
  <div class="anim">
    <div style="margin-bottom:22px"><h2 style="font-size:1.45rem;font-weight:900;margin-bottom:4px">Super Admin Dashboard</h2><p style="color:var(--tx2);font-size:.87rem">Complete system overview</p></div>
    <div class="grid-4" style="margin-bottom:22px">
      <div class="card stat-card"><div class="stat-ico ic-purple"><i class="fa-solid fa-chalkboard-user"></i></div><div><div class="stat-num">${active.length}</div><div class="stat-label">Lecturers</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-green"><i class="fa-solid fa-users"></i></div><div><div class="stat-num">${_saStudents.length}</div><div class="stat-label">Students</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-teal"><i class="fa-solid fa-book-open"></i></div><div><div class="stat-num">${_saCourses.length}</div><div class="stat-label">Courses</div></div></div>
      <div class="card stat-card" style="${pending.length?'border-color:rgba(255,201,60,.35)':''}"><div class="stat-ico ic-yellow"><i class="fa-solid fa-clock"></i></div><div><div class="stat-num">${pending.length}</div><div class="stat-label">Pending Approvals</div></div></div>
    </div>
    ${pending.length>0?`<div class="card" style="padding:18px 20px;margin-bottom:20px;border-color:rgba(255,201,60,.3)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <i class="fa-solid fa-bell" style="color:var(--warning)"></i>
        <strong>${pending.length} Pending Application${pending.length>1?'s':''}</strong>
        <button class="btn btn-warning btn-sm" style="margin-left:auto" id="sa-review-btn">Review Now</button>
      </div>
      ${pending.slice(0,3).map(a=>`<div style="display:flex;align-items:center;gap:9px;margin-bottom:7px;font-size:.84rem">
        <div class="avatar av-32 av-o">${initials(a.Admin_Name)}</div>
        <span style="font-weight:700">${esc(a.Admin_Name)}</span>
        <span style="color:var(--tx3)">@${esc(a.Admin_Username)}</span>
        <button class="btn btn-success btn-sm approve-btn" style="margin-left:auto" data-id="${esc(a.Admin_ID)}" data-name="${esc(a.Admin_Name)}">Approve</button>
      </div>`).join('')}
    </div>`:''}
    <div class="grid-2">
      <div>
        <div class="sec-head"><div class="sec-head-info"><h2>Recent Courses</h2></div><button class="btn btn-ghost btn-sm" id="sa-all-courses-btn">View All</button></div>
        ${_saCourses.length===0?`<div class="card"><div class="empty" style="padding:28px"><div class="empty-icon">📚</div><p>No courses yet.</p></div></div>`
          :`<div style="display:flex;flex-direction:column;gap:7px">${_saCourses.slice(0,5).map(c=>`<div class="card card-inner-sm" style="display:flex;align-items:center;gap:11px"><div style="font-size:1.2rem">📚</div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.Course_Name)}</div><div style="font-size:.73rem;color:var(--tx3)">PIN: ${esc(c.Course_PIN)}</div></div></div>`).join('')}</div>`}
      </div>
      <div>
        <div class="sec-head"><div class="sec-head-info"><h2>Recent Activity</h2></div><button class="btn btn-ghost btn-sm" id="sa-all-logs-btn">View All</button></div>
        <div class="card" id="dash-logs"><div class="page-load" style="padding:28px"><div class="spin"></div></div></div>
      </div>
    </div>
  </div>`;

  document.getElementById('sa-review-btn')?.addEventListener('click',()=>saNav('lecturers',document.querySelector('#sa-sidebar .nav-link[data-s="lecturers"]')));
  document.getElementById('sa-all-courses-btn')?.addEventListener('click',()=>saNav('courses',null));
  document.getElementById('sa-all-logs-btn')?.addEventListener('click',()=>saNav('logs',null));
  ct.querySelectorAll('.approve-btn').forEach(btn=>btn.addEventListener('click',()=>saApprove(btn.dataset.id,btn.dataset.name)));

  call('getActivityLogs',{}).then(r=>{
    const logs=(r.logs||[]).slice(0,6);
    const el=document.getElementById('dash-logs');
    if(el) el.innerHTML=logs.length===0
      ?`<div class="empty" style="padding:28px"><div class="empty-icon">📋</div><p>No logs yet.</p></div>`
      :logs.map(l=>`<div class="log-row"><div class="log-dot"></div><div style="flex:1"><div class="log-action">${esc(l.Action)}</div><div class="log-user">${esc(String(l.User_ID_Admin_ID))}</div></div><div class="log-time">${fmtDateTime(l.Timestamp)}</div></div>`).join('');
  });
}

// ── Lecturers ─────────────────────────────────────
async function saRenderLecturers(){
  const res=await call('getAllAdmins',{});
  const all=(res.admins||[]).filter(a=>a.Role!=='Super_Admin');
  const pending=all.filter(a=>a.Role==='Pending');
  const active=all.filter(a=>['Admin','Lecturer'].includes(a.Role));
  const disabled=all.filter(a=>a.Role==='Disabled');
  const ct=document.getElementById('sa-content');

  ct.innerHTML=`
  <div class="anim">
    <div class="sec-head">
      <div class="sec-head-info"><h2>Lecturers</h2><p>${active.length} active · ${pending.length} pending · ${disabled.length} disabled</p></div>
      <button class="btn btn-primary btn-sm" id="sa-add-lec"><i class="fa-solid fa-plus"></i> Add Lecturer</button>
    </div>

    ${pending.length>0?`<div style="margin-bottom:18px">
      <div style="font-size:.76rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--warning);margin-bottom:9px"><i class="fa-solid fa-clock"></i> Pending (${pending.length})</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${pending.map(a=>`<div class="card card-inner" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-color:rgba(255,201,60,.3)">
          <div class="avatar av-40 av-o">${initials(a.Admin_Name)}</div>
          <div style="flex:1;min-width:0"><div style="font-weight:800">${esc(a.Admin_Name)}</div><div style="font-size:.79rem;color:var(--tx3)">@${esc(a.Admin_Username)}${a.Admin_Department?` · ${esc(a.Admin_Department)}`:''}</div></div>
          <span class="badge badge-warning">Pending</span>
          <button class="btn btn-success btn-sm approve-btn" data-id="${esc(a.Admin_ID)}" data-name="${esc(a.Admin_Name)}"><i class="fa-solid fa-check"></i> Approve</button>
          <button class="btn btn-primary btn-sm assign-id-btn" data-id="${esc(a.Admin_ID)}" data-name="${esc(a.Admin_Name)}"><i class="fa-solid fa-id-card"></i> Assign ID</button>
          <button class="btn btn-danger btn-sm btn-icon del-lec-btn" data-id="${esc(a.Admin_ID)}" data-name="${esc(a.Admin_Name)}"><i class="fa-solid fa-trash"></i></button>
        </div>`).join('')}
      </div>
    </div>`:''}

    <div style="font-size:.76rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:9px">Active (${active.length})</div>
    <div style="margin-bottom:12px;max-width:300px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input type="search" placeholder="Search lecturers..." id="lec-q"/></div></div>
    <div class="tbl-wrap" style="margin-bottom:18px" id="lec-tbl">
      <table><thead><tr><th>#</th><th>Name</th><th>Username</th><th>Admin ID</th><th>Dept</th><th>Actions</th></tr></thead>
      <tbody>${saLecRows(active)}</tbody></table>
    </div>

    ${disabled.length>0?`<div style="font-size:.76rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--danger);margin-bottom:9px"><i class="fa-solid fa-ban"></i> Disabled (${disabled.length})</div>
    <div class="tbl-wrap" id="dis-lec-tbl">
      <table><thead><tr><th>#</th><th>Name</th><th>Username</th><th>Actions</th></tr></thead>
      <tbody>${saDisLecRows(disabled)}</tbody></table>
    </div>`:''}
  </div>`;

  document.getElementById('sa-add-lec')?.addEventListener('click',saOpenAddLecturer);
  document.getElementById('lec-q')?.addEventListener('input',function(){
    const q=this.value.toLowerCase();
    document.querySelectorAll('#lec-tbl tbody tr').forEach(r=>{r.style.display=q&&!r.textContent.toLowerCase().includes(q)?'none':'';});
  });

  // Event delegation for buttons
  ct.querySelectorAll('.approve-btn').forEach(btn=>btn.addEventListener('click',()=>saApprove(btn.dataset.id,btn.dataset.name)));
  ct.querySelectorAll('.assign-id-btn').forEach(btn=>btn.addEventListener('click',()=>saOpenAssignId(btn.dataset.id,btn.dataset.name)));
  ct.querySelectorAll('.del-lec-btn').forEach(btn=>btn.addEventListener('click',()=>saConfirmDeleteLecturer(btn.dataset.id,btn.dataset.name)));
  ct.querySelectorAll('.disable-lec-btn').forEach(btn=>btn.addEventListener('click',()=>saConfirmDisable(btn.dataset.id,btn.dataset.name)));
  ct.querySelectorAll('.enable-lec-btn').forEach(btn=>btn.addEventListener('click',()=>saEnableLecturer(btn.dataset.id,btn.dataset.name)));
}

function saLecRows(list){
  if(!list.length) return `<tr><td colspan="6"><div class="empty" style="padding:26px"><div class="empty-icon">👤</div><p>No active lecturers.</p></div></td></tr>`;
  return list.map((a,i)=>`<tr>
    <td>${i+1}</td>
    <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar av-32 av-o">${initials(a.Admin_Name)}</div><span style="font-weight:700">${esc(a.Admin_Name)}</span></div></td>
    <td><code style="background:var(--surface2);padding:2px 7px;border-radius:5px;font-size:.76rem">@${esc(a.Admin_Username)}</code></td>
    <td><code style="background:var(--p-glass);color:var(--p);padding:2px 7px;border-radius:5px;font-size:.76rem">${esc(String(a.Admin_ID))}</code></td>
    <td style="color:var(--tx2)">${esc(a.Admin_Department||'—')}</td>
    <td><div style="display:flex;gap:5px;flex-wrap:wrap">
      <button class="btn btn-warning btn-sm disable-lec-btn" data-id="${esc(a.Admin_ID)}" data-name="${esc(a.Admin_Name)}"><i class="fa-solid fa-ban"></i> Disable</button>
      <button class="btn btn-danger btn-sm btn-icon del-lec-btn" data-id="${esc(a.Admin_ID)}" data-name="${esc(a.Admin_Name)}"><i class="fa-solid fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
}

function saDisLecRows(list){
  if(!list.length) return '';
  return list.map((a,i)=>`<tr>
    <td>${i+1}</td>
    <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar av-32" style="background:#888;color:#fff">${initials(a.Admin_Name)}</div><span style="font-weight:700;opacity:.6">${esc(a.Admin_Name)}</span></div></td>
    <td><code style="font-size:.76rem;opacity:.6">@${esc(a.Admin_Username)}</code></td>
    <td><div style="display:flex;gap:5px">
      <button class="btn btn-success btn-sm enable-lec-btn" data-id="${esc(a.Admin_ID)}" data-name="${esc(a.Admin_Name)}"><i class="fa-solid fa-circle-check"></i> Enable</button>
      <button class="btn btn-danger btn-sm btn-icon del-lec-btn" data-id="${esc(a.Admin_ID)}" data-name="${esc(a.Admin_Name)}"><i class="fa-solid fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
}

async function saApprove(id,name){const res=await call('approveLecturer',{superAdminId:APP.user.id,adminId:id});if(!res.success){toast(res.message,'error');return;}toast(`${name} approved!`,'success');saRenderLecturers();}
async function saEnableLecturer(id,name){const res=await call('enableLecturer',{superAdminId:APP.user.id,adminId:id});if(!res.success){toast(res.message,'error');return;}toast(`${name} re-enabled!`,'success');saRenderLecturers();}
function saConfirmDisable(id,name){confirm2('Disable Lecturer',`Disable "${name}"? They cannot log in.`,async()=>{const res=await call('disableLecturer',{superAdminId:APP.user.id,adminId:id});if(!res.success){toast(res.message,'error');return;}toast('Disabled','warning');saRenderLecturers();},{label:'Disable',type:'warning'});}
function saConfirmDeleteLecturer(id,name){confirm2('Remove Lecturer',`Permanently remove "${name}"?`,async()=>{const res=await call('deleteAdmin',{superAdminId:APP.user.id,adminId:id});if(!res.success){toast(res.message,'error');return;}toast('Removed','success');saRenderLecturers();});}

function saOpenAssignId(id,name){
  buildModal('m-aid',`Assign Admin ID — ${esc(name)}`,`
    <p style="font-size:.85rem;color:var(--tx2);line-height:1.6">Assign an Admin ID to approve and activate this lecturer's account.</p>
    <div class="field"><label>Admin ID *</label><input class="input" id="aid-v" placeholder="e.g. LEC_2025_001" style="font-family:var(--ff-mono)"/><span class="hint">Use a meaningful ID (staff no, dept code, etc.)</span></div>
  `,`<button class="btn btn-ghost" id="aid-cancel">Cancel</button><button class="btn btn-primary" id="aid-ok"><i class="fa-solid fa-id-card"></i> Assign & Activate</button>`);
  document.getElementById('aid-cancel')?.addEventListener('click',()=>closeModal('m-aid'));
  document.getElementById('aid-ok')?.addEventListener('click',()=>saDoAssignId(id,name));
}
async function saDoAssignId(id,name){const nid=(document.getElementById('aid-v')?.value||'').trim();if(!nid){toast('Enter an ID','warning');return;}const btn=document.getElementById('aid-ok');setBtnLoading(btn,true,'Assigning...');const res=await call('assignAdminId',{superAdminId:APP.user.id,adminId:id,newAdminId:nid});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast(`${name} activated with ID: ${nid}`,'success');closeModal('m-aid');saRenderLecturers();}

function saOpenAddLecturer(){
  buildModal('m-al','Add Lecturer',`
    <div class="form-grid-2">
      <div class="field"><label>Full Name *</label><div class="input-wrap"><i class="iico fa-solid fa-user"></i><input class="input" id="al-n" placeholder="Dr. Jane"/></div></div>
      <div class="field"><label>Username *</label><div class="input-wrap"><i class="iico fa-solid fa-at"></i><input class="input" id="al-u" placeholder="jsmith"/></div></div>
    </div>
    <div class="form-grid-2">
      <div class="field"><label>Email</label><div class="input-wrap"><i class="iico fa-solid fa-envelope"></i><input class="input" type="email" id="al-e" placeholder="jane@uni.edu"/></div></div>
      <div class="field"><label>Department</label><div class="input-wrap"><i class="iico fa-solid fa-building"></i><input class="input" id="al-d" placeholder="CS / Maths..."/></div></div>
    </div>
    <div class="field"><label>Admin ID *</label><input class="input" id="al-id" placeholder="LEC_2025_001" style="font-family:var(--ff-mono)"/></div>
    <div class="field"><label>Password *</label><div class="input-wrap"><i class="iico fa-solid fa-lock"></i><input class="input" type="password" id="al-p" placeholder="Password"/><i class="fa-solid fa-eye input-suffix" id="al-p-tog"></i></div></div>
  `,`<button class="btn btn-ghost" id="al-cancel">Cancel</button><button class="btn btn-primary" id="al-ok"><i class="fa-solid fa-plus"></i> Add</button>`);
  document.getElementById('al-cancel')?.addEventListener('click',()=>closeModal('m-al'));
  document.getElementById('al-p-tog')?.addEventListener('click',function(){togglePw('al-p',this);});
  document.getElementById('al-ok')?.addEventListener('click',saAddLecturer);
}
async function saAddLecturer(){
  const n=(document.getElementById('al-n')?.value||'').trim();
  const u2=(document.getElementById('al-u')?.value||'').trim();
  const p=(document.getElementById('al-p')?.value||'').trim();
  const id=(document.getElementById('al-id')?.value||'').trim();
  if(!n||!u2||!p||!id){toast('Fill all required fields','warning');return;}
  const btn=document.getElementById('al-ok');setBtnLoading(btn,true,'Adding...');
  const res=await call('addAdmin',{superAdminId:APP.user.id,name:n,username:u2,password:p,role:'Lecturer',email:(document.getElementById('al-e')?.value||'').trim(),department:(document.getElementById('al-d')?.value||'').trim(),customId:id});
  setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Lecturer added!','success');closeModal('m-al');saRenderLecturers();
}

// ── Students ──────────────────────────────────────
async function saRenderStudents(){
  const res=await call('getAllStudents',{});
  _saStudents=res.students||[];
  const ct=document.getElementById('sa-content');
  ct.innerHTML=`
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>Students</h2><p>${_saStudents.length} registered</p></div><button class="btn btn-primary btn-sm" id="sa-add-stud"><i class="fa-solid fa-plus"></i> Add Student</button></div>
    <div style="margin-bottom:13px;max-width:320px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input type="search" placeholder="Search by name, NIC, email..." id="sas-q"/></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Name</th><th>NIC/Reg</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody id="sas-tb">${saStudRows(_saStudents)}</tbody></table></div>
  </div>`;
  document.getElementById('sa-add-stud')?.addEventListener('click',saOpenAddStudent);
  document.getElementById('sas-q')?.addEventListener('input',function(){
    const q=this.value.toLowerCase();
    const f=q?_saStudents.filter(s=>(s.User_Name||'').toLowerCase().includes(q)||String(s.Reg_No).toLowerCase().includes(q)||(s.Email||'').toLowerCase().includes(q)):_saStudents;
    const tb=document.getElementById('sas-tb');if(tb)tb.innerHTML=saStudRows(f);
    _bindStudentBtns(ct);
  });
  _bindStudentBtns(ct);
}

function saStudRows(list){
  if(!list.length) return `<tr><td colspan="6"><div class="empty" style="padding:28px"><div class="empty-icon">👤</div><p>No students.</p></div></td></tr>`;
  return list.map((s,i)=>`<tr>
    <td>${i+1}</td>
    <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar av-32 av-p">${initials(s.User_Name)}</div><span style="font-weight:700">${esc(s.User_Name)}</span></div></td>
    <td><code style="background:var(--surface2);padding:2px 7px;border-radius:5px;font-size:.76rem;font-family:var(--ff-mono)">${esc(String(s.Reg_No))}</code></td>
    <td style="color:var(--tx2)">${esc(s.Email||'—')}</td>
    <td><span class="badge ${s.Account_Status==='Active'?'badge-success':'badge-danger'}">${esc(s.Account_Status||'Active')}</span></td>
    <td><div style="display:flex;gap:5px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm toggle-stud" data-reg="${esc(String(s.Reg_No))}" data-status="${esc(s.Account_Status||'Active')}">
        <i class="fa-solid fa-toggle-${s.Account_Status==='Active'?'on':'off'}"></i> ${s.Account_Status==='Active'?'Disable':'Enable'}
      </button>
      <button class="btn btn-danger btn-sm btn-icon del-stud" data-reg="${esc(String(s.Reg_No))}" data-name="${esc(s.User_Name)}"><i class="fa-solid fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
}

function _bindStudentBtns(ct){
  ct.querySelectorAll('.toggle-stud').forEach(btn=>btn.addEventListener('click',()=>saToggleStudent(btn.dataset.reg,btn.dataset.status)));
  ct.querySelectorAll('.del-stud').forEach(btn=>btn.addEventListener('click',()=>saConfirmDeleteStudent(btn.dataset.reg,btn.dataset.name)));
}

function saOpenAddStudent(){
  buildModal('m-ns','Add New Student',`
    <div class="form-grid-2">
      <div class="field"><label>Full Name *</label><input class="input" id="ns-n" placeholder="John Perera"/></div>
      <div class="field"><label>NIC / Passport *</label><input class="input" id="ns-nc" placeholder="200012345678"/></div>
    </div>
    <div class="form-grid-2">
      <div class="field"><label>Email</label><input class="input" type="email" id="ns-e" placeholder="student@email.com"/></div>
      <div class="field"><label>PIN *</label><input class="input" id="ns-p" placeholder="Login PIN (min 4)"/></div>
    </div>
  `,`<button class="btn btn-ghost" id="ns-cancel">Cancel</button><button class="btn btn-primary" id="ns-ok"><i class="fa-solid fa-plus"></i> Add</button>`);
  document.getElementById('ns-cancel')?.addEventListener('click',()=>closeModal('m-ns'));
  document.getElementById('ns-ok')?.addEventListener('click',saAddStudent);
}
async function saAddStudent(){
  const n=(document.getElementById('ns-n')?.value||'').trim();
  const nc=(document.getElementById('ns-nc')?.value||'').trim();
  const p=(document.getElementById('ns-p')?.value||'').trim();
  if(!n||!nc||!p){toast('Fill required fields','warning');return;}
  const btn=document.getElementById('ns-ok');setBtnLoading(btn,true,'Adding...');
  const res=await call('addStudent',{superAdminId:APP.user.id,name:n,nic:nc,email:(document.getElementById('ns-e')?.value||'').trim(),pin:p});
  setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Student added!','success');closeModal('m-ns');saRenderStudents();
}
async function saToggleStudent(regNo){const res=await call('toggleStudentStatus',{superAdminId:APP.user.id,regNo});if(!res.success){toast(res.message,'error');return;}toast(`Student ${res.newStatus.toLowerCase()}`,'success');saRenderStudents();}
function saConfirmDeleteStudent(regNo,name){confirm2('Delete Student',`Permanently delete "${name}" (${regNo})?`,async()=>{const res=await call('deleteStudent',{superAdminId:APP.user.id,regNo});if(!res.success){toast(res.message,'error');return;}toast('Deleted','success');saRenderStudents();});}

// ── Courses ───────────────────────────────────────
async function saRenderCourses(){
  const[cr,ar]=await Promise.all([call('getAllCourses',{}),call('getAllAdmins',{})]);
  _saCourses=cr.courses||[];
  const lecs=(ar.admins||[]).filter(a=>['Admin','Lecturer'].includes(a.Role));
  const ct=document.getElementById('sa-content');
  ct.innerHTML=`
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>All Courses</h2><p>${_saCourses.length} total</p></div><button class="btn btn-primary btn-sm" id="sa-new-course"><i class="fa-solid fa-plus"></i> Create Course</button></div>
    <div style="margin-bottom:13px;max-width:320px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input type="search" placeholder="Search courses..." id="sac-q"/></div></div>
    <div class="tbl-wrap">
      <table><thead><tr><th>#</th><th>Course</th><th>PIN</th><th>Created By</th><th>Assign To</th><th>Students</th><th>Actions</th></tr></thead>
      <tbody id="sac-tb">${saCourseRows(_saCourses,lecs)}</tbody></table>
    </div>
  </div>`;
  document.getElementById('sa-new-course')?.addEventListener('click',saOpenCreateCourse);
  document.getElementById('sac-q')?.addEventListener('input',function(){
    const q=this.value.toLowerCase();
    const f=q?_saCourses.filter(c=>c.Course_Name.toLowerCase().includes(q)||(c.creatorName||'').toLowerCase().includes(q)||(c.Course_PIN||'').toLowerCase().includes(q)):_saCourses;
    const tb=document.getElementById('sac-tb');if(tb){tb.innerHTML=saCourseRows(f,lecs);_bindCourseBtns(ct);}
  });
  _bindCourseBtns(ct);
}

function saCourseRows(list,lecs){
  if(!list.length) return `<tr><td colspan="7"><div class="empty" style="padding:28px"><div class="empty-icon">📚</div><p>No courses.</p></div></td></tr>`;
  return list.map((c,i)=>`<tr>
    <td>${i+1}</td>
    <td style="font-weight:700;color:var(--p);cursor:pointer" class="sa-view-course" data-id="${esc(c.Course_ID)}" data-name="${esc(c.Course_Name)}">${esc(c.Course_Name)}</td>
    <td><div style="display:flex;align-items:center;gap:5px"><span class="course-pin">${esc(c.Course_PIN)}</span><button class="btn btn-ghost btn-sm copy-pin-btn" data-pin="${esc(c.Course_PIN)}" data-name="${esc(c.Course_Name)}" style="padding:3px 7px"><i class="fa-regular fa-copy"></i></button></div></td>
    <td style="color:var(--tx2)">${esc(c.creatorName||'—')}</td>
    <td><div style="display:flex;gap:5px;align-items:center">
      <select class="select" id="asgn-${esc(c.Course_ID)}" style="min-width:120px;padding:6px 8px;font-size:.78rem">
        <option value="">Select...</option>
        ${(lecs||[]).map(l=>`<option value="${esc(l.Admin_ID)}">${esc(l.Admin_Name)}</option>`).join('')}
      </select>
      <button class="btn btn-success btn-sm assign-course-btn" data-id="${esc(c.Course_ID)}"><i class="fa-solid fa-share"></i></button>
    </div></td>
    <td><button class="btn btn-primary btn-sm view-course-stud" data-id="${esc(c.Course_ID)}" data-name="${esc(c.Course_Name)}"><i class="fa-solid fa-users"></i></button></td>
    <td><div style="display:flex;gap:4px">
      <button class="btn btn-ghost btn-sm btn-icon edit-course-btn" data-id="${esc(c.Course_ID)}" data-name="${esc(c.Course_Name)}"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-danger btn-sm btn-icon del-course-btn" data-id="${esc(c.Course_ID)}" data-name="${esc(c.Course_Name)}"><i class="fa-solid fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
}

function _bindCourseBtns(ct){
  ct.querySelectorAll('.copy-pin-btn').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();copyToClipboard(btn.dataset.pin,`PIN for "${btn.dataset.name}"`)}));
  ct.querySelectorAll('.sa-view-course,.view-course-stud').forEach(el=>el.addEventListener('click',()=>saViewCourseStudents(el.dataset.id,el.dataset.name)));
  ct.querySelectorAll('.assign-course-btn').forEach(btn=>btn.addEventListener('click',()=>saAssignCourse(btn.dataset.id)));
  ct.querySelectorAll('.edit-course-btn').forEach(btn=>btn.addEventListener('click',()=>saOpenEditCourse(btn.dataset.id,btn.dataset.name)));
  ct.querySelectorAll('.del-course-btn').forEach(btn=>btn.addEventListener('click',()=>saConfirmDeleteCourse(btn.dataset.id,btn.dataset.name)));
}

function saOpenCreateCourse(){
  buildModal('m-sacc','Create Course',`<div class="field"><label>Name *</label><input class="input" id="sacc-n" placeholder="Course name"/></div><div class="field"><label>Description</label><textarea class="textarea" id="sacc-d"></textarea></div><div class="field"><label>Thumbnail URL</label><input class="input" id="sacc-t" placeholder="https://..."/></div>`,`<button class="btn btn-ghost" id="sacc-cancel">Cancel</button><button class="btn btn-primary" id="sacc-ok"><i class="fa-solid fa-plus"></i> Create</button>`);
  document.getElementById('sacc-cancel')?.addEventListener('click',()=>closeModal('m-sacc'));
  document.getElementById('sacc-ok')?.addEventListener('click',saCreateCourse);
}
async function saCreateCourse(){
  const n=(document.getElementById('sacc-n')?.value||'').trim();if(!n){toast('Name required','warning');return;}
  const btn=document.getElementById('sacc-ok');setBtnLoading(btn,true,'Creating...');
  const res=await call('createCourse',{adminId:APP.user.id,name:n,description:(document.getElementById('sacc-d')?.value||'').trim(),thumbnail:(document.getElementById('sacc-t')?.value||'').trim()});
  setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast(`Created! PIN: ${res.pin}`,'success',6000);closeModal('m-sacc');saRenderCourses();
}
async function saAssignCourse(cid){
  const aid=document.getElementById(`asgn-${cid}`)?.value;if(!aid){toast('Select a lecturer','warning');return;}
  const res=await call('assignCourse',{superAdminId:APP.user.id,courseId:cid,adminId:aid});
  if(!res.success){toast(res.message,'error');return;}toast('Course assigned!','success');
}
function saOpenEditCourse(cid,name){
  const course=_saCourses.find(c=>str(c.Course_ID)===str(cid));
  buildModal('m-sa-ec','Edit Course',`<div class="field"><label>Name *</label><input class="input" id="saec-n" value="${esc(course?.Course_Name||name)}"/></div><div class="field"><label>Description</label><textarea class="textarea" id="saec-d">${esc(course?.Course_Description||'')}</textarea></div><div class="field"><label>Thumbnail URL</label><input class="input" id="saec-t" value="${esc(course?.Thumbnail_URL||'')}"/></div>`,`<button class="btn btn-ghost" id="saec-cancel">Cancel</button><button class="btn btn-primary" id="saec-ok"><i class="fa-solid fa-save"></i> Save</button>`);
  document.getElementById('saec-cancel')?.addEventListener('click',()=>closeModal('m-sa-ec'));
  document.getElementById('saec-ok')?.addEventListener('click',()=>saUpdateCourse(cid));
}
async function saUpdateCourse(cid){
  const btn=document.getElementById('saec-ok');setBtnLoading(btn,true,'Saving...');
  const res=await call('updateCourse',{adminId:APP.user.id,role:APP.user.role,courseId:cid,name:(document.getElementById('saec-n')?.value||'').trim(),description:(document.getElementById('saec-d')?.value||'').trim(),thumbnail:(document.getElementById('saec-t')?.value||'').trim()});
  setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Updated!','success');closeModal('m-sa-ec');saRenderCourses();
}
function saConfirmDeleteCourse(cid,name){confirm2('Delete Course',`Delete "${name}"?`,async()=>{const res=await call('deleteCourse',{adminId:APP.user.id,role:APP.user.role,courseId:cid});if(!res.success){toast(res.message,'error');return;}toast('Deleted','success');saRenderCourses();});}

// ── Course Students ───────────────────────────────
async function saViewCourseStudents(courseId,courseName){
  const ct=document.getElementById('sa-content');
  document.getElementById('sa-page-title').textContent=courseName+' — Students';
  ct.innerHTML='<div class="page-load"><div class="spin spin-lg"></div></div>';
  const[sr,cr]=await Promise.all([call('getCourseStudents',{courseId}),call('getCourseContent',{courseId})]);
  const students=sr.students||[],contents=cr.contents||[];
  ct.innerHTML=`
  <div class="anim">
    <div style="display:flex;align-items:center;gap:11px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" id="sa-cstud-back"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div style="flex:1;min-width:0"><h2 style="font-size:1.1rem;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(courseName)}</h2><p style="font-size:.74rem;color:var(--tx3)">${students.length} enrolled · ${contents.length} lessons</p></div>
    </div>
    <div class="grid-3" style="margin-bottom:20px">
      <div class="card stat-card"><div class="stat-ico ic-green"><i class="fa-solid fa-users"></i></div><div><div class="stat-num">${students.length}</div><div class="stat-label">Students</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-purple"><i class="fa-solid fa-layer-group"></i></div><div><div class="stat-num">${contents.length}</div><div class="stat-label">Lessons</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-teal"><i class="fa-solid fa-chart-line"></i></div><div><div class="stat-num">—</div><div class="stat-label">Avg Progress</div></div></div>
    </div>
    <div class="sec-head">
      <div class="sec-head-info"><h2>Enrolled Students</h2></div>
      <div style="max-width:260px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input type="search" placeholder="Search students..." id="cs-q"/></div></div>
    </div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Student</th><th>NIC/Reg</th><th>Email</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
    <tbody id="cs-tb">${saCourseStudRows(students,courseId,courseName)}</tbody></table></div>
  </div>`;

  document.getElementById('sa-cstud-back')?.addEventListener('click',()=>saNav('courses',null));
  document.getElementById('cs-q')?.addEventListener('input',function(){
    const q=this.value.toLowerCase();
    const f=q?students.filter(s=>(s.User_Name||'').toLowerCase().includes(q)||String(s.Reg_No).toLowerCase().includes(q)):students;
    const tb=document.getElementById('cs-tb');if(tb){tb.innerHTML=saCourseStudRows(f,courseId,courseName);_bindCourseStudBtns(ct,courseId,courseName);}
  });
  _bindCourseStudBtns(ct,courseId,courseName);
}

function saCourseStudRows(list,courseId,courseName){
  if(!list.length) return `<tr><td colspan="7"><div class="empty" style="padding:28px"><div class="empty-icon">👥</div><p>No students enrolled.</p></div></td></tr>`;
  return list.map((s,i)=>`<tr>
    <td>${i+1}</td>
    <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar av-32 av-p">${initials(s.User_Name)}</div><span style="font-weight:700">${esc(s.User_Name)}</span></div></td>
    <td><code style="background:var(--surface2);padding:2px 7px;border-radius:5px;font-size:.76rem;font-family:var(--ff-mono)">${esc(String(s.Reg_No))}</code></td>
    <td style="color:var(--tx2)">${esc(s.Email||'—')}</td>
    <td style="color:var(--tx3)">${fmtDate(s.joinedDate)}</td>
    <td><span class="badge ${s.Account_Status==='Active'?'badge-success':'badge-danger'}">${esc(s.Account_Status||'Active')}</span></td>
    <td><button class="btn btn-danger btn-sm remove-course-stud" data-eid="${esc(s.enrollmentId)}" data-name="${esc(s.User_Name)}"><i class="fa-solid fa-user-minus"></i> Remove</button></td>
  </tr>`).join('');
}

function _bindCourseStudBtns(ct,courseId,courseName){
  ct.querySelectorAll('.remove-course-stud').forEach(btn=>btn.addEventListener('click',()=>{
    confirm2('Remove Student',`Remove "${btn.dataset.name}" from "${courseName}"?`,async()=>{
      const res=await call('removeStudent',{adminId:APP.user.id,enrollmentId:btn.dataset.eid,courseId});
      if(!res.success){toast(res.message,'error');return;}toast('Removed','success');saViewCourseStudents(courseId,courseName);
    },{label:'Remove',type:'danger'});
  }));
}

// ── Logs ──────────────────────────────────────────
async function saRenderLogs(){
  const res=await call('getActivityLogs',{});const logs=res.logs||[];
  document.getElementById('sa-content').innerHTML=`
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>Activity Logs</h2><p>Last ${logs.length} actions</p></div></div>
    <div class="card" style="overflow:hidden">
      ${logs.length===0?`<div class="empty"><div class="empty-icon">📋</div><h4>No logs</h4></div>`
        :logs.map(l=>`<div class="log-row"><div class="log-dot"></div><div style="flex:1"><div class="log-action">${esc(l.Action)}</div><div class="log-user">${esc(String(l.User_ID_Admin_ID))}</div></div><div class="log-time">${fmtDateTime(l.Timestamp)}</div></div>`).join('')}
    </div>
  </div>`;
}

// ── Settings ──────────────────────────────────────
function saRenderSettings(){
  const u=APP.user;
  const ct=document.getElementById('sa-content');
  ct.innerHTML=`
  <div class="anim" style="max-width:540px">
    <div class="sec-head"><div class="sec-head-info"><h2>Settings</h2></div></div>
    <div class="card" style="padding:26px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:15px;margin-bottom:20px">
        <div class="avatar av-72" style="background:linear-gradient(135deg,#f97316,#ef4444);color:#fff">${initials(u.name)}</div>
        <div><div style="font-size:1rem;font-weight:900">${esc(u.name)}</div><div style="color:var(--tx3);font-size:.82rem">Super Administrator</div><span class="badge badge-warning" style="margin-top:7px"><i class="fa-solid fa-crown"></i> Super Admin</span></div>
      </div>
      <div class="divider" style="margin-bottom:18px"></div>
      <h3 style="font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.07em;color:var(--tx2);margin-bottom:14px">Change Password</h3>
      <div style="display:flex;flex-direction:column;gap:13px">
        <div class="field"><label>Current Password</label><div class="input-wrap"><i class="iico fa-solid fa-lock"></i><input class="input" type="password" id="sa-op" autocomplete="current-password"/></div></div>
        <div class="field"><label>New Password</label><div class="input-wrap"><i class="iico fa-solid fa-key"></i><input class="input" type="password" id="sa-np" autocomplete="new-password"/></div><div class="pw-strength" id="sa-pw-str"><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div></div></div>
        <div class="field"><label>Confirm</label><div class="input-wrap"><i class="iico fa-solid fa-key"></i><input class="input" type="password" id="sa-np2" autocomplete="new-password"/></div></div>
        <button class="btn btn-primary" style="align-self:flex-start" id="sa-chpw"><i class="fa-solid fa-save"></i> Update</button>
      </div>
    </div>
    <div class="card" style="padding:18px;display:flex;align-items:center;justify-content:space-between;gap:14px">
      <div><div style="font-weight:700">Theme</div><div style="font-size:.81rem;color:var(--tx2)">Dark / Light mode</div></div>
      <button class="btn btn-ghost" id="sa-theme-btn"><i class="fa-solid fa-moon" data-theme-icon></i> Toggle</button>
    </div>
  </div>`;
  document.getElementById('sa-chpw')?.addEventListener('click',saChangePw);
  document.getElementById('sa-theme-btn')?.addEventListener('click',toggleTheme);
  renderPwStrength('sa-np','sa-pw-str');
  _syncTheme(document.documentElement.getAttribute('data-theme')||'light');
}
async function saChangePw(){
  const op=(document.getElementById('sa-op')?.value||'').trim(),np=(document.getElementById('sa-np')?.value||'').trim(),c2=(document.getElementById('sa-np2')?.value||'').trim();
  if(!op||!np){toast('Fill all fields','warning');return;}if(np!==c2){toast('No match','error');return;}if(np.length<6){toast('Min 6 chars','warning');return;}
  const btn=document.getElementById('sa-chpw');setBtnLoading(btn,true,'Updating...');
  const res=await call('changeAdminPassword',{adminId:APP.user.id,oldPassword:op,newPassword:np});
  setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Updated!','success');
}
