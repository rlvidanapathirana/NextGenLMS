/* NextGenLMS — Super Admin App v3 */

let _saStudents=[], _saAdmins=[], _saCourses=[];

function saNav(section, el) {
  closeSidebar();
  document.querySelectorAll('#sa-sidebar .nav-link').forEach(n=>n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles={dashboard:'Dashboard',lecturers:'Lecturers',students:'Students',courses:'All Courses',logs:'Activity Logs',settings:'Settings'};
  document.getElementById('sa-page-title').textContent=titles[section]||section;
  document.getElementById('sa-content').innerHTML=`<div class="page-load"><div class="spin spin-lg"></div></div>`;
  ({dashboard:saRenderDashboard,lecturers:saRenderLecturers,students:saRenderStudents,courses:saRenderCourses,logs:saRenderLogs,settings:saRenderSettings}[section]||saRenderDashboard)();
}

window.addEventListener('DOMContentLoaded',()=>{
  const u=APP.user;
  document.getElementById('sa-user-name').textContent=u.name;
  document.getElementById('sa-avatar-text').textContent=initials(u.name);
  saNav('dashboard',document.querySelector('#sa-sidebar .nav-link'));
});

async function saRenderDashboard(){
  const [ar,sr,cr]=await Promise.all([call('getAllAdmins',{}),call('getAllStudents',{}),call('getAllCourses',{})]);
  _saAdmins=ar.admins||[]; _saStudents=sr.students||[]; _saCourses=cr.courses||[];
  const pending=_saAdmins.filter(a=>a.Role==='Pending');
  const active=_saAdmins.filter(a=>['Admin','Lecturer'].includes(a.Role));
  document.getElementById('sa-content').innerHTML=`
  <div class="anim">
    <div style="margin-bottom:26px"><h2 style="font-size:1.5rem;font-weight:900;margin-bottom:5px">Super Admin Dashboard</h2><p style="color:var(--tx2);font-size:.88rem">Complete system overview — NextGenLMS</p></div>
    <div class="grid-4" style="margin-bottom:26px">
      <div class="card stat-card"><div class="stat-ico ic-purple"><i class="fa-solid fa-chalkboard-user"></i></div><div><div class="stat-num">${active.length}</div><div class="stat-label">Active Lecturers</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-green"><i class="fa-solid fa-users"></i></div><div><div class="stat-num">${_saStudents.length}</div><div class="stat-label">Total Students</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-teal"><i class="fa-solid fa-book-open"></i></div><div><div class="stat-num">${_saCourses.length}</div><div class="stat-label">Total Courses</div></div></div>
      <div class="card stat-card" style="${pending.length?'border-color:rgba(255,201,60,.3)':''}"><div class="stat-ico ic-yellow ${pending.length?'pulse':''}"><i class="fa-solid fa-clock"></i></div><div><div class="stat-num">${pending.length}</div><div class="stat-label">Pending Approvals</div></div></div>
    </div>
    ${pending.length>0?`
    <div class="card" style="padding:20px;margin-bottom:22px;border-color:rgba(255,201,60,.3);background:rgba(255,201,60,.04)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <i class="fa-solid fa-bell" style="color:var(--warning)"></i>
        <strong>${pending.length} Pending Lecturer Application${pending.length>1?'s':''}</strong>
        <button class="btn btn-warning btn-sm" style="margin-left:auto" onclick="saNav('lecturers',null)">Review Now</button>
      </div>
      ${pending.slice(0,3).map(a=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:.85rem"><div class="avatar av-32 av-o">${initials(a.Admin_Name)}</div><span style="font-weight:700">${esc(a.Admin_Name)}</span><span style="color:var(--tx3)">@${esc(a.Admin_Username)}</span><button class="btn btn-success btn-sm" style="margin-left:auto" onclick="saApprove('${esc(a.Admin_ID)}','${esc(a.Admin_Name)}')"><i class="fa-solid fa-check"></i> Approve</button></div>`).join('')}
    </div>`:``}
    <div class="grid-2">
      <div>
        <div class="sec-head"><div class="sec-head-info"><h2>Recent Courses</h2></div><button class="btn btn-ghost btn-sm" onclick="saNav('courses',null)">View All</button></div>
        ${_saCourses.length===0?`<div class="card"><div class="empty" style="padding:30px"><div class="empty-icon">📚</div><p>No courses yet.</p></div></div>`
          :`<div style="display:flex;flex-direction:column;gap:8px">${_saCourses.slice(0,5).map(c=>`<div class="card card-inner-sm" style="display:flex;align-items:center;gap:12px"><div style="font-size:1.3rem">📚</div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.87rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.Course_Name)}</div><div style="font-size:.74rem;color:var(--tx3)">${esc(c.creatorName||'—')} · PIN: ${esc(c.Course_PIN)}</div></div></div>`).join('')}</div>`}
      </div>
      <div>
        <div class="sec-head"><div class="sec-head-info"><h2>Recent Activity</h2></div><button class="btn btn-ghost btn-sm" onclick="saNav('logs',null)">View All</button></div>
        <div class="card" id="dash-logs"><div class="page-load" style="padding:30px"><div class="spin"></div></div></div>
      </div>
    </div>
  </div>`;
  call('getActivityLogs',{}).then(r=>{
    const logs=(r.logs||[]).slice(0,6);
    document.getElementById('dash-logs').innerHTML=logs.length===0
      ?`<div class="empty" style="padding:30px"><div class="empty-icon">📋</div><p>No logs yet.</p></div>`
      :logs.map(l=>`<div class="log-row"><div class="log-dot"></div><div style="flex:1"><div class="log-action">${esc(l.Action)}</div><div class="log-user">${esc(String(l.User_ID_Admin_ID))}</div></div><div class="log-time">${fmtDateTime(l.Timestamp)}</div></div>`).join('');
  });
}

async function saRenderLecturers(){
  const res=await call('getAllAdmins',{});
  const all=(res.admins||[]).filter(a=>a.Role!=='Super_Admin');
  const pending=all.filter(a=>a.Role==='Pending');
  const active=all.filter(a=>['Admin','Lecturer'].includes(a.Role));
  const disabled=all.filter(a=>a.Role==='Disabled');
  document.getElementById('sa-content').innerHTML=`
  <div class="anim">
    <div class="sec-head">
      <div class="sec-head-info"><h2>Lecturers</h2><p>${active.length} active · ${pending.length} pending · ${disabled.length} disabled</p></div>
      <button class="btn btn-primary btn-sm" onclick="saOpenAddLecturer()"><i class="fa-solid fa-plus"></i> Add Lecturer</button>
    </div>
    ${pending.length>0?`
    <div style="margin-bottom:20px">
      <div style="font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--warning);margin-bottom:10px"><i class="fa-solid fa-clock"></i> Pending Approvals (${pending.length})</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${pending.map(a=>`<div class="card card-inner" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-color:rgba(255,201,60,.3)">
          <div class="avatar av-40 av-o">${initials(a.Admin_Name)}</div>
          <div style="flex:1;min-width:0"><div style="font-weight:800">${esc(a.Admin_Name)}</div><div style="font-size:.8rem;color:var(--tx3)">@${esc(a.Admin_Username)}${a.Admin_Department?` · ${esc(a.Admin_Department)}`:''}</div></div>
          <span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Pending</span>
          <button class="btn btn-success btn-sm" onclick="saApprove('${esc(a.Admin_ID)}','${esc(a.Admin_Name)}')"><i class="fa-solid fa-check"></i> Approve</button>
          <button class="btn btn-primary btn-sm" onclick="saOpenAssignId('${esc(a.Admin_ID)}','${esc(a.Admin_Name)}')"><i class="fa-solid fa-id-card"></i> Assign ID</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="saConfirmDeleteLecturer('${esc(a.Admin_ID)}','${esc(a.Admin_Name)}')"><i class="fa-solid fa-trash"></i></button>
        </div>`).join('')}
      </div>
    </div>`:``}
    <div style="font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:10px">Active Lecturers (${active.length})</div>
    <div style="margin-bottom:12px;max-width:320px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input placeholder="Search lecturers..." id="lec-q" oninput="saFilterLecturers()"/></div></div>
    <div class="tbl-wrap" style="margin-bottom:20px" id="lec-tbl">
      <table><thead><tr><th>#</th><th>Name</th><th>Username</th><th>Admin ID</th><th>Dept</th><th>Actions</th></tr></thead>
      <tbody>
        ${active.length===0?`<tr><td colspan="6"><div class="empty" style="padding:30px"><div class="empty-icon">👤</div><p>No active lecturers.</p></div></td></tr>`
          :active.map((a,i)=>`<tr>
            <td>${i+1}</td>
            <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar av-32 av-o">${initials(a.Admin_Name)}</div><span style="font-weight:700">${esc(a.Admin_Name)}</span></div></td>
            <td><code style="background:var(--surface2);padding:2px 8px;border-radius:5px;font-size:.78rem">@${esc(a.Admin_Username)}</code></td>
            <td><code style="background:var(--p-glass);color:var(--p);padding:2px 8px;border-radius:5px;font-size:.78rem">${esc(String(a.Admin_ID))}</code></td>
            <td style="color:var(--tx2)">${esc(a.Admin_Department||'—')}</td>
            <td><div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-warning btn-sm" onclick="saConfirmDisable('${esc(a.Admin_ID)}','${esc(a.Admin_Name)}')"><i class="fa-solid fa-ban"></i> Disable</button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="saConfirmDeleteLecturer('${esc(a.Admin_ID)}','${esc(a.Admin_Name)}')"><i class="fa-solid fa-trash"></i></button>
            </div></td>
          </tr>`).join('')}
      </tbody></table>
    </div>
    ${disabled.length>0?`
    <div style="font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--danger);margin-bottom:10px"><i class="fa-solid fa-ban"></i> Disabled (${disabled.length})</div>
    <div class="tbl-wrap">
      <table><thead><tr><th>#</th><th>Name</th><th>Username</th><th>Actions</th></tr></thead>
      <tbody>${disabled.map((a,i)=>`<tr>
        <td>${i+1}</td>
        <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar av-32" style="background:#888;color:#fff">${initials(a.Admin_Name)}</div><span style="opacity:.6;font-weight:700">${esc(a.Admin_Name)}</span></div></td>
        <td><code style="font-size:.78rem;opacity:.6">@${esc(a.Admin_Username)}</code></td>
        <td><div style="display:flex;gap:6px">
          <button class="btn btn-success btn-sm" onclick="saEnableLecturer('${esc(a.Admin_ID)}','${esc(a.Admin_Name)}')"><i class="fa-solid fa-circle-check"></i> Enable</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="saConfirmDeleteLecturer('${esc(a.Admin_ID)}','${esc(a.Admin_Name)}')"><i class="fa-solid fa-trash"></i></button>
        </div></td>
      </tr>`).join('')}</tbody></table>
    </div>`:``}
  </div>`;
}

async function saApprove(id,name){const res=await call('approveLecturer',{superAdminId:APP.user.id,adminId:id});if(!res.success){toast(res.message,'error');return;}toast(`${name} approved!`,'success');saRenderLecturers();}

function saFilterLecturers() {
  const q = document.getElementById('lec-q')?.value.toLowerCase() || '';
  Array.from(document.querySelectorAll('#lec-tbl tbody tr')).forEach(row => {
    row.style.display = q && !row.textContent.toLowerCase().includes(q) ? 'none' : '';
  });
}
async function saEnableLecturer(id,name){const res=await call('enableLecturer',{superAdminId:APP.user.id,adminId:id});if(!res.success){toast(res.message,'error');return;}toast(`${name} re-enabled!`,'success');saRenderLecturers();}
function saConfirmDisable(id,name){confirm2('Disable Lecturer',`Disable "${name}"? They cannot log in.`,async()=>{const res=await call('disableLecturer',{superAdminId:APP.user.id,adminId:id});if(!res.success){toast(res.message,'error');return;}toast('Disabled','warning');saRenderLecturers();},{label:'Disable',type:'warning'});}
function saConfirmDeleteLecturer(id,name){confirm2('Remove Lecturer',`Permanently remove "${name}"?`,async()=>{const res=await call('deleteAdmin',{superAdminId:APP.user.id,adminId:id});if(!res.success){toast(res.message,'error');return;}toast('Removed','success');saRenderLecturers();});}
function saOpenAssignId(id,name){buildModal('m-aid',`Assign Admin ID — ${name}`,`<p style="font-size:.85rem;color:var(--tx2);line-height:1.6">Assign an Admin ID to approve and activate this lecturer's account.</p><div class="field"><label>Admin ID *</label><input class="input" id="aid-v" placeholder="e.g. LEC_2025_001" style="font-family:var(--ff-mono)"/><span class="hint">Use a meaningful ID (staff no, dept code, etc.)</span></div>`,`<button class="btn btn-ghost" onclick="closeModal('m-aid')">Cancel</button><button class="btn btn-primary" id="aid-btn" onclick="saDoAssignId('${esc(id)}','${esc(name)}')"><i class="fa-solid fa-id-card"></i> Assign & Activate</button>`);}
async function saDoAssignId(id,name){const nid=document.getElementById('aid-v').value.trim();if(!nid){toast('Enter an ID','warning');return;}const btn=document.getElementById('aid-btn');setBtnLoading(btn,true,'Assigning...');const res=await call('assignAdminId',{superAdminId:APP.user.id,adminId:id,newAdminId:nid});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast(`${name} activated with ID: ${nid}`,'success');closeModal('m-aid');saRenderLecturers();}
function saOpenAddLecturer(){buildModal('m-al','Add Lecturer',`<div class="form-grid-2"><div class="field"><label>Full Name *</label><div class="input-wrap"><i class="iico fa-solid fa-user"></i><input class="input" id="al-n" placeholder="Dr. Jane"/></div></div><div class="field"><label>Username *</label><div class="input-wrap"><i class="iico fa-solid fa-at"></i><input class="input" id="al-u" placeholder="jsmith"/></div></div></div><div class="form-grid-2"><div class="field"><label>Email</label><div class="input-wrap"><i class="iico fa-solid fa-envelope"></i><input class="input" type="email" id="al-e" placeholder="jane@uni.edu"/></div></div><div class="field"><label>Department</label><div class="input-wrap"><i class="iico fa-solid fa-building"></i><input class="input" id="al-d" placeholder="CS, Maths..."/></div></div></div><div class="field"><label>Admin ID *</label><input class="input" id="al-id" placeholder="LEC_2025_001" style="font-family:var(--ff-mono)"/></div><div class="field"><label>Password *</label><div class="input-wrap"><i class="iico fa-solid fa-lock"></i><input class="input" type="password" id="al-p" placeholder="Password"/><i class="fa-solid fa-eye input-suffix" onclick="togglePw('al-p',this)"></i></div></div>`,`<button class="btn btn-ghost" onclick="closeModal('m-al')">Cancel</button><button class="btn btn-primary" id="al-btn" onclick="saAddLecturer()"><i class="fa-solid fa-plus"></i> Add</button>`);}
async function saAddLecturer(){const n=document.getElementById('al-n').value.trim(),u2=document.getElementById('al-u').value.trim(),p=document.getElementById('al-p').value.trim(),id=document.getElementById('al-id').value.trim();if(!n||!u2||!p||!id){toast('Fill all required fields','warning');return;}const btn=document.getElementById('al-btn');setBtnLoading(btn,true,'Adding...');const res=await call('addAdmin',{superAdminId:APP.user.id,name:n,username:u2,password:p,role:'Lecturer',email:document.getElementById('al-e').value.trim(),department:document.getElementById('al-d').value.trim(),customId:id});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Lecturer added!','success');closeModal('m-al');saRenderLecturers();}

async function saRenderStudents(){
  const res=await call('getAllStudents',{});
  _saStudents=res.students||[];
  document.getElementById('sa-content').innerHTML=`
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>Students</h2><p>${_saStudents.length} registered</p></div><button class="btn btn-primary btn-sm" onclick="saOpenAddStudent()"><i class="fa-solid fa-plus"></i> Add Student</button></div>
    <div style="margin-bottom:14px;max-width:360px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input placeholder="Search by name, NIC, email..." id="sas-q" oninput="saFilterStudents()"/></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Name</th><th>NIC / Reg</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody id="sas-tbody">${saStudRows(_saStudents)}</tbody></table></div>
  </div>`;
  document.getElementById('sas-q')._all=_saStudents;
}

function saStudRows(list){
  if(!list.length) return `<tr><td colspan="6"><div class="empty" style="padding:30px"><div class="empty-icon">👤</div><p>No students.</p></div></td></tr>`;
  return list.map((s,i)=>`<tr>
    <td>${i+1}</td>
    <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar av-32 av-p">${initials(s.User_Name)}</div><span style="font-weight:700">${esc(s.User_Name)}</span></div></td>
    <td><code style="background:var(--surface2);padding:2px 8px;border-radius:5px;font-size:.78rem;font-family:var(--ff-mono)">${esc(String(s.Reg_No))}</code></td>
    <td style="color:var(--tx2)">${esc(s.Email||'—')}</td>
    <td><span class="badge ${s.Account_Status==='Active'?'badge-success':'badge-danger'}">${esc(s.Account_Status||'Active')}</span></td>
    <td><div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="saToggleStudent('${esc(String(s.Reg_No))}','${esc(s.Account_Status||'Active')}')"><i class="fa-solid fa-toggle-${s.Account_Status==='Active'?'on':'off'}"></i> ${s.Account_Status==='Active'?'Disable':'Enable'}</button>
      <button class="btn btn-danger btn-sm btn-icon" onclick="saConfirmDeleteStudent('${esc(String(s.Reg_No))}','${esc(s.User_Name)}')"><i class="fa-solid fa-trash"></i></button>
    </div></td>
  </tr>`).join('');
}

function saFilterStudents(){
  const q=document.getElementById('sas-q').value.toLowerCase();
  const all=document.getElementById('sas-q')._all||[];
  const f=q?all.filter(s=>(s.User_Name||'').toLowerCase().includes(q)||String(s.Reg_No).toLowerCase().includes(q)||(s.Email||'').toLowerCase().includes(q)):all;
  document.getElementById('sas-tbody').innerHTML=saStudRows(f);
}

function saOpenAddStudent(){buildModal('m-ns','Add Student',`<div class="form-grid-2"><div class="field"><label>Full Name *</label><input class="input" id="ns-n" placeholder="John Perera"/></div><div class="field"><label>NIC / Passport *</label><input class="input" id="ns-nc" placeholder="200012345678"/></div></div><div class="form-grid-2"><div class="field"><label>Email</label><input class="input" type="email" id="ns-e" placeholder="student@email.com"/></div><div class="field"><label>PIN *</label><input class="input" id="ns-p" placeholder="Login PIN (min 4)"/></div></div>`,`<button class="btn btn-ghost" onclick="closeModal('m-ns')">Cancel</button><button class="btn btn-primary" id="ns-btn" onclick="saAddStudent()"><i class="fa-solid fa-plus"></i> Add</button>`);}
async function saAddStudent(){const n=document.getElementById('ns-n').value.trim(),nc=document.getElementById('ns-nc').value.trim(),p=document.getElementById('ns-p').value.trim();if(!n||!nc||!p){toast('Fill required fields','warning');return;}const btn=document.getElementById('ns-btn');setBtnLoading(btn,true,'Adding...');const res=await call('addStudent',{superAdminId:APP.user.id,name:n,nic:nc,email:document.getElementById('ns-e').value.trim(),pin:p});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Student added!','success');closeModal('m-ns');saRenderStudents();}
async function saToggleStudent(regNo,cur){const res=await call('toggleStudentStatus',{superAdminId:APP.user.id,regNo});if(!res.success){toast(res.message,'error');return;}toast(`Student ${res.newStatus.toLowerCase()}`,'success');saRenderStudents();}
function saConfirmDeleteStudent(regNo,name){confirm2('Delete Student',`Permanently delete "${name}" (${regNo})?`,async()=>{const res=await call('deleteStudent',{superAdminId:APP.user.id,regNo});if(!res.success){toast(res.message,'error');return;}toast('Deleted','success');saRenderStudents();});}

async function saRenderCourses(){
  const [cr,ar]=await Promise.all([call('getAllCourses',{}),call('getAllAdmins',{})]);
  _saCourses=cr.courses||[];
  const lecs=(ar.admins||[]).filter(a=>['Admin','Lecturer'].includes(a.Role));
  document.getElementById('sa-content').innerHTML=`
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>All Courses</h2><p>${_saCourses.length} total</p></div><button class="btn btn-primary btn-sm" onclick="saOpenCreateCourse()"><i class="fa-solid fa-plus"></i> Create Course</button></div>
    <div style="margin-bottom:14px;max-width:340px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input placeholder="Search courses..." id="sac-q" oninput="saFilterCourses()"/></div></div>
    <div class="tbl-wrap">
      <table><thead><tr><th>#</th><th>Course</th><th>PIN</th><th>Created By</th><th>Assign To</th><th>Students</th><th>Actions</th></tr></thead>
      <tbody id="sac-tbody">${saCourseRows(_saCourses,lecs)}</tbody></table>
    </div>
  </div>`;
  document.getElementById('sac-q')._all=_saCourses;
  document.getElementById('sac-q')._lecs=lecs;
}

function saCourseRows(list,lecs){
  if(!list.length) return `<tr><td colspan="7"><div class="empty" style="padding:30px"><div class="empty-icon">📚</div><p>No courses.</p></div></td></tr>`;
  return list.map((c,i)=>`<tr>
    <td>${i+1}</td>
    <td style="font-weight:700;color:var(--p);cursor:pointer" onclick="saViewCourseStudents('${esc(c.Course_ID)}','${esc(c.Course_Name)}')">${esc(c.Course_Name)}</td>
    <td><div style="display:flex;align-items:center;gap:6px"><span class="course-pin">${esc(c.Course_PIN)}</span><button class="btn btn-ghost btn-sm" style="padding:3px 8px" onclick="saCopyPin('${esc(c.Course_PIN)}','${esc(c.Course_Name)}')"><i class="fa-regular fa-copy"></i></button></div></td>
    <td style="color:var(--tx2)">${esc(c.creatorName||'—')}</td>
    <td><div style="display:flex;gap:6px;align-items:center"><select class="select" id="asgn-${esc(c.Course_ID)}" style="width:130px;padding:6px 8px;font-size:.78rem"><option value="">Select...</option>${(lecs||[]).map(l=>`<option value="${esc(l.Admin_ID)}">${esc(l.Admin_Name)}</option>`).join('')}</select><button class="btn btn-success btn-sm" onclick="saAssignCourse('${esc(c.Course_ID)}')"><i class="fa-solid fa-share"></i></button></div></td>
    <td><button class="btn btn-primary btn-sm" onclick="saViewCourseStudents('${esc(c.Course_ID)}','${esc(c.Course_Name)}')"><i class="fa-solid fa-users"></i></button></td>
    <td><button class="btn btn-danger btn-sm btn-icon" onclick="saConfirmDeleteCourse('${esc(c.Course_ID)}','${esc(c.Course_Name)}')"><i class="fa-solid fa-trash"></i></button><button class="btn btn-ghost btn-sm btn-icon" style="margin-left:4px" onclick="saOpenEditCourse('${esc(c.Course_ID)}','${esc(c.Course_Name)}')"><i class="fa-solid fa-pen"></i></button></td>
  </tr>`).join('');
}

function saFilterCourses(){
  const inp=document.getElementById('sac-q');
  const q=inp.value.toLowerCase();
  const all=inp._all||[]; const lecs=inp._lecs||[];
  const f=q?all.filter(c=>c.Course_Name.toLowerCase().includes(q)||(c.creatorName||'').toLowerCase().includes(q)||(c.Course_PIN||'').toLowerCase().includes(q)):all;
  document.getElementById('sac-tbody').innerHTML=saCourseRows(f,lecs);
}

function saCopyPin(pin,name){navigator.clipboard.writeText(pin).catch(()=>{});toast(`PIN "${pin}" copied!`,'success');}
function saOpenCreateCourse(){buildModal('m-sacc','Create Course (Super Admin)',`<div class="field"><label>Name *</label><input class="input" id="sacc-n" placeholder="Course name"/></div><div class="field"><label>Description</label><textarea class="textarea" id="sacc-d"></textarea></div><div class="field"><label>Thumbnail URL</label><input class="input" id="sacc-t" placeholder="https://..."/></div>`,`<button class="btn btn-ghost" onclick="closeModal('m-sacc')">Cancel</button><button class="btn btn-primary" id="sacc-btn" onclick="saCreateCourse()"><i class="fa-solid fa-plus"></i> Create</button>`);}
async function saCreateCourse(){const n=document.getElementById('sacc-n').value.trim();if(!n){toast('Name required','warning');return;}const btn=document.getElementById('sacc-btn');setBtnLoading(btn,true,'Creating...');const res=await call('createCourse',{adminId:APP.user.id,name:n,description:document.getElementById('sacc-d').value.trim(),thumbnail:document.getElementById('sacc-t').value.trim()});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast(`Created! PIN: ${res.pin}`,'success',6000);closeModal('m-sacc');saRenderCourses();}
async function saAssignCourse(cid){const aid=document.getElementById(`asgn-${cid}`)?.value;if(!aid){toast('Select a lecturer','warning');return;}const res=await call('assignCourse',{superAdminId:APP.user.id,courseId:cid,adminId:aid});if(!res.success){toast(res.message,'error');return;}toast('Course assigned!','success');}
function saConfirmDeleteCourse(cid,name){confirm2('Delete Course',`Delete "${name}"?`,async()=>{const res=await call('deleteCourse',{adminId:APP.user.id,role:APP.user.role,courseId:cid});if(!res.success){toast(res.message,'error');return;}toast('Deleted','success');saRenderCourses();});}

function saOpenEditCourse(cid, name) {
  const course = _saCourses.find(c => str(c.Course_ID) === str(cid));
  buildModal('m-sa-ec','Edit Course',`
    <div class="field"><label>Course Name *</label><input class="input" id="saec-n" value="${esc(course?.Course_Name||name)}"/></div>
    <div class="field"><label>Description</label><textarea class="textarea" id="saec-d">${esc(course?.Course_Description||'')}</textarea></div>
    <div class="field"><label>Thumbnail URL</label><input class="input" id="saec-t" value="${esc(course?.Thumbnail_URL||'')}"/></div>
  `,`
    <button class="btn btn-ghost" onclick="closeModal('m-sa-ec')">Cancel</button>
    <button class="btn btn-primary" id="saec-btn" onclick="saUpdateCourse('${esc(cid)}')"><i class="fa-solid fa-save"></i> Save</button>
  `);
}
async function saUpdateCourse(cid) {
  const btn = document.getElementById('saec-btn');
  setBtnLoading(btn, true, 'Saving...');
  const res = await call('updateCourse', {
    adminId: APP.user.id, role: APP.user.role, courseId: cid,
    name: document.getElementById('saec-n').value.trim(),
    description: document.getElementById('saec-d').value.trim(),
    thumbnail: document.getElementById('saec-t').value.trim()
  });
  setBtnLoading(btn, false);
  if (!res.success) { toast(res.message, 'error'); return; }
  toast('Course updated!', 'success');
  closeModal('m-sa-ec');
  saRenderCourses();
}

async function saViewCourseStudents(courseId,courseName){
  const ct=document.getElementById('sa-content');
  document.getElementById('sa-page-title').textContent=courseName+' — Students';
  ct.innerHTML=`<div class="page-load"><div class="spin spin-lg"></div></div>`;
  const [sr,cr]=await Promise.all([call('getCourseStudents',{courseId}),call('getCourseContent',{courseId})]);
  const students=sr.students||[], contents=cr.contents||[];
  ct.innerHTML=`
  <div class="anim">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:22px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="saNav('courses',null)"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div style="flex:1"><h2 style="font-size:1.15rem;font-weight:900">${esc(courseName)}</h2><p style="font-size:.78rem;color:var(--tx3)">${students.length} enrolled · ${contents.length} lessons</p></div>
    </div>
    <div class="grid-3" style="margin-bottom:22px">
      <div class="card stat-card"><div class="stat-ico ic-green"><i class="fa-solid fa-users"></i></div><div><div class="stat-num">${students.length}</div><div class="stat-label">Students</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-purple"><i class="fa-solid fa-layer-group"></i></div><div><div class="stat-num">${contents.length}</div><div class="stat-label">Lessons</div></div></div>
      <div class="card stat-card"><div class="stat-ico ic-teal"><i class="fa-solid fa-chart-line"></i></div><div><div class="stat-num">—</div><div class="stat-label">Avg Progress</div></div></div>
    </div>
    <div class="sec-head">
      <div class="sec-head-info"><h2>Enrolled Students</h2></div>
      <div style="max-width:280px"><div class="search-wrap"><i class="fa-solid fa-search"></i><input placeholder="Search students..." id="cs-q" oninput="saFilterCourseStudents()"/></div></div>
    </div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Student</th><th>NIC / Reg</th><th>Email</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
    <tbody id="cs-tbody">${saCourseStudRows(students,courseId,courseName)}</tbody></table></div>
  </div>`;
  document.getElementById('cs-q')._all=students;
  document.getElementById('cs-q')._cid=courseId;
  document.getElementById('cs-q')._cname=courseName;
}

function saCourseStudRows(list,courseId,courseName){
  if(!list.length) return `<tr><td colspan="7"><div class="empty" style="padding:30px"><div class="empty-icon">👥</div><p>No students enrolled.</p></div></td></tr>`;
  return list.map((s,i)=>`<tr>
    <td>${i+1}</td>
    <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar av-32 av-p">${initials(s.User_Name)}</div><span style="font-weight:700">${esc(s.User_Name)}</span></div></td>
    <td><code style="background:var(--surface2);padding:2px 8px;border-radius:5px;font-size:.78rem;font-family:var(--ff-mono)">${esc(String(s.Reg_No))}</code></td>
    <td style="color:var(--tx2)">${esc(s.Email||'—')}</td>
    <td style="color:var(--tx3)">${fmtDate(s.joinedDate)}</td>
    <td><span class="badge ${s.Account_Status==='Active'?'badge-success':'badge-danger'}">${esc(s.Account_Status||'Active')}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="saRemoveFromCourse('${esc(s.enrollmentId)}','${esc(s.User_Name)}','${esc(courseId)}','${esc(courseName)}')"><i class="fa-solid fa-user-minus"></i> Remove</button></td>
  </tr>`).join('');
}

function saFilterCourseStudents(){const inp=document.getElementById('cs-q');const q=inp.value.toLowerCase();const f=q?(inp._all||[]).filter(s=>(s.User_Name||'').toLowerCase().includes(q)||String(s.Reg_No).toLowerCase().includes(q)):inp._all||[];document.getElementById('cs-tbody').innerHTML=saCourseStudRows(f,inp._cid,inp._cname);}
function saRemoveFromCourse(eid,name,cid,cname){confirm2('Remove Student',`Remove "${name}" from "${cname}"?`,async()=>{const res=await call('removeStudent',{adminId:APP.user.id,enrollmentId:eid,courseId:cid});if(!res.success){toast(res.message,'error');return;}toast('Removed','success');saViewCourseStudents(cid,cname);},{label:'Remove',type:'danger'});}

async function saRenderLogs(){
  const res=await call('getActivityLogs',{});
  const logs=res.logs||[];
  document.getElementById('sa-content').innerHTML=`
  <div class="anim">
    <div class="sec-head"><div class="sec-head-info"><h2>Activity Logs</h2><p>Last ${logs.length} actions</p></div></div>
    <div class="card" style="overflow:hidden">
      ${logs.length===0?`<div class="empty"><div class="empty-icon">📋</div><h4>No logs</h4></div>`
        :logs.map(l=>`<div class="log-row"><div class="log-dot"></div><div style="flex:1"><div class="log-action">${esc(l.Action)}</div><div class="log-user"><i class="fa-solid fa-user" style="font-size:.68rem"></i> ${esc(String(l.User_ID_Admin_ID))}</div></div><div class="log-time">${fmtDateTime(l.Timestamp)}</div></div>`).join('')}
    </div>
  </div>`;
}

function saRenderSettings(){const u=APP.user;document.getElementById('sa-content').innerHTML=`<div class="anim" style="max-width:560px"><div class="sec-head"><div class="sec-head-info"><h2>Settings</h2></div></div><div class="card" style="padding:28px;margin-bottom:16px"><div style="display:flex;align-items:center;gap:16px;margin-bottom:22px"><div class="avatar av-72" style="background:linear-gradient(135deg,#f97316,#ef4444);color:#fff">${initials(u.name)}</div><div><div style="font-size:1.05rem;font-weight:900">${esc(u.name)}</div><div style="color:var(--tx3);font-size:.83rem">Super Administrator</div><span class="badge badge-warning" style="margin-top:8px"><i class="fa-solid fa-crown"></i> Super Admin</span></div></div><div class="divider" style="margin-bottom:20px"></div><h3 style="font-weight:800;font-size:.8rem;text-transform:uppercase;letter-spacing:.07em;color:var(--tx2);margin-bottom:14px">Change Password</h3><div style="display:flex;flex-direction:column;gap:14px"><div class="field"><label>Current Password</label><div class="input-wrap"><i class="iico fa-solid fa-lock"></i><input class="input" type="password" id="sa-op" placeholder="Current"/></div></div><div class="field"><label>New Password</label><div class="input-wrap"><i class="iico fa-solid fa-key"></i><input class="input" type="password" id="sa-np" placeholder="New (min 6)"/></div><div class="pw-strength" id="sa-pw-str"><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div><div class="pw-bar"></div></div></div><div class="field"><label>Confirm</label><div class="input-wrap"><i class="iico fa-solid fa-key"></i><input class="input" type="password" id="sa-np2" placeholder="Repeat"/></div></div><button class="btn btn-primary" style="align-self:flex-start" id="sa-chpw" onclick="saChangePw()"><i class="fa-solid fa-save"></i> Update</button></div></div><div class="card" style="padding:20px;display:flex;align-items:center;justify-content:space-between"><div><div style="font-weight:700">Theme</div><div style="font-size:.82rem;color:var(--tx2)">Dark / Light</div></div><button class="btn btn-ghost" onclick="toggleTheme()"><i class="fa-solid fa-moon" data-theme-icon></i> Toggle</button></div></div>`;renderPwStrength('sa-np','sa-pw-str');}
async function saChangePw(){const op=document.getElementById('sa-op').value.trim(),np=document.getElementById('sa-np').value.trim(),c2=document.getElementById('sa-np2').value.trim();if(!op||!np){toast('Fill all fields','warning');return;}if(np!==c2){toast('Passwords do not match','error');return;}if(np.length<6){toast('Min 6 characters','warning');return;}const btn=document.getElementById('sa-chpw');setBtnLoading(btn,true,'Updating...');const res=await call('changeAdminPassword',{adminId:APP.user.id,oldPassword:op,newPassword:np});setBtnLoading(btn,false);if(!res.success){toast(res.message,'error');return;}toast('Updated!','success');}
