/* ============================================================
   Classwork Hub — modals.js
   ฟอร์มสร้างโพสต์ + ฟอร์มสร้างใบงาน + จัดการรายชื่อนักศึกษา (D1 Sync)
   ============================================================ */
'use strict';

let pendingPost = { image:null, videoFile:null };
let pendingAs = { attachment:null };

/* ---------- สร้างโพสต์ ---------- */
function openPostModal(){
  pendingPost = { image:null, videoFile:null };
  document.getElementById('postType').value = 'example';
  document.getElementById('postTitle').value = '';
  document.getElementById('postText').value = '';
  document.getElementById('postVideoUrl').value = '';
  document.getElementById('postImgLabel').textContent = 'คลิกเพื่อเลือกรูปภาพ';
  document.getElementById('postImgLabel').parentElement.classList.remove('has-file');
  document.getElementById('postVideoLabel').textContent = 'คลิกเพื่อเลือกไฟล์วิดีโอ';
  document.getElementById('postVideoLabel').parentElement.classList.remove('has-file');
  openModal('postModal');
}

function onPickFile(input, labelId){
  const label = document.getElementById(labelId);
  if(input.files && input.files[0]){
    label.textContent = input.files[0].name;
    label.parentElement.classList.add('has-file');
  }else{
    label.textContent = input.getAttribute('data-empty') || 'คลิกเพื่อเลือกไฟล์';
    label.parentElement.classList.remove('has-file');
  }
}

function onPickMultipleFiles(input, labelId, max){
  const label = document.getElementById(labelId);
  const files = input.files;
  if(files && files.length){
    const n = Math.min(files.length, max);
    label.textContent = n + ' ไฟล์ถูกเลือก' + (files.length > max ? ' (จำกัด ' + max + ' ไฟล์)' : '');
    label.parentElement.classList.add('has-file');
  }else{
    label.textContent = 'คลิกเพื่อเลือกรูปภาพตัวอย่าง';
    label.parentElement.classList.remove('has-file');
  }
}

async function savePost(){
  const type = document.getElementById('postType').value;
  const title = document.getElementById('postTitle').value.trim();
  const text = document.getElementById('postText').value.trim();
  const videoUrl = document.getElementById('postVideoUrl').value.trim();
  if(!title && !text){ toast('กรุณาใส่หัวข้อหรือเนื้อหา'); return; }

  const imgInput = document.getElementById('postImg');
  const vidInput = document.getElementById('postVideoFile');

  let uploadedImgUrl = null;
  let uploadedVid = null;

  try {
    if (imgInput.files && imgInput.files[0]) {
      const res = await uploadToCloudinary(imgInput.files[0]);
      if (res) uploadedImgUrl = res.url;
    }
    if (vidInput.files && vidInput.files[0]) {
      const res = await uploadToCloudinary(vidInput.files[0]);
      if (res) uploadedVid = { name: res.name, dataUrl: res.url, url: res.url, type: res.type };
    }

    const newPost = {
      id: uid(),
      type,
      title: title || '(ไม่มีหัวข้อ)',
      text,
      author: TEACHER,
      image: uploadedImgUrl,
      videoUrl: videoUrl || null,
      videoFile: uploadedVid,
      createdAt: nowISO(),
      likes: [],
      comments: []
    };

    await API.createPost(newPost);
    closeModal('postModal');
    showScreen('feed');
    toast('📢 สร้างโพสต์สำเร็จ');
  } catch (err) {
    console.error(err);
    toast('❌ เกิดข้อผิดพลาดในการบันทึกโพสต์');
  }
}

/* ---------- สร้างใบงาน ---------- */
function openAssignModal(){
  pendingAs = { attachment:null, exampleImages:[] };
  const due = new Date(Date.now()+7*86400000);
  const pad = n=>String(n).padStart(2,'0');
  document.getElementById('asDue').value = due.getFullYear()+'-'+pad(due.getMonth()+1)+'-'+pad(due.getDate())+'T'+pad(due.getHours())+':'+pad(due.getMinutes());
  document.getElementById('asTitle').value='';
  document.getElementById('asSubject').value='';
  document.getElementById('asScore').value='10';
  document.getElementById('asDesc').value='';
  document.getElementById('asInstr').value='';
  document.getElementById('asFileLabel').textContent='คลิกเพื่อแนบไฟล์ (PDF, รูปภาพ, เอกสาร)';
  document.getElementById('asFileLabel').parentElement.classList.remove('has-file');
  document.getElementById('asExImgsLabel').textContent='คลิกเพื่อเลือกรูปภาพตัวอย่าง';
  document.getElementById('asExImgsLabel').parentElement.classList.remove('has-file');
  document.getElementById('asExImgs').value='';
  openModal('assignModal');
}

async function saveAssignment(){
  const title = document.getElementById('asTitle').value.trim();
  if(!title){ toast('กรุณาใส่ชื่อใบงาน'); return; }
  const subject = document.getElementById('asSubject').value.trim();
  const score = parseInt(document.getElementById('asScore').value,10) || 10;
  const due = document.getElementById('asDue').value;
  const desc = document.getElementById('asDesc').value.trim();
  const instr = document.getElementById('asInstr').value.trim();
  const fInput = document.getElementById('asFile');
  const exImgsInput = document.getElementById('asExImgs');

  try {
    let attachment = null;
    if (fInput.files && fInput.files[0]) {
      const res = await uploadToCloudinary(fInput.files[0]);
      if (res) attachment = { name: res.name, dataUrl: res.url, url: res.url, type: res.type };
    }

    const exampleImages = [];
    if (exImgsInput.files && exImgsInput.files.length) {
      const limit = Math.min(exImgsInput.files.length, 5);
      for (let i = 0; i < limit; i++) {
        const file = exImgsInput.files[i];
        const res = await uploadToCloudinary(file);
        if (res) {
          exampleImages.push({ name: res.name, dataUrl: res.url, url: res.url, type: res.type });
        }
      }
    }

    const newAssignment = {
      id: uid(),
      title,
      subject,
      description: desc,
      instructions: instr,
      dueDate: due ? new Date(due).toISOString() : null,
      maxScore: Math.min(100, Math.max(1, score)),
      attachment,
      exampleImages,
      createdAt: nowISO(),
      submissions: []
    };

    await API.createAssignment(newAssignment);
    closeModal('assignModal');
    showScreen('assignments');
    toast('📋 สร้างใบงานสำเร็จ' + (exampleImages.length ? ' (+ ' + exampleImages.length + ' ภาพตัวอย่าง)' : ''));
  } catch (err) {
    console.error(err);
    toast('❌ เกิดข้อผิดพลาดในการสร้างใบงาน');
  }
}

/* ---------- จัดการรายชื่อนักศึกษา (สำหรับครู) ---------- */
async function openStudentManagerModal(){
  openModal('studentManagerModal');
  await renderStudentManagerList();
}

async function renderStudentManagerList(){
  const listEl = document.getElementById('studentManagerList');
  if(!listEl) return;
  listEl.innerHTML = '<p style="font-size:13px; color:var(--muted-fg)">⏳ กำลังโหลดรายชื่อนักศึกษา...</p>';

  const students = await API.getStudents();
  if(!students.length){
    listEl.innerHTML = '<div style="padding:16px; text-align:center; background:var(--muted); border:2px solid #000; border-radius:2px; font-size:13px">ยังไม่มีรายชื่อนักศึกษาในระบบ</div>';
    return;
  }

  let html = `<div style="max-height:220px; overflow-y:auto; border:2px solid #000; border-radius:2px; background:#fff">
    <table style="width:100%; border-collapse:collapse; font-size:13px">
      <thead>
        <tr style="background:var(--muted); border-bottom:2px solid #000; text-align:left">
          <th style="padding:8px">รหัส นศ.</th>
          <th style="padding:8px">รหัส 8 ตัว (หน้า 4+หลัง 4)</th>
          <th style="padding:8px">ชื่อ-นามสกุล</th>
          <th style="padding:8px; text-align:right">จัดการ</th>
        </tr>
      </thead>
      <tbody>`;

  students.forEach((s) => {
    html += `<tr style="border-bottom:1px solid #ddd">
      <td style="padding:8px; font-weight:bold">${esc(s.studentId)}</td>
      <td style="padding:8px"><span class="chip chip-indigo" style="font-size:11px">${esc(s.studentCode)}</span></td>
      <td style="padding:8px">${esc(s.fullName)}</td>
      <td style="padding:8px; text-align:right">
        <button class="btn btn-ghost" style="padding:2px 8px; font-size:11px; color:#B91C1C" onclick="deleteStudentItem('${esc(s.studentId)}')">ลบ</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  listEl.innerHTML = html;
}

async function importStudentList(){
  const textarea = document.getElementById('studentBatchInput');
  const text = (textarea ? textarea.value : '').trim();
  if(!text){
    toast('กรุณากรอกหรือวางรายชื่อนักศึกษา');
    return;
  }

  // Parse lines: e.g. "65012345 นายสมชาย ใจดี" or "65012345, สมชาย ใจดี"
  const lines = text.split('\n');
  const parsed = [];

  for(const line of lines){
    const clean = line.trim();
    if(!clean) continue;
    // Try comma, tab, or space separation
    let parts = clean.split(/[,\t]+/);
    if(parts.length < 2){
      // Try first word as ID, rest as name
      const m = clean.match(/^(\S+)\s+(.+)$/);
      if(m){
        parts = [m[1], m[2]];
      }
    }
    if(parts.length >= 2){
      const sId = parts[0].trim();
      const sName = parts.slice(1).join(' ').trim();
      const cleanDigits = sId.replace(/\D/g, '');
      const sCode = cleanDigits.length >= 8 ? (cleanDigits.slice(0, 4) + cleanDigits.slice(-4)) : (cleanDigits || sId);
      if(sId && sName){
        parsed.push({ studentId: sId, studentCode: sCode, fullName: sName });
      }
    }
  }

  if(!parsed.length){
    toast('⚠️ ไม่สามารถแปลงข้อมูลได้ กรุณาใส่ในรูปแบบ: รหัสนักศึกษา ชื่อ-นามสกุล (1 คนต่อบรรทัด)');
    return;
  }

  toast(`⏳ กำลังนำเข้า ${parsed.length} รายชื่อสู่ระบบ...`);
  const ok = await API.saveStudents(parsed);
  if(ok){
    if(textarea) textarea.value = '';
    toast(`✅ นำเข้ารายชื่อนักศึกษา ${parsed.length} คนสำเร็จ!`);
    await renderStudentManagerList();
  } else {
    toast('❌ บันทึกรายชื่อไม่สำเร็จ');
  }
}

async function deleteStudentItem(sId){
  if(!confirm(`ลบนักศึกษารหัส ${sId} ออกจากระบบ?`)) return;
  await API.deleteStudent(sId);
  toast(`ลบนักศึกษารหัส ${sId} เรียบร้อย`);
  await renderStudentManagerList();
}