/* ============================================================
   Classwork Hub — modals.js
   ฟอร์มสร้างโพสต์ + ฟอร์มสร้างใบงาน (อัปโหลด Cloudinary + API Sync)
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