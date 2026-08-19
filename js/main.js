/* ============================================================
   Classwork Hub — main.js
   จุดเริ่มต้น: header, navigation, การสลับโหมด, Dual-Mode Indicator, init
   โหลดเป็นไฟล์สุดท้ายเสมอ
   ============================================================ */
'use strict';

let currentScreen = 'feed';

/* ---------- Header (nav + role switch + cloud status) ---------- */
function renderHeader(){
  const nav = document.getElementById('nav');
  const tabs = [];
  tabs.push({ id:'feed', label:'ฟีด', icon: ICONS.share });
  if(role === 'teacher') tabs.push({ id:'grading', label:'ตรวจงาน', icon: ICONS.clipboard });
  tabs.push({ id:'assignments', label:'ใบงาน', icon: ICONS.clipboard });
  if(role === 'student') tabs.push({ id:'results', label:'ผลงานของฉัน', icon: ICONS.star });
  nav.innerHTML = tabs.map(t =>
    '<button class="nav-tab '+(currentScreen===t.id?'active':'')+'" data-screen="'+t.id+'" onclick="showScreen(\''+t.id+'\')">'+t.icon+'<span>'+t.label+'</span></button>'
  ).join('');

  const rs = document.getElementById('roleSwitch');
  const modeBadge = API.isCloudConnected
    ? '<span class="status-badge cloud" title="เชื่อมต่อ Cloudflare D1 เรียบร้อย" onclick="openApiSettingsModal()">🟢 Cloud</span>'
    : '<span class="status-badge local" title="โหมดออฟไลน์ (LocalStorage)" onclick="openApiSettingsModal()">🟡 Local</span>';

  let userBadge = '';
  if (role === 'student') {
    if (studentName) {
      const stuAvatar = getSavedAvatar(studentName, false);
      const stuAvatarHtml = stuAvatar && stuAvatar.startsWith('http')
        ? `<img src="${esc(stuAvatar)}" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:4px">`
        : (stuAvatar || '👤') + ' ';
      userBadge = `<span class="chip chip-indigo" style="cursor:pointer; font-weight:700" onclick="openAvatarPickerModal()" title="คลิกเพื่อเปลี่ยน Avatar">${stuAvatarHtml}${esc(studentName)} (${esc(studentCode || 'นศ.')})</span>` +
        `<button class="btn btn-ghost" style="padding:4px 8px; font-size:12px" onclick="switchStudentUser()" title="สลับบัญชีนักศึกษา">🔄 สลับ</button>`;
    }
  } else if (role === 'teacher') {
    const teachAvatar = getSavedAvatar(TEACHER, true);
    const teachAvatarHtml = teachAvatar && teachAvatar.startsWith('http')
      ? `<img src="${esc(teachAvatar)}" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:4px">`
      : teachAvatar + ' ';
    userBadge = `<button class="btn btn-soft" style="padding:4px 10px; font-size:13px; font-weight:700" onclick="openAvatarPickerModal()" title="คลิกเพื่อเปลี่ยน Avatar ครู">${teachAvatarHtml}เปลี่ยน Avatar</button>`;
  }

  rs.innerHTML =
    modeBadge +
    userBadge +
    '<button class="'+(role==='teacher'?'active':'')+'" onclick="switchRole(\'teacher\')">👩‍🏫 ครู</button>'+
    '<button class="'+(role==='student'?'active':'')+'" onclick="switchRole(\'student\')">🧑‍🎓 นักเรียน</button>';

  const addBtns = document.getElementById('feedAddBtns');
  if(addBtns) {
    addBtns.innerHTML = role==='teacher'
      ? '<button class="btn btn-soft" onclick="openTeacherSettingsModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>ตั้งค่าครู</button>' +
        '<button class="btn btn-soft" onclick="openStudentManagerModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>จัดการรายชื่อนักศึกษา</button>' +
        '<button class="btn btn-primary" onclick="openModal(\'postModal\')">'+ICONS.plus+'สร้างโพสต์</button>'
      : '';
  }
}

/* ---------- Navigation ---------- */
function showScreen(name){
  currentScreen = name;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const target = document.getElementById('screen-'+name);
  if(target) target.classList.add('active');
  renderHeader();
  render();
}

function switchRole(r){
  if (r === 'teacher') {
    verifyTeacherPin((ok) => {
      if (ok) {
        role = 'teacher';
        localStorage.setItem(ROLE_KEY, 'teacher');
        showScreen('feed');
      }
    });
    return;
  }
  
  // Switch to Student
  role = 'student';
  localStorage.setItem(ROLE_KEY, 'student');
  if(!studentName) {
    ensureStudentName(() => {
      showScreen(currentScreen === 'grading' ? 'feed' : currentScreen);
    });
  } else {
    showScreen(currentScreen === 'grading' ? 'feed' : currentScreen);
  }
}

/* ---------- Cloudflare API Settings Modal ---------- */
function openApiSettingsModal(){
  const input = document.getElementById('apiUrlInput');
  if (input) input.value = localStorage.getItem('cwh_api_url') || '';
  const statusEl = document.getElementById('apiStatusText');
  if (statusEl) {
    statusEl.innerHTML = API.isCloudConnected
      ? '<span style="color:var(--success)">🟢 เชื่อมต่อ Cloudflare D1 Backend สำเร็จ (' + (APP_CONFIG.getApiUrl() || 'Same Origin') + ')</span>'
      : '<span style="color:var(--warn)">🟡 ทำงานในโหมด LocalStorage (ออฟไลน์ / ไม่ได้ต่อ API)</span>';
  }
  openModal('apiSettingsModal');
}

async function saveApiSettings(){
  const input = document.getElementById('apiUrlInput');
  const val = input ? input.value.trim() : '';
  APP_CONFIG.setApiUrl(val);
  toast('🔄 กำลังทดสอบการเชื่อมต่อ...');
  await API.init();
  await API.syncAll();
  closeModal('apiSettingsModal');
  renderHeader();
  if (API.isCloudConnected) {
    toast('✅ เชื่อมต่อ Cloudflare D1 สำเร็จ!');
  } else {
    toast('🟡 สลับเข้าสู่โหมด LocalStorage เรียบร้อย');
  }
}

/* ---------- ตัวกระจายการ render ตามหน้าจอ ---------- */
function render(){
  if(currentScreen === 'feed') renderFeed();
  else if(currentScreen === 'assignments') renderAssignments();
  else if(currentScreen === 'results') renderResults();
  else if(currentScreen === 'grading') renderGrading();
}

/* ---------- Data utils ---------- */
function clearAllData(){
  if(!confirm('ลบข้อมูลทั้งหมด (โพสต์ ใบงาน งานที่ส่ง คะแนน)?')) return;
  data = defaultData();
  localStorage.setItem(KEY, JSON.stringify(data));
  render(); 
  toast('🗑️ ล้างข้อมูลทั้งหมดเรียบร้อย');
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  await load();
  showScreen('feed');
});