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

  rs.innerHTML =
    modeBadge +
    '<button class="'+(role==='teacher'?'active':'')+'" onclick="switchRole(\'teacher\')">👩‍🏫 ครู</button>'+
    '<button class="'+(role==='student'?'active':'')+'" onclick="switchRole(\'student\')">🧑‍🎓 นักเรียน</button>';

  const addBtns = document.getElementById('feedAddBtns');
  if(addBtns) addBtns.innerHTML = role==='teacher'
    ? '<button class="btn btn-primary" onclick="openModal(\'postModal\')">'+ICONS.plus+'สร้างโพสต์</button>'
    : '';
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
  if(!studentName) ensureStudentName();
  showScreen(currentScreen === 'grading' ? 'feed' : currentScreen);
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