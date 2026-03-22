// ============================================================
// NextGenLMS v2 — Google Apps Script Backend
// Deploy → New Deployment → Web App
//   Execute as: Me | Who has access: Anyone
// ============================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();

// ── Sheet helpers ────────────────────────────────
function gs(name) { return SS.getSheetByName(name); }

function getData(name) {
  const sh = gs(name);
  if (!sh) return [];
  const d = sh.getDataRange().getValues();
  if (d.length <= 1) return [];
  const h = d[0];
  return d.slice(1).map(r => { const o = {}; h.forEach((k,i) => o[k] = r[i]); return o; });
}

function appendRow(name, obj) {
  const sh = gs(name);
  const h  = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(h.map(k => obj[k] !== undefined ? obj[k] : ''));
}

function updateRow(name, keyCol, keyVal, updates) {
  const sh = gs(name);
  const d  = sh.getDataRange().getValues();
  const h  = d[0]; const ki = h.indexOf(keyCol);
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][ki]) === String(keyVal)) {
      Object.keys(updates).forEach(k => {
        const ci = h.indexOf(k);
        if (ci >= 0) sh.getRange(i+1, ci+1).setValue(updates[k]);
      });
      return true;
    }
  }
  return false;
}

function deleteRow(name, keyCol, keyVal) {
  const sh = gs(name);
  const d  = sh.getDataRange().getValues();
  const h  = d[0]; const ki = h.indexOf(keyCol);
  for (let i = d.length-1; i >= 1; i--) {
    if (String(d[i][ki]) === String(keyVal)) { sh.deleteRow(i+1); return true; }
  }
  return false;
}

function uid(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2,5).toUpperCase();
}

function logAction(userId, action) {
  try {
    appendRow('Activity_Logs', {
      Log_ID: uid('LOG'), User_ID_Admin_ID: userId,
      Action: action, Timestamp: new Date().toISOString()
    });
  } catch(e){}
}

// ── Router ───────────────────────────────────────
function doPost(e) {
  try {
    const q   = JSON.parse(e.postData.contents);
    const map = {
      // Auth
      studentLogin, adminLogin, studentRegister, lecturerRegister,
      changeStudentPin, changeAdminPassword,
      // Student
      getMyCourses, joinCourse, getCourseContent,
      markProgress, getProgress, getAnnouncements, getQuizzes, getStudentSubmissions,
      // Admin
      getAdminCourses, createCourse, updateCourse, deleteCourse,
      addContent, updateContent, deleteContent,
      getCourseStudents, removeStudent,
      addAnnouncement, deleteAnnouncement,
      addQuiz, deleteQuiz, gradeSubmission,
      // Super Admin
      getAllAdmins, addAdmin, deleteAdmin, approveLecturer, assignAdminId, disableLecturer, enableLecturer,
      getAllStudents, addStudent, deleteStudent, toggleStudentStatus,
      getAllCourses, assignCourse, getActivityLogs,
    };
    const fn = map[q.action];
    const r  = fn ? fn(q) : { success:false, message:'Unknown action: '+q.action };
    return ContentService.createTextOutput(JSON.stringify(r))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success:false, message:err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ status:'NextGenLMS v2 API Running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════

function studentLogin(q) {
  const students = getData('Users');
  // Identifier can be Reg_No (NIC/Passport) OR Email
  const s = students.find(x =>
    (String(x.Reg_No) === String(q.identifier) || (x.Email && x.Email === q.identifier)) &&
    String(x.Login_PIN) === String(q.pin)
  );
  if (!s) return { success:false, message:'Incorrect NIC/Passport or PIN.' };
  if (s.Account_Status === 'Inactive') return { success:false, message:'Your account has been deactivated. Contact an admin.' };
  logAction(s.Reg_No, 'Student Login');
  return { success:true, user:{ regNo:s.Reg_No, name:s.User_Name, email:s.Email, role:'student' } };
}

function adminLogin(q) {
  const admins = getData('Admins');
  const a = admins.find(x => x.Admin_Username === q.username && x.Admin_Password === q.password);
  if (!a) return { success:false, message:'Incorrect username or password.' };
  if (a.Role === 'Pending') return { success:false, message:'Your account is pending Super Admin approval.' };
  if (a.Role === 'Disabled') return { success:false, message:'Your account has been disabled. Contact a Super Admin.' };
  logAction(a.Admin_ID, a.Role + ' Login');
  return { success:true, user:{ id:a.Admin_ID, name:a.Admin_Name, username:a.Admin_Username, role:a.Role, department:a.Admin_Department||'' } };
}

function studentRegister(q) {
  const students = getData('Users');
  if (students.find(s => String(s.Reg_No) === String(q.nic)))
    return { success:false, message:'This NIC/Passport is already registered.' };
  appendRow('Users', {
    Reg_No: q.nic, User_Name: q.name,
    Login_PIN: q.pin, Email: q.email||'',
    Account_Status: 'Active'
  });
  logAction(q.nic, 'Self-Registered');
  return { success:true };
}

function lecturerRegister(q) {
  const admins = getData('Admins');
  if (admins.find(a => a.Admin_Username === q.username))
    return { success:false, message:'Username already taken. Choose another.' };
  // Role = 'Pending' until Super Admin approves
  appendRow('Admins', {
    Admin_ID: uid('PEND'),
    Admin_Name: q.name,
    Admin_Username: q.username,
    Admin_Password: q.password,
    Role: 'Pending',
    Admin_Department: q.department||'',
    Admin_Email: q.email||''
  });
  logAction(q.username, 'Lecturer Application Submitted');
  return { success:true };
}

function changeStudentPin(q) {
  const students = getData('Users');
  const s = students.find(x => String(x.Reg_No) === String(q.regNo));
  if (!s) return { success:false, message:'Account not found.' };
  if (String(s.Login_PIN) !== String(q.oldPin)) return { success:false, message:'Current PIN is incorrect.' };
  updateRow('Users','Reg_No', q.regNo, { Login_PIN: q.newPin });
  return { success:true };
}

function changeAdminPassword(q) {
  const admins = getData('Admins');
  const a = admins.find(x => String(x.Admin_ID) === String(q.adminId));
  if (!a) return { success:false, message:'Account not found.' };
  if (a.Admin_Password !== q.oldPassword) return { success:false, message:'Current password is incorrect.' };
  updateRow('Admins','Admin_ID', q.adminId, { Admin_Password: q.newPassword });
  return { success:true };
}

// ══════════════════════════════════════════════════
// STUDENT
// ══════════════════════════════════════════════════

function getMyCourses(q) {
  const enrolls = getData('Enrollments').filter(e => String(e.Reg_No)===String(q.regNo));
  const courses = getData('Courses');
  return { success:true, courses: enrolls.map(e => {
    const c = courses.find(x => String(x.Course_ID)===String(e.Course_ID));
    return c ? { ...c, joinedDate:e.Joined_Date } : null;
  }).filter(Boolean) };
}

function joinCourse(q) {
  const courses = getData('Courses');
  const c = courses.find(x => String(x.Course_PIN).toUpperCase()===String(q.pin).toUpperCase());
  if (!c) return { success:false, message:'Invalid Course PIN. Please check with your lecturer.' };
  const enrolled = getData('Enrollments');
  if (enrolled.find(e => String(e.Reg_No)===String(q.regNo) && String(e.Course_ID)===String(c.Course_ID)))
    return { success:false, message:'You are already enrolled in this course.' };
  appendRow('Enrollments', {
    Enrollment_ID: uid('ENR'), Reg_No: q.regNo,
    Course_ID: c.Course_ID, Joined_Date: new Date().toISOString()
  });
  logAction(q.regNo, 'Joined Course: '+c.Course_Name);
  return { success:true, course:c };
}

function getCourseContent(q) {
  const c = getData('Course_Content').filter(x => String(x.Course_ID)===String(q.courseId));
  c.sort((a,b) => Number(a.Order_Index)-Number(b.Order_Index));
  return { success:true, contents:c };
}

function markProgress(q) {
  const p = getData('Progress_Tracking');
  const ex = p.find(x => String(x.Reg_No)===String(q.regNo) && String(x.Content_ID)===String(q.contentId));
  if (ex) updateRow('Progress_Tracking','Progress_ID', ex.Progress_ID, { Status:q.status });
  else appendRow('Progress_Tracking', { Progress_ID:uid('PRG'), Reg_No:q.regNo, Content_ID:q.contentId, Status:q.status });
  return { success:true };
}

function getProgress(q) {
  return { success:true, progress: getData('Progress_Tracking').filter(x => String(x.Reg_No)===String(q.regNo)) };
}

function getAnnouncements(q) {
  const a = getData('Announcements').filter(x => String(x.Course_ID)===String(q.courseId));
  a.sort((x,y) => new Date(y.Posted_Date)-new Date(x.Posted_Date));
  return { success:true, announcements:a };
}

function getQuizzes(q) {
  return { success:true, quizzes: getData('Quizzes_Assignments').filter(x => String(x.Course_ID)===String(q.courseId)) };
}

function getStudentSubmissions(q) {
  return { success:true, submissions: getData('Student_Submissions').filter(x => String(x.Reg_No)===String(q.regNo)) };
}

// ══════════════════════════════════════════════════
// ADMIN / LECTURER
// ══════════════════════════════════════════════════

function canManage(adminId, role, courseId) {
  if (role === 'Super_Admin') return true;
  const c = getData('Courses').find(x => String(x.Course_ID)===String(courseId));
  if (c && String(c.Created_By)===String(adminId)) return true;
  return getData('Course_Assignments').some(x => String(x.Admin_ID)===String(adminId) && String(x.Course_ID)===String(courseId));
}

function getAdminCourses(q) {
  let c = getData('Courses');
  if (q.role !== 'Super_Admin') {
    const assigned = getData('Course_Assignments').filter(x => String(x.Admin_ID)===String(q.adminId)).map(x => String(x.Course_ID));
    c = c.filter(x => String(x.Created_By)===String(q.adminId) || assigned.includes(String(x.Course_ID)));
  }
  return { success:true, courses:c };
}

function createCourse(q) {
  const id  = uid('CRS');
  const pin = Math.random().toString(36).substr(2,6).toUpperCase();
  appendRow('Courses', { Course_ID:id, Course_Name:q.name, Course_Description:q.description||'', Course_PIN:pin, Thumbnail_URL:q.thumbnail||'', Created_By:q.adminId });
  logAction(q.adminId, 'Created Course: '+q.name);
  return { success:true, courseId:id, pin };
}

function updateCourse(q) {
  if (!canManage(q.adminId, q.role, q.courseId)) return { success:false, message:'Permission denied.' };
  updateRow('Courses','Course_ID', q.courseId, { Course_Name:q.name, Course_Description:q.description||'', Thumbnail_URL:q.thumbnail||'' });
  logAction(q.adminId, 'Updated Course: '+q.courseId);
  return { success:true };
}

function deleteCourse(q) {
  if (!canManage(q.adminId, q.role, q.courseId)) return { success:false, message:'Permission denied.' };
  deleteRow('Courses','Course_ID', q.courseId);
  logAction(q.adminId, 'Deleted Course: '+q.courseId);
  return { success:true };
}

function addContent(q) {
  if (!canManage(q.adminId, q.role, q.courseId)) return { success:false, message:'Permission denied.' };
  const existing = getData('Course_Content').filter(x => String(x.Course_ID)===String(q.courseId));
  appendRow('Course_Content', { Content_ID:uid('CNT'), Course_ID:q.courseId, Topic_Title:q.title, Content_Type:q.type, Data_Link:q.link, Order_Index:existing.length+1 });
  return { success:true };
}

function updateContent(q) {
  updateRow('Course_Content','Content_ID', q.contentId, { Topic_Title:q.title, Content_Type:q.type, Data_Link:q.link });
  return { success:true };
}

function deleteContent(q) { deleteRow('Course_Content','Content_ID', q.contentId); return { success:true }; }

function getCourseStudents(q) {
  const enrolls = getData('Enrollments').filter(e => String(e.Course_ID)===String(q.courseId));
  const students = getData('Users');
  return { success:true, students: enrolls.map(e => {
    const s = students.find(x => String(x.Reg_No)===String(e.Reg_No));
    return s ? { ...s, joinedDate:e.Joined_Date, enrollmentId:e.Enrollment_ID } : null;
  }).filter(Boolean) };
}

function removeStudent(q) {
  deleteRow('Enrollments','Enrollment_ID', q.enrollmentId);
  logAction(q.adminId, 'Removed student from course '+q.courseId);
  return { success:true };
}

function addAnnouncement(q) {
  appendRow('Announcements', { Announcement_ID:uid('ANN'), Course_ID:q.courseId, Title:q.title, Message:q.message, Posted_Date:new Date().toISOString() });
  return { success:true };
}

function deleteAnnouncement(q) { deleteRow('Announcements','Announcement_ID', q.announcementId); return { success:true }; }

function addQuiz(q) {
  appendRow('Quizzes_Assignments', { Quiz_ID:uid('QZ'), Course_ID:q.courseId, Quiz_Title:q.title, Google_Form_Link:q.formLink, Deadline:q.deadline||'' });
  return { success:true };
}

function deleteQuiz(q) { deleteRow('Quizzes_Assignments','Quiz_ID', q.quizId); return { success:true }; }

function gradeSubmission(q) {
  const ex = getData('Student_Submissions').find(x => String(x.Reg_No)===String(q.regNo) && String(x.Quiz_ID)===String(q.quizId));
  if (ex) updateRow('Student_Submissions','Submission_ID', ex.Submission_ID, { Result_Grade:q.grade });
  else appendRow('Student_Submissions', { Submission_ID:uid('SUB'), Reg_No:q.regNo, Course_ID:q.courseId, Quiz_ID:q.quizId, Result_Grade:q.grade, Submission_Date:new Date().toISOString() });
  return { success:true };
}

// ══════════════════════════════════════════════════
// SUPER ADMIN
// ══════════════════════════════════════════════════

function getAllAdmins() {
  const a = getData('Admins');
  return { success:true, admins: a.map(x => ({ ...x, Admin_Password:'***' })) };
}

function addAdmin(q) {
  // Check for duplicate username
  if (getData('Admins').find(a => a.Admin_Username === q.username))
    return { success:false, message:'Username already exists.' };
  appendRow('Admins', {
    Admin_ID: q.customId || uid('ADM'),
    Admin_Name: q.name,
    Admin_Username: q.username,
    Admin_Password: q.password,
    Role: q.role || 'Lecturer',
    Admin_Department: q.department||'',
    Admin_Email: q.email||''
  });
  logAction(q.superAdminId, 'Added Lecturer: '+q.username);
  return { success:true };
}

function deleteAdmin(q) {
  deleteRow('Admins','Admin_ID', q.adminId);
  logAction(q.superAdminId, 'Deleted Admin: '+q.adminId);
  return { success:true };
}

function approveLecturer(q) {
  // Approve pending → set Role to 'Lecturer'
  const updated = updateRow('Admins','Admin_ID', q.adminId, { Role:'Lecturer' });
  if (!updated) return { success:false, message:'Account not found.' };
  logAction(q.superAdminId, 'Approved Lecturer: '+q.adminId);
  return { success:true };
}

function assignAdminId(q) {
  // Also approve + set custom Admin_ID
  const admins = getData('Admins');
  const a = admins.find(x => String(x.Admin_ID)===String(q.adminId));
  if (!a) return { success:false, message:'Account not found.' };
  // Check if newAdminId already used
  if (admins.find(x => String(x.Admin_ID)===String(q.newAdminId) && String(x.Admin_ID)!==String(q.adminId)))
    return { success:false, message:'That Admin ID is already in use.' };

  const sh = gs('Admins');
  const d  = sh.getDataRange().getValues();
  const h  = d[0];
  const idIdx  = h.indexOf('Admin_ID');
  const rolIdx = h.indexOf('Role');
  for (let i=1; i<d.length; i++) {
    if (String(d[i][idIdx])===String(q.adminId)) {
      sh.getRange(i+1, idIdx+1).setValue(q.newAdminId);
      sh.getRange(i+1, rolIdx+1).setValue('Lecturer');
      break;
    }
  }
  logAction(q.superAdminId, 'Assigned ID '+q.newAdminId+' to '+q.adminId);
  return { success:true };
}

function disableLecturer(q) {
  updateRow('Admins','Admin_ID', q.adminId, { Role:'Disabled' });
  logAction(q.superAdminId, 'Disabled Lecturer: '+q.adminId);
  return { success:true };
}

function enableLecturer(q) {
  updateRow('Admins','Admin_ID', q.adminId, { Role:'Lecturer' });
  logAction(q.superAdminId, 'Re-enabled Lecturer: '+q.adminId);
  return { success:true };
}

function getAllStudents() {
  return { success:true, students: getData('Users') };
}

function addStudent(q) {
  if (getData('Users').find(s => String(s.Reg_No)===String(q.nic)))
    return { success:false, message:'This NIC/Passport already exists.' };
  appendRow('Users', { Reg_No:q.nic, User_Name:q.name, Login_PIN:q.pin, Email:q.email||'', Account_Status:'Active' });
  logAction(q.superAdminId, 'Added Student: '+q.nic);
  return { success:true };
}

function deleteStudent(q) {
  deleteRow('Users','Reg_No', q.regNo);
  logAction(q.superAdminId, 'Deleted Student: '+q.regNo);
  return { success:true };
}

function toggleStudentStatus(q) {
  const s = getData('Users').find(x => String(x.Reg_No)===String(q.regNo));
  if (!s) return { success:false, message:'Student not found.' };
  const ns = s.Account_Status==='Active' ? 'Inactive' : 'Active';
  updateRow('Users','Reg_No', q.regNo, { Account_Status:ns });
  logAction(q.superAdminId, ns+' Student: '+q.regNo);
  return { success:true, newStatus:ns };
}

function getAllCourses() {
  const courses = getData('Courses');
  const admins  = getData('Admins');
  return { success:true, courses: courses.map(c => {
    const a = admins.find(x => String(x.Admin_ID)===String(c.Created_By));
    return { ...c, creatorName: a ? a.Admin_Name : 'Unknown' };
  }) };
}

function assignCourse(q) {
  const ex = getData('Course_Assignments').find(x => String(x.Admin_ID)===String(q.adminId) && String(x.Course_ID)===String(q.courseId));
  if (ex) return { success:false, message:'Already assigned to this lecturer.' };
  appendRow('Course_Assignments', { Assignment_ID:uid('ASG'), Admin_ID:q.adminId, Course_ID:q.courseId, Assigned_Date:new Date().toISOString() });
  logAction(q.superAdminId, 'Assigned Course '+q.courseId+' → '+q.adminId);
  return { success:true };
}

function getActivityLogs() {
  const logs = getData('Activity_Logs');
  logs.sort((a,b) => new Date(b.Timestamp)-new Date(a.Timestamp));
  return { success:true, logs: logs.slice(0,150) };
}
