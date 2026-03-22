// ================================================================
// NextGenLMS v4 — Google Apps Script Backend
// SMART STRATEGY: Extra lesson metadata (description, mode)
// stored as JSON inside Data_Link field — NO new columns needed.
// Format: {"url":"https://...","desc":"...","mode":"preview"}
// Legacy plain URLs still work fine.
// ================================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();

function gs(name) { return SS.getSheetByName(name); }

// Normalize any value: strip trailing .0, trim whitespace
function str(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\.0+$/, '').trim();
}

function getData(name) {
  const sh = gs(name);
  if (!sh) return [];
  const d = sh.getDataRange().getValues();
  if (d.length <= 1) return [];
  const h = d[0];
  return d.slice(1).map(r => {
    const o = {};
    h.forEach((k, i) => { o[k] = (r[i] === null || r[i] === undefined) ? '' : r[i]; });
    return o;
  });
}

function appendRow(name, obj) {
  const sh = gs(name);
  if (!sh) return;
  const lc = sh.getLastColumn();
  if (lc < 1) return;
  const h = sh.getRange(1, 1, 1, lc).getValues()[0];
  sh.appendRow(h.map(k => (obj[k] !== undefined && obj[k] !== null) ? obj[k] : ''));
}

function updateRow(name, keyCol, keyVal, updates) {
  const sh = gs(name);
  if (!sh) return false;
  const d = sh.getDataRange().getValues();
  const h = d[0];
  const ki = h.indexOf(keyCol);
  if (ki < 0) return false;
  const kv = str(keyVal);
  for (let i = 1; i < d.length; i++) {
    if (str(d[i][ki]) === kv) {
      Object.keys(updates).forEach(k => {
        const ci = h.indexOf(k);
        if (ci >= 0) sh.getRange(i + 1, ci + 1).setValue(updates[k]);
      });
      return true;
    }
  }
  return false;
}

function deleteRow(name, keyCol, keyVal) {
  const sh = gs(name);
  if (!sh) return false;
  const d = sh.getDataRange().getValues();
  const h = d[0];
  const ki = h.indexOf(keyCol);
  if (ki < 0) return false;
  const kv = str(keyVal);
  for (let i = d.length - 1; i >= 1; i--) {
    if (str(d[i][ki]) === kv) { sh.deleteRow(i + 1); return true; }
  }
  return false;
}

function uid(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function logAction(userId, action) {
  try {
    appendRow('Activity_Logs', {
      Log_ID: uid('LOG'), User_ID_Admin_ID: str(userId),
      Action: action, Timestamp: new Date().toISOString()
    });
  } catch (e) {}
}

function ensureAdminColumns() {
  const sh = gs('Admins');
  if (!sh) return;
  const lc = sh.getLastColumn();
  const h = lc > 0 ? sh.getRange(1, 1, 1, lc).getValues()[0] : [];
  const needed = ['Admin_Department', 'Admin_Email', 'Account_Status'];
  let col = lc + 1;
  needed.forEach(cn => { if (!h.includes(cn)) { sh.getRange(1, col).setValue(cn); col++; } });
}

// ── Router ───────────────────────────────────────
function doPost(e) {
  try {
    const q = JSON.parse(e.postData.contents);
    const map = {
      studentLogin, adminLogin, studentRegister, lecturerRegister,
      changeStudentPin, changeAdminPassword,
      getMyCourses, joinCourse, getCourseContent,
      markProgress, getProgress, getAnnouncements, getQuizzes, getStudentSubmissions,
      getAdminCourses, createCourse, updateCourse, deleteCourse,
      addContent, updateContent, deleteContent,
      getCourseStudents, removeStudent,
      addAnnouncement, deleteAnnouncement,
      addQuiz, deleteQuiz, gradeSubmission,
      getAllAdmins, addAdmin, deleteAdmin,
      approveLecturer, assignAdminId, disableLecturer, enableLecturer,
      getAllStudents, addStudent, deleteStudent, toggleStudentStatus,
      getAllCourses, assignCourse, getActivityLogs,
    };
    const fn = map[q.action];
    if (!fn) return out({ success: false, message: 'Unknown: ' + q.action });
    return out(fn(q));
  } catch (err) {
    return out({ success: false, message: err.toString() });
  }
}
function out(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return out({ status: 'NextGenLMS v4 OK' }); }

// ════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════

function studentLogin(q) {
  const students = getData('Users');
  const id = str(q.identifier), pin = str(q.pin);
  const s = students.find(x =>
    (str(x.Reg_No) === id || (x.Email && str(x.Email).toLowerCase() === id.toLowerCase())) &&
    str(x.Login_PIN) === pin
  );
  if (!s) return { success: false, message: 'Incorrect NIC/Passport or PIN.' };
  if (str(s.Account_Status) === 'Inactive') return { success: false, message: 'Account deactivated. Contact admin.' };
  logAction(s.Reg_No, 'Student Login');
  return { success: true, user: { regNo: str(s.Reg_No), name: str(s.User_Name), email: str(s.Email), role: 'student' } };
}

function adminLogin(q) {
  const admins = getData('Admins');
  const uname = str(q.username), pw = str(q.password);
  const a = admins.find(x => str(x.Admin_Username) === uname && str(x.Admin_Password) === pw);
  if (!a) return { success: false, message: 'Incorrect username or password.' };
  const role = str(a.Role);
  if (role === 'Pending') return { success: false, message: 'Account pending Super Admin approval.' };
  if (role === 'Disabled') return { success: false, message: 'Account disabled. Contact Super Admin.' };
  logAction(a.Admin_ID, role + ' Login');
  return { success: true, user: {
    id: str(a.Admin_ID), name: str(a.Admin_Name), username: str(a.Admin_Username),
    role, department: str(a.Admin_Department), email: str(a.Admin_Email)
  }};
}

function studentRegister(q) {
  const nic = str(q.nic);
  if (getData('Users').find(s => str(s.Reg_No) === nic))
    return { success: false, message: 'This NIC/Passport is already registered.' };
  appendRow('Users', { Reg_No: nic, User_Name: q.name, Login_PIN: str(q.pin), Email: q.email || '', Account_Status: 'Active' });
  logAction(nic, 'Self-Registered');
  return { success: true };
}

function lecturerRegister(q) {
  ensureAdminColumns();
  if (getData('Admins').find(a => str(a.Admin_Username) === str(q.username)))
    return { success: false, message: 'Username already taken.' };
  appendRow('Admins', {
    Admin_ID: uid('PEND'), Admin_Name: q.name, Admin_Username: q.username,
    Admin_Password: q.password, Role: 'Pending',
    Admin_Department: q.department || '', Admin_Email: q.email || '', Account_Status: 'Pending'
  });
  return { success: true };
}

function changeStudentPin(q) {
  const s = getData('Users').find(x => str(x.Reg_No) === str(q.regNo));
  if (!s) return { success: false, message: 'Account not found.' };
  if (str(s.Login_PIN) !== str(q.oldPin)) return { success: false, message: 'Current PIN incorrect.' };
  updateRow('Users', 'Reg_No', str(q.regNo), { Login_PIN: str(q.newPin) });
  return { success: true };
}

function changeAdminPassword(q) {
  const a = getData('Admins').find(x => str(x.Admin_ID) === str(q.adminId));
  if (!a) return { success: false, message: 'Account not found.' };
  if (str(a.Admin_Password) !== str(q.oldPassword)) return { success: false, message: 'Current password incorrect.' };
  updateRow('Admins', 'Admin_ID', str(q.adminId), { Admin_Password: str(q.newPassword) });
  return { success: true };
}

// ════════════════════════════════════════════════
// STUDENT
// ════════════════════════════════════════════════

function getMyCourses(q) {
  const enrolls = getData('Enrollments').filter(e => str(e.Reg_No) === str(q.regNo));
  const courses = getData('Courses');
  return { success: true, courses: enrolls.map(e => {
    const c = courses.find(x => str(x.Course_ID) === str(e.Course_ID));
    return c ? { ...c, joinedDate: e.Joined_Date } : null;
  }).filter(Boolean)};
}

function joinCourse(q) {
  const c = getData('Courses').find(x => str(x.Course_PIN).toUpperCase() === str(q.pin).toUpperCase());
  if (!c) return { success: false, message: 'Invalid Course PIN.' };
  if (getData('Enrollments').find(e => str(e.Reg_No) === str(q.regNo) && str(e.Course_ID) === str(c.Course_ID)))
    return { success: false, message: 'Already enrolled.' };
  appendRow('Enrollments', { Enrollment_ID: uid('ENR'), Reg_No: str(q.regNo), Course_ID: str(c.Course_ID), Joined_Date: new Date().toISOString() });
  logAction(q.regNo, 'Joined: ' + c.Course_Name);
  return { success: true, course: c };
}

// Parse lesson Data_Link — supports both plain URL and JSON metadata
function parseLesson(item) {
  const raw = str(item.Data_Link);
  let parsed = { url: raw, desc: '', mode: 'preview' };
  if (raw.startsWith('{')) {
    try { parsed = { ...parsed, ...JSON.parse(raw) }; } catch(e) {}
  }
  return { ...item, _url: parsed.url, _desc: parsed.desc, _mode: parsed.mode };
}

function getCourseContent(q) {
  const c = getData('Course_Content').filter(x => str(x.Course_ID) === str(q.courseId));
  c.sort((a, b) => Number(a.Order_Index || 0) - Number(b.Order_Index || 0));
  return { success: true, contents: c.map(parseLesson) };
}

function markProgress(q) {
  const p = getData('Progress_Tracking');
  const ex = p.find(x => str(x.Reg_No) === str(q.regNo) && str(x.Content_ID) === str(q.contentId));
  if (ex) updateRow('Progress_Tracking', 'Progress_ID', str(ex.Progress_ID), { Status: q.status });
  else appendRow('Progress_Tracking', { Progress_ID: uid('PRG'), Reg_No: str(q.regNo), Content_ID: str(q.contentId), Status: q.status });
  return { success: true };
}

function getProgress(q) {
  return { success: true, progress: getData('Progress_Tracking').filter(x => str(x.Reg_No) === str(q.regNo)) };
}

function getAnnouncements(q) {
  const a = getData('Announcements').filter(x => str(x.Course_ID) === str(q.courseId));
  a.sort((x, y) => new Date(y.Posted_Date) - new Date(x.Posted_Date));
  return { success: true, announcements: a };
}

function getQuizzes(q) {
  return { success: true, quizzes: getData('Quizzes_Assignments').filter(x => str(x.Course_ID) === str(q.courseId)) };
}

function getStudentSubmissions(q) {
  return { success: true, submissions: getData('Student_Submissions').filter(x => str(x.Reg_No) === str(q.regNo)) };
}

// ════════════════════════════════════════════════
// ADMIN / LECTURER
// ════════════════════════════════════════════════

function canManage(adminId, role, courseId) {
  if (role === 'Super_Admin') return true;
  const aid = str(adminId), cid = str(courseId);
  const c = getData('Courses').find(x => str(x.Course_ID) === cid);
  if (c && str(c.Created_By) === aid) return true;
  return getData('Course_Assignments').some(x => str(x.Admin_ID) === aid && str(x.Course_ID) === cid);
}

function getAdminCourses(q) {
  let courses = getData('Courses');
  if (q.role !== 'Super_Admin') {
    const aid = str(q.adminId);
    const assigned = getData('Course_Assignments').filter(x => str(x.Admin_ID) === aid).map(x => str(x.Course_ID));
    courses = courses.filter(x => str(x.Created_By) === aid || assigned.includes(str(x.Course_ID)));
  }
  return { success: true, courses };
}

function createCourse(q) {
  const id = uid('CRS'), pin = Math.random().toString(36).substr(2, 6).toUpperCase();
  appendRow('Courses', { Course_ID: id, Course_Name: q.name, Course_Description: q.description || '', Course_PIN: pin, Thumbnail_URL: q.thumbnail || '', Created_By: str(q.adminId) });
  logAction(q.adminId, 'Created Course: ' + q.name);
  return { success: true, courseId: id, pin };
}

function updateCourse(q) {
  if (!canManage(q.adminId, q.role, q.courseId)) return { success: false, message: 'Permission denied.' };
  updateRow('Courses', 'Course_ID', str(q.courseId), { Course_Name: q.name, Course_Description: q.description || '', Thumbnail_URL: q.thumbnail || '' });
  return { success: true };
}

function deleteCourse(q) {
  if (!canManage(q.adminId, q.role, q.courseId)) return { success: false, message: 'Permission denied.' };
  deleteRow('Courses', 'Course_ID', str(q.courseId));
  return { success: true };
}

// addContent: stores metadata as JSON in Data_Link
function addContent(q) {
  if (!canManage(q.adminId, q.role, q.courseId)) return { success: false, message: 'Permission denied.' };
  const n = getData('Course_Content').filter(x => str(x.Course_ID) === str(q.courseId)).length;
  // Store rich metadata as JSON in Data_Link field
  const dataLink = JSON.stringify({ url: q.url || q.link || '', desc: q.desc || '', mode: q.mode || 'preview' });
  appendRow('Course_Content', {
    Content_ID: uid('CNT'), Course_ID: str(q.courseId),
    Topic_Title: q.title, Content_Type: q.type,
    Data_Link: dataLink, Order_Index: n + 1
  });
  return { success: true };
}

function updateContent(q) {
  const dataLink = JSON.stringify({ url: q.url || q.link || '', desc: q.desc || '', mode: q.mode || 'preview' });
  updateRow('Course_Content', 'Content_ID', str(q.contentId), {
    Topic_Title: q.title, Content_Type: q.type, Data_Link: dataLink
  });
  return { success: true };
}

function deleteContent(q) { deleteRow('Course_Content', 'Content_ID', str(q.contentId)); return { success: true }; }

function getCourseStudents(q) {
  const enrolls = getData('Enrollments').filter(e => str(e.Course_ID) === str(q.courseId));
  const students = getData('Users');
  return { success: true, students: enrolls.map(e => {
    const s = students.find(x => str(x.Reg_No) === str(e.Reg_No));
    return s ? { ...s, joinedDate: e.Joined_Date, enrollmentId: str(e.Enrollment_ID) } : null;
  }).filter(Boolean)};
}

function removeStudent(q) {
  deleteRow('Enrollments', 'Enrollment_ID', str(q.enrollmentId));
  return { success: true };
}

function addAnnouncement(q) {
  appendRow('Announcements', { Announcement_ID: uid('ANN'), Course_ID: str(q.courseId), Title: q.title, Message: q.message, Posted_Date: new Date().toISOString() });
  return { success: true };
}
function deleteAnnouncement(q) { deleteRow('Announcements', 'Announcement_ID', str(q.announcementId)); return { success: true }; }

function addQuiz(q) {
  appendRow('Quizzes_Assignments', { Quiz_ID: uid('QZ'), Course_ID: str(q.courseId), Quiz_Title: q.title, Google_Form_Link: q.formLink, Deadline: q.deadline || '' });
  return { success: true };
}
function deleteQuiz(q) { deleteRow('Quizzes_Assignments', 'Quiz_ID', str(q.quizId)); return { success: true }; }

function gradeSubmission(q) {
  const ex = getData('Student_Submissions').find(x => str(x.Reg_No) === str(q.regNo) && str(x.Quiz_ID) === str(q.quizId));
  if (ex) updateRow('Student_Submissions', 'Submission_ID', str(ex.Submission_ID), { Result_Grade: q.grade });
  else appendRow('Student_Submissions', { Submission_ID: uid('SUB'), Reg_No: str(q.regNo), Course_ID: str(q.courseId), Quiz_ID: str(q.quizId), Result_Grade: q.grade, Submission_Date: new Date().toISOString() });
  return { success: true };
}

// ════════════════════════════════════════════════
// SUPER ADMIN
// ════════════════════════════════════════════════

function getAllAdmins() {
  ensureAdminColumns();
  return { success: true, admins: getData('Admins').map(x => ({ ...x, Admin_Password: '***' })) };
}

function addAdmin(q) {
  ensureAdminColumns();
  if (getData('Admins').find(a => str(a.Admin_Username) === str(q.username)))
    return { success: false, message: 'Username exists.' };
  appendRow('Admins', { Admin_ID: q.customId || uid('ADM'), Admin_Name: q.name, Admin_Username: q.username, Admin_Password: q.password, Role: q.role || 'Lecturer', Admin_Department: q.department || '', Admin_Email: q.email || '', Account_Status: 'Active' });
  logAction(q.superAdminId, 'Added: ' + q.username);
  return { success: true };
}

function deleteAdmin(q) { deleteRow('Admins', 'Admin_ID', str(q.adminId)); return { success: true }; }

function approveLecturer(q) {
  const ok = updateRow('Admins', 'Admin_ID', str(q.adminId), { Role: 'Lecturer', Account_Status: 'Active' });
  if (!ok) return { success: false, message: 'Not found.' };
  return { success: true };
}

function assignAdminId(q) {
  const admins = getData('Admins');
  if (!admins.find(x => str(x.Admin_ID) === str(q.adminId))) return { success: false, message: 'Not found.' };
  if (admins.find(x => str(x.Admin_ID) === str(q.newAdminId) && str(x.Admin_ID) !== str(q.adminId)))
    return { success: false, message: 'ID in use.' };
  const sh = gs('Admins'), d = sh.getDataRange().getValues(), h = d[0];
  const ii = h.indexOf('Admin_ID'), ri = h.indexOf('Role'), si = h.indexOf('Account_Status');
  for (let i = 1; i < d.length; i++) {
    if (str(d[i][ii]) === str(q.adminId)) {
      sh.getRange(i+1,ii+1).setValue(q.newAdminId);
      sh.getRange(i+1,ri+1).setValue('Lecturer');
      if (si>=0) sh.getRange(i+1,si+1).setValue('Active');
      break;
    }
  }
  return { success: true };
}

function disableLecturer(q) { updateRow('Admins','Admin_ID',str(q.adminId),{Role:'Disabled',Account_Status:'Disabled'}); return {success:true}; }
function enableLecturer(q)  { updateRow('Admins','Admin_ID',str(q.adminId),{Role:'Lecturer',Account_Status:'Active'}); return {success:true}; }

function getAllStudents() { return { success: true, students: getData('Users') }; }

function addStudent(q) {
  const nic = str(q.nic);
  if (getData('Users').find(s => str(s.Reg_No) === nic)) return { success: false, message: 'NIC already exists.' };
  appendRow('Users', { Reg_No: nic, User_Name: q.name, Login_PIN: str(q.pin), Email: q.email || '', Account_Status: 'Active' });
  return { success: true };
}

function deleteStudent(q) { deleteRow('Users','Reg_No',str(q.regNo)); return {success:true}; }

function toggleStudentStatus(q) {
  const s = getData('Users').find(x => str(x.Reg_No) === str(q.regNo));
  if (!s) return { success: false, message: 'Not found.' };
  const ns = str(s.Account_Status) === 'Active' ? 'Inactive' : 'Active';
  updateRow('Users','Reg_No',str(q.regNo),{Account_Status:ns});
  return { success: true, newStatus: ns };
}

function getAllCourses() {
  const courses = getData('Courses'), admins = getData('Admins');
  return { success: true, courses: courses.map(c => {
    const a = admins.find(x => str(x.Admin_ID) === str(c.Created_By));
    return { ...c, creatorName: a ? str(a.Admin_Name) : 'System' };
  })};
}

function assignCourse(q) {
  if (getData('Course_Assignments').find(x => str(x.Admin_ID) === str(q.adminId) && str(x.Course_ID) === str(q.courseId)))
    return { success: false, message: 'Already assigned.' };
  appendRow('Course_Assignments', { Assignment_ID: uid('ASG'), Admin_ID: str(q.adminId), Course_ID: str(q.courseId), Assigned_Date: new Date().toISOString() });
  return { success: true };
}

function getActivityLogs() {
  const logs = getData('Activity_Logs');
  logs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  return { success: true, logs: logs.slice(0, 200) };
}
