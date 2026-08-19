/* ============================================================
   Classwork Hub — utils.js
   ตัวช่วยทั่วไป + ไอคอน SVG + ระบบยืนยันรหัสครู (PIN) + นักศึกษา (4 เลขท้าย)
   ============================================================ */
'use strict';

const TEACHER = 'คุณครู';
const MAX_FILE = 5 * 1024 * 1024; // จำกัดขนาดไฟล์ 5MB (มีระบบบีบอัดภาพอัตโนมัติ)

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nowISO = () => new Date().toISOString();

function fmtDate(iso){
  if(!iso) return '';
  try{ return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)); }
  catch(e){ return new Date(iso).toLocaleString(); }
}
function fmtDateShort(iso){
  if(!iso) return '';
  try{ return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric'}).format(new Date(iso)); }
  catch(e){ return new Date(iso).toLocaleDateString(); }
}

/* ---------- Toast & Modal ---------- */
function toast(msg){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'), 2800);
}
function closeModal(id){ 
  const el = document.getElementById(id);
  if (el) el.classList.remove('show'); 
}
function openModal(id){ 
  const el = document.getElementById(id);
  if (el) el.classList.add('show'); 
}

/* ---------- Teacher PIN Verification ---------- */
function verifyTeacherPin(callback) {
  if (sessionStorage.getItem('cwh_teacher_auth') === 'true') {
    if (callback) callback(true);
    return true;
  }
  openModal('pinModal');
  const input = document.getElementById('pinInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  window._pendingPinCallback = callback;
  return false;
}

async function submitTeacherPin() {
  const input = document.getElementById('pinInput');
  const entered = (input ? input.value : '').trim();
  if (!entered) {
    toast('กรุณาใส่รหัสผ่านครู');
    return false;
  }

  toast('🔍 กำลังตรวจสอบรหัสผ่านครู...');
  const res = await API.verifyTeacherPin(entered);
  if (res && res.valid && res.teacher) {
    sessionStorage.setItem('cwh_teacher_auth', 'true');
    if (res.teacher.name) {
      localStorage.setItem('cwh_teacher_name', res.teacher.name);
    }
    if (res.teacher.avatar) {
      localStorage.setItem('cwh_teacher_avatar', res.teacher.avatar);
    }
    closeModal('pinModal');
    toast(`🔓 ยินดีต้อนรับ ${res.teacher.name || 'คุณครู'}`);
    if (window._pendingPinCallback) {
      window._pendingPinCallback(true);
      window._pendingPinCallback = null;
    }
    return true;
  } else {
    toast('❌ รหัสผ่านครูไม่ถูกต้อง');
    if (input) {
      input.value = '';
      input.focus();
    }
    return false;
  }
}

/* ---------- Student Verification (8-digit Code: 4 front + 4 back) ---------- */
function ensureStudentName(callback) {
  if (role === 'teacher') {
    if (callback) callback(true);
    return true;
  }
  if (studentName) {
    if (callback) callback(true);
    return true;
  }

  // Open Student Login Modal
  openModal('studentLoginModal');
  const input = document.getElementById('studentCodeInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  window._pendingStudentCallback = callback;
  return false;
}

async function submitStudentLogin() {
  const input = document.getElementById('studentCodeInput');
  const code = (input ? input.value : '').trim();
  if (!code) {
    toast('กรุณากรอกรหัสนักศึกษา 8 ตัว (4 ตัวหน้า + 4 ตัวท้าย)');
    return;
  }

  toast('🔍 กำลังตรวจสอบรหัสนักศึกษา 8 ตัว...');
  const res = await API.verifyStudent(code);
  if (res && res.valid && res.student) {
    studentName = res.student.fullName;
    studentId = res.student.studentId;
    studentCode = res.student.studentCode;
    localStorage.setItem(STUDENT_KEY, studentName);
    localStorage.setItem('cwh_student_id_v1', studentId);
    localStorage.setItem('cwh_student_code_v1', studentCode);
    closeModal('studentLoginModal');
    toast(`👋 ยินดีต้อนรับ: ${studentName} (${studentCode})`);
    renderHeader();
    render();
    if (window._pendingStudentCallback) {
      window._pendingStudentCallback(true);
      window._pendingStudentCallback = null;
    }
  } else {
    const msg = (res && res.error) ? res.error : 'ไม่พบรหัสนี้ในระบบ (กรุณาตรวจสอบรหัส 8 ตัว: 4 ตัวหน้า + 4 ตัวท้าย)';
    toast(`❌ ${msg}`);
  }
}

function switchStudentUser() {
  studentName = '';
  studentId = '';
  studentCode = '';
  localStorage.removeItem(STUDENT_KEY);
  localStorage.removeItem('cwh_student_id_v1');
  localStorage.removeItem('cwh_student_code_v1');
  ensureStudentName();
}

function logoutTeacher() {
  if (!confirm('ต้องการออกจากระบบครูหรือไม่?')) return;
  sessionStorage.removeItem('cwh_teacher_auth');
  role = 'student';
  localStorage.setItem(ROLE_KEY, 'student');
  toast('🔒 ออกจากระบบครูเรียบร้อย');
  showScreen('feed');
}

function logoutStudent() {
  if (!confirm('ต้องการออกจากระบบนักเรียนหรือไม่?')) return;
  studentName = '';
  studentId = '';
  studentCode = '';
  localStorage.removeItem(STUDENT_KEY);
  localStorage.removeItem('cwh_student_id_v1');
  localStorage.removeItem('cwh_student_code_v1');
  toast('👋 ออกจากระบบนักเรียนเรียบร้อย');
  showScreen('feed');
}

/* ---------- Identity ---------- */
function currentTeacherName() {
  return localStorage.getItem('cwh_teacher_name') || TEACHER;
}
function currentIdentity(){ return role === 'teacher' ? currentTeacherName() : (studentName || ''); }

/* ---------- Files & Lightbox ---------- */
function openFile(dataUrl, name){
  if(!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl; a.download = name || 'file'; a.target = '_blank';
  document.body.appendChild(a); a.click(); a.remove();
}

function openLightbox(dataUrl, name){
  if(!dataUrl) return;
  document.getElementById('lightboxImg').src = dataUrl;
  document.getElementById('lightboxName').textContent = name || '';
  openModal('lightboxModal');
}

function ytEmbed(url){
  const m = String(url||'').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? 'https://www.youtube.com/embed/' + m[1] : null;
}

/* ---------- ไอคอน SVG (Lucide style) ---------- */
const ICONS = {
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/></svg>',
  heartFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 12 2 2 4-4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  userCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>'
};

/* ---------- Metadata สำหรับโพสต์แต่ละประเภท ---------- */
const POST_META = {
  example:   { label:'ตัวอย่างงาน',        cls:'chip-indigo' },
  video:     { label:'วิดีโอ / ตัวอย่างการสร้างงาน', cls:'chip-rose' },
  tutorial:  { label:'ขั้นตอนการทำ',       cls:'chip-green' },
  inspiration:{ label:'แรงบันดาลใจ',       cls:'chip-amber' },
  announcement:{ label:'ประกาศ',           cls:'chip-gray' }
};
const AVATAR_CLASSES = ['','alt1','alt2','alt3'];

function getSavedAvatar(name, isTeacher) {
  if (isTeacher || name === TEACHER || (role === 'teacher' && !name)) {
    return localStorage.getItem('cwh_teacher_avatar') || '👩‍🏫';
  }
  if (name) {
    return localStorage.getItem('cwh_avatar_' + name) || (name === studentName ? localStorage.getItem('cwh_student_avatar') : null) || '';
  }
  return localStorage.getItem('cwh_student_avatar') || '';
}

function avatarOf(name, seedIdx, customAvatar){
  const cls = AVATAR_CLASSES[(seedIdx||0) % AVATAR_CLASSES.length];
  const isTeacher = name === TEACHER || (role === 'teacher' && !name);
  const avatar = customAvatar || getSavedAvatar(name, isTeacher);

  if (avatar) {
    if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:image')) {
      return `<div class="avatar ${cls} clickable" onclick="openAvatarPickerModal()" title="คลิกเพื่อเปลี่ยน Avatar"><img src="${esc(avatar)}" alt="avatar"></div>`;
    }
    return `<div class="avatar ${cls} clickable" onclick="openAvatarPickerModal()" title="คลิกเพื่อเปลี่ยน Avatar" style="font-size:22px">${esc(avatar)}</div>`;
  }

  const ch = (name || '?').trim().charAt(0).toUpperCase();
  return `<div class="avatar ${cls} clickable" onclick="openAvatarPickerModal()" title="คลิกเพื่อเปลี่ยน Avatar">${esc(ch)}</div>`;
}