/* ============================================================
   Classwork Hub — avatar.js
   ระบบเลือกและสุ่มสร้าง Avatar ด้วย AI (Dicebear + Emojis + Upload)
   ============================================================ */
'use strict';

let selectedAvatar = null;
let currentAvatarTab = 'ai-bots';

// คลัง Avatar สำเร็จรูป
const AVATAR_PRESETS = {
  'ai-bots': [
    'https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot1&backgroundColor=ffd5dc,d1d4f9,c0aede',
    'https://api.dicebear.com/7.x/bottts/svg?seed=NeonSpark&backgroundColor=b6e3f4,c0aede,d1d4f9',
    'https://api.dicebear.com/7.x/bottts/svg?seed=PixelPulse&backgroundColor=ffd5dc,ffdfbf',
    'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumAI&backgroundColor=c0aede,b6e3f4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=CosmicDrive&backgroundColor=d1d4f9,ffd5dc',
    'https://api.dicebear.com/7.x/bottts/svg?seed=GigaVolt&backgroundColor=ffdfbf,ffd5dc',
    'https://api.dicebear.com/7.x/bottts/svg?seed=NexusPrime&backgroundColor=b6e3f4,d1d4f9',
    'https://api.dicebear.com/7.x/bottts/svg?seed=ZeroOne&backgroundColor=c0aede,ffd5dc',
    'https://api.dicebear.com/7.x/bottts/svg?seed=VortexMecha&backgroundColor=ffd5dc,b6e3f4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=AeroDroid&backgroundColor=d1d4f9,ffdfbf'
  ],
  'ai-characters': [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=ArtHero1&backgroundColor=b6e3f4,c0aede',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=CreativeNova&backgroundColor=ffd5dc,d1d4f9',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=MasterMind&backgroundColor=d1d4f9,c0aede',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=DesignPro&backgroundColor=ffdfbf,ffd5dc',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=AnimeStar1&backgroundColor=ffd5dc,b6e3f4',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=SakuraBloom&backgroundColor=c0aede,d1d4f9',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=ChronoArtist&backgroundColor=b6e3f4,ffd5dc',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=StudioMage&backgroundColor=ffdfbf,c0aede',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=TechLeader&backgroundColor=d1d4f9,ffd5dc',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=SmartCoder&backgroundColor=b6e3f4,c0aede'
  ],
  'pixel-art': [
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=RetroGamer1',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=ArcadeMaster',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=BitPixel8',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=CyberNinja',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=NeonKnight',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=ChiptuneKing',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=SpaceInvader',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=RetroPixel9',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=QuestPixel',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=VoxelHero'
  ],
  'emojis': [
    '👩‍🏫', '👨‍🏫', '🧑‍🎓', '🎨', '💻', 
    '🤖', '🚀', '🐱', '🦊', '🐼', 
    '🐯', '🦄', '👾', '⚡', '🌈', 
    '🔮', '🪐', '🏆', '🎯', '🧸'
  ]
};

function openAvatarPickerModal(){
  const isTeacher = role === 'teacher';
  const current = getSavedAvatar(isTeacher ? TEACHER : (studentName || ''), isTeacher);
  selectedAvatar = current;
  updateAvatarPreview(current);
  switchAvatarTab('ai-bots');
  openModal('avatarPickerModal');
}

function switchAvatarTab(tab){
  currentAvatarTab = tab;
  document.querySelectorAll('.avatar-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  const grid = document.getElementById('avatarGrid');
  if(!grid) return;

  if (tab === 'ai-random') {
    generateRandomAiAvatars();
    return;
  }

  if (tab === 'upload') {
    grid.innerHTML = `
      <div style="grid-column:1/-1; padding:20px; text-align:center; background:#fff; border:2px solid #000; border-radius:2px">
        <p style="font-size:14px; margin-bottom:12px; font-weight:600">อัปโหลดรูปโปรไฟล์ของคุณเอง</p>
        <label class="btn btn-primary" style="cursor:pointer; display:inline-flex; align-items:center; gap:8px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          เลือกรูปภาพจากเครื่อง
          <input type="file" accept="image/*" style="display:none" onchange="handleCustomAvatarUpload(this)">
        </label>
        <p style="font-size:12px; color:var(--muted-fg); margin-top:10px">รองรับ JPG, PNG, GIF (จัดเก็บปลอดภัยบน Cloudinary)</p>
      </div>
    `;
    return;
  }

  const items = AVATAR_PRESETS[tab] || [];
  let html = '';
  items.forEach(item => {
    const isSelected = selectedAvatar === item;
    if (item.startsWith('http')) {
      html += `<div class="avatar-option ${isSelected ? 'selected' : ''}" onclick="selectAvatarOption('${esc(item)}', this)">
        <img src="${esc(item)}" alt="avatar">
      </div>`;
    } else {
      html += `<div class="avatar-option ${isSelected ? 'selected' : ''}" onclick="selectAvatarOption('${esc(item)}', this)">
        ${esc(item)}
      </div>`;
    }
  });
  grid.innerHTML = html;
}

function generateRandomAiAvatars(){
  const grid = document.getElementById('avatarGrid');
  if(!grid) return;

  const styles = ['bottts', 'adventurer', 'lorelei', 'pixel-art', 'notionists', 'fun-emoji', 'avataaars'];
  const bgPalettes = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];

  let html = `
    <div style="grid-column:1/-1; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
      <span style="font-size:13px; font-weight:700">🎲 AI สุ่มตัวละครใหม่ไม่ซ้ำใคร:</span>
      <button class="btn btn-soft" style="font-size:12px; padding:4px 10px" onclick="generateRandomAiAvatars()">🔄 สุ่มชุดใหม่</button>
    </div>
  `;

  for(let i = 0; i < 15; i++){
    const st = styles[Math.floor(Math.random() * styles.length)];
    const bg = bgPalettes[Math.floor(Math.random() * bgPalettes.length)];
    const seed = 'Art_' + Math.random().toString(36).slice(2, 8);
    const url = `https://api.dicebear.com/7.x/${st}/svg?seed=${seed}&backgroundColor=${bg}`;
    
    html += `<div class="avatar-option ${selectedAvatar === url ? 'selected' : ''}" onclick="selectAvatarOption('${esc(url)}', this)">
      <img src="${esc(url)}" alt="ai-avatar">
    </div>`;
  }

  grid.innerHTML = html;
}

function selectAvatarOption(val, el){
  selectedAvatar = val;
  document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
  if (el) el.classList.add('selected');
  updateAvatarPreview(val);
}

function updateAvatarPreview(val){
  const previewEl = document.getElementById('avatarPreview');
  if (!previewEl) return;
  if (!val) {
    previewEl.innerHTML = (role === 'teacher' ? '👩‍🏫' : '🧑‍🎓');
    return;
  }
  if (val.startsWith('http') || val.startsWith('data:image')) {
    previewEl.innerHTML = `<img src="${esc(val)}" alt="avatar" style="width:100%; height:100%; object-fit:cover">`;
  } else {
    previewEl.innerHTML = esc(val);
  }
}

async function handleCustomAvatarUpload(input){
  if (!input.files || !input.files[0]) return;
  toast('⏳ กำลังอัปโหลดรูปภาพโปรไฟล์เข้า Cloudinary...');
  const res = await uploadToCloudinary(input.files[0]);
  if (res && res.url) {
    selectedAvatar = res.url;
    updateAvatarPreview(res.url);
    toast('✅ อัปโหลดสำเร็จแล้ว! กดบันทึกเพื่อใช้งาน');
  } else {
    toast('❌ อัปโหลดรูปภาพไม่สำเร็จ');
  }
}

async function saveSelectedAvatar(){
  if (!selectedAvatar) {
    toast('กรุณาเลือก Avatar ก่อนบันทึก');
    return;
  }

  const isTeacher = role === 'teacher';
  if (isTeacher) {
    localStorage.setItem('cwh_teacher_avatar', selectedAvatar);
    localStorage.setItem('cwh_avatar_' + currentTeacherName(), selectedAvatar);
    localStorage.setItem('cwh_avatar_คุณครู', selectedAvatar);
    
    // Sync with database teachers table
    try {
      const teachers = await API.getTeachers();
      const currentT = teachers.find(t => t.name === currentTeacherName()) || teachers[0];
      if (currentT) {
        await API.updateTeacher(currentT.id, { avatar: selectedAvatar });
      }
    } catch (_) {}
  } else {
    localStorage.setItem('cwh_student_avatar', selectedAvatar);
    if (studentName) {
      localStorage.setItem('cwh_avatar_' + studentName, selectedAvatar);
    }
    if (studentId) {
      localStorage.setItem('cwh_avatar_' + studentId, selectedAvatar);
    }
  }

  closeModal('avatarPickerModal');
  toast('🎨 บันทึกรูปโปรไฟล์ Avatar เรียบร้อย!');
  renderHeader();
  render();
}