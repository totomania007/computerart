/* ============================================================
   Classwork Hub — assignments.js
   รายการใบงาน + หน้าดูรายละเอียด + ฟอร์มส่งงาน (Cloudinary + API)
   ============================================================ */
'use strict';

function assignmentStatus(a){
  if(!a.dueDate) return { label:'เปิดรับงาน', cls:'chip-green' };
  return new Date(a.dueDate).getTime() > Date.now()
    ? { label:'เปิดรับงาน · ส่งภายใน '+fmtDateShort(a.dueDate), cls:'chip-green' }
    : { label:'ปิดรับงานแล้ว', cls:'chip-gray' };
}

function studentSubmission(a){
  if(role !== 'student') return null;
  return (a.submissions||[]).find(s=>s.studentName===studentName) || null;
}

function subStatusChip(s, maxScore){
  if(!s) return '<span class="chip chip-amber">'+ICONS.clock+'ยังไม่ส่ง</span>';
  if(s.status==='resubmit') return '<span class="chip chip-amber">'+ICONS.edit+'ต้องแก้ไขใหม่</span>';
  if(s.status==='graded' || s.score!=null) return '<span class="chip chip-green">'+ICONS.check+'ตรวจแล้ว '+(s.score??'-')+'/'+(maxScore??'-')+'</span>';
  return '<span class="chip chip-indigo">'+ICONS.clock+'ส่งแล้ว · รอตรวจ</span>';
}

/* ---------- รายการใบงาน ---------- */
function renderAssignments(){
  const list = document.getElementById('assignList');
  const sorted = data.assignments.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(!sorted.length){
    list.innerHTML = (role === 'teacher' ? '<div class="tile-add" style="margin-bottom:14px" onclick="openAssignModal()">'+ICONS.plus+'<span>สร้างใบงานใหม่</span></div>' : '') + '<div class="card empty"><p>ยังไม่มีใบงาน</p></div>';
    return;
  }
  let html = '';
  // ไทล์ "สร้างใบงาน" (ครู) วางใน bento grid
  if(role === 'teacher'){
    html += '<div class="tile-add" onclick="openAssignModal()">'+ICONS.plus+'<span>สร้างใบงานใหม่</span></div>';
  }
  sorted.forEach((a, idx)=>{
    const st = assignmentStatus(a);
    const subs = a.submissions||[];
    const mine = studentSubmission(a);
    const span = (idx === 0 && role === 'teacher' && sorted.length >= 3) ? ' span-2' : '';
    html += '<div class="card card-hover assign-item'+span+'" onclick="openDetail(\''+a.id+'\')">'+
      '<div class="assign-ico" style="background:linear-gradient(135deg,var(--primary),var(--secondary)); box-shadow:0 4px 12px rgba(79,70,229,.3)">'+ICONS.clipboard+'</div>'+
      '<div class="assign-main">'+
        '<div class="assign-title">'+esc(a.title)+'</div>'+
        '<div class="assign-meta">'+
          (a.subject?'<span class="chip chip-indigo">'+esc(a.subject)+'</span>':'')+
          '<span class="chip '+st.cls+'">'+st.label+'</span>'+
          (role==='teacher'
            ? '<span class="chip chip-gray">'+ICONS.users+(subs.length)+' คนส่ง</span>'
            : (subStatusChip(mine, a.maxScore)))+
          '<span class="chip chip-gray">'+ICONS.star+'คะแนนเต็ม '+a.maxScore+'</span>'+
        '</div>'+
        (a.description?'<div class="assign-desc">'+esc(a.description)+'</div>':'')+
      '</div>'+
    '</div>';
  });
  list.innerHTML = '<div class="bento">'+html+'</div>';
}

/* ---------- หน้าดูรายละเอียด (modal) ---------- */
function openDetail(id){
  const a = data.assignments.find(x=>x.id===id); if(!a) return;
  editingAssignId = id;
  document.getElementById('detTitle').textContent = a.title;
  const st = assignmentStatus(a);
  const subs = a.submissions||[];
  const mine = studentSubmission(a);
  const attUrl = a.attachment ? (a.attachment.dataUrl || a.attachment.url) : null;
  const att = attUrl ? '<a class="sub-file" onclick="openFile(\''+esc(attUrl)+'\',\''+esc(a.attachment.name)+'\')">'+ICONS.download+esc(a.attachment.name)+'</a>' : '';

  let side = '<div class="card card-pad"><h3 style="font-size:15px; margin-bottom:12px">รายละเอียด</h3><div class="info-list">'+
    '<div class="info-row">'+ICONS.clipboard+'<div><b>วิชา:</b> '+esc(a.subject||'—')+'</div></div>'+
    '<div class="info-row">'+ICONS.clock+'<div><b>กำหนดส่ง:</b> '+fmtDate(a.dueDate)+'</div></div>'+
    '<div class="info-row">'+ICONS.star+'<div><b>คะแนนเต็ม:</b> '+a.maxScore+' คะแนน</div></div>'+
    '<div class="info-row">'+ICONS.check+'<div><b>สถานะ:</b> '+st.label+'</div></div>'+
    (att ? '<div class="info-row">'+ICONS.file+'<div><b>ไฟล์แนบ:</b><br>'+att+'</div></div>' : '')+
    '</div></div>';

  let main = '<div class="card card-pad" style="margin-bottom:16px">'+
    '<h3 style="font-size:15px; margin-bottom:8px">รายละเอียดงาน</h3>'+
    '<p style="font-size:14px; line-height:1.7; margin-bottom:14px">'+esc(a.description||'')+'</p>'+
    (a.instructions ? '<h3 style="font-size:14px; margin-bottom:6px">ขั้นตอน / ข้อกำหนด</h3><div style="font-size:14px; line-height:1.8; white-space:pre-wrap; background:var(--muted); border-radius:12px; padding:12px 14px">'+esc(a.instructions)+'</div>' : '')+
    (a.exampleImages && a.exampleImages.length ?
      '<div style="margin-top:16px"><h3 style="font-size:14px; margin-bottom:10px">🖼️ ภาพตัวอย่างงาน</h3>'+
      '<div class="ex-img-grid">'+
      a.exampleImages.map((img, i)=>{
        const imgUrl = img.dataUrl || img.url;
        return '<div class="ex-img-item" onclick="openLightbox(\''+esc(imgUrl)+'\',\''+esc(img.name)+'\')">'+
          '<img src="'+esc(imgUrl)+'" alt="ตัวอย่าง '+(i+1)+'">'+
          '<span class="ex-img-name">'+esc(img.name)+'</span>'+
        '</div>';
      }).join('')+
      '</div></div>'
    : '')+
  '</div>';

  if(role === 'teacher'){
    const subCount = subs.length;
    const graded = subs.filter(s=>s.score!=null).length;
    main += '<div class="card card-pad"><h3 style="font-size:15px; margin-bottom:6px">งานที่ส่งมา ('+subCount+')</h3>'+
      '<p style="font-size:13px; color:var(--muted-fg); margin-bottom:12px">ตรวจแล้ว '+graded+'/'+subCount+' — ไปที่เมนู "ตรวจงาน" เพื่อให้คะแนน</p>'+
      (subCount ? subs.map(s=>'<div class="sub-card"><div class="sub-head">'+avatarOf(s.studentName,1)+'<b>'+esc(s.studentName)+'</b><span class="chip chip-gray">'+fmtDate(s.submittedAt)+'</span>'+subStatusChip(s, a.maxScore)+'</div></div>').join('') : '<p style="color:var(--muted-fg)">ยังไม่มีนักเรียนส่งงาน</p>')+
    '</div>';
  }else{
    main += '<div class="card card-pad"><h3 style="font-size:15px; margin-bottom:10px">งานของฉัน</h3>'+subStatusChip(mine, a.maxScore)+
      (mine && mine.score!=null ? '<div style="margin-top:10px; font-family:Mitr; font-size:20px; color:var(--primary)">คะแนน: '+mine.score+' / '+a.maxScore+'</div>' : '')+
      (mine && mine.comment ? '<div style="margin-top:8px; background:var(--muted); border-radius:12px; padding:10px 14px; font-size:14px"><b>คอมเมนต์จากครู:</b> '+esc(mine.comment)+'</div>' : '')+
      '<div style="margin-top:16px"><button class="btn '+(mine?'btn-soft':'btn-accent')+'" onclick="openSubmitModal(\''+a.id+'\')">'+(mine?ICONS.edit+'ส่งงานใหม่':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>ส่งงาน')+'</button></div>'+
    '</div>';
  }

  document.getElementById('detBody').innerHTML = '<div class="detail-grid"><div>'+main+'</div>'+side+'</div>';
  openModal('detailModal');
}

/* ---------- ฟอร์มส่งงาน (modal) ---------- */
function openSubmitModal(id){
  const a = data.assignments.find(x=>x.id===id); if(!a) return;
  if(!ensureStudentName()) return;
  editingAssignId = id;
  const mine = (a.submissions||[]).find(s=>s.studentName===studentName) || null;
  editingSubId = mine ? mine.id : null;
  const overdue = a.dueDate && new Date(a.dueDate).getTime() < Date.now();

  const fileUrl = mine && mine.file ? (mine.file.dataUrl || mine.file.url) : '';

  document.getElementById('subTitle').textContent = mine ? 'ส่งงานใหม่: '+a.title : 'ส่งงาน: '+a.title;
  document.getElementById('subBody').innerHTML =
    (mine ? '<div style="background:var(--warn-bg); border-radius:12px; padding:10px 14px; font-size:13px; margin-bottom:14px; color:var(--warn)">คุณส่งงานแล้วเมื่อ '+fmtDate(mine.submittedAt)+' — การส่งใหม่จะแทนที่งานเดิม</div>' : '')+
    (overdue && !mine ? '<div style="background:#FEE2E2; border-radius:12px; padding:10px 14px; font-size:13px; margin-bottom:14px; color:#B91C1C">⚠️ เลยกำหนดส่งแล้ว — ควรติดต่อครูเพื่อขอส่ง</div>' : '')+
    '<div class="field"><label>ชื่อ-นามสกุล *</label><input class="input" id="subName" value="'+esc(studentName)+'"></div>'+
    '<div class="field"><label>คำตอบ / รายละเอียดผลงาน</label><textarea class="textarea" id="subText" placeholder="อธิบายสิ่งที่ทำ หรือส่งลิงก์/ไฟล์ด้านล่าง">'+esc(mine?mine.text:'')+'</textarea></div>'+
    '<div class="row">'+
      '<div class="field"><label>ไฟล์ผลงาน (PDF, รูปภาพ ไม่เกิน 5MB)</label><div class="file-drop" id="subFileDrop" onclick="document.getElementById(\'subFile\').click()"><span id="subFileLabel">'+(mine&&mine.file?esc(mine.file.name):'คลิกเพื่อเลือกไฟล์ (ไม่เกิน 5 MB)')+'</span></div><input type="file" id="subFile" style="display:none" onchange="onPickFile(this,\'subFileLabel\')"><div class="hint">รูปภาพจะถูกบีบอัดให้คมชัดและขนาดเล็กลงอัตโนมัติ</div></div>'+
      '<div class="field"><label>หรือลิงก์ผลงาน (Google Drive ฯลฯ)</label><input class="input" id="subLink" placeholder="https://..." value="'+esc(mine?mine.link:'')+'"></div>'+
    '</div>'+
    (mine && fileUrl ? '<button class="btn btn-ghost" style="margin-bottom:10px" onclick="openFile(\''+esc(fileUrl)+'\',\''+esc(mine.file.name)+'\')">'+ICONS.download+'ดูไฟล์ที่ส่งเดิม</button>' : '');
  openModal('submitModal');
}

async function submitWork(){
  const a = data.assignments.find(x=>x.id===editingAssignId); if(!a) return;
  const name = document.getElementById('subName').value.trim();
  if(!name){ toast('กรุณาใส่ชื่อ-นามสกุล'); return; }
  studentName = name; localStorage.setItem(STUDENT_KEY, name);
  const text = document.getElementById('subText').value.trim();
  const link = document.getElementById('subLink').value.trim();
  const fileInput = document.getElementById('subFile');

  try {
    let fileObj = null;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const res = await uploadToCloudinary(fileInput.files[0]);
      if (res) fileObj = { name: res.name, dataUrl: res.url, url: res.url, type: res.type };
    }

    const subData = {
      id: editingSubId || uid(),
      assignmentId: a.id,
      studentName: name,
      studentId: studentId || '',
      text,
      link,
      file: fileObj
    };

    await API.submitWork(subData);
    closeModal('submitModal');
    toast('✅ ส่งงานเรียบร้อย');
    openDetail(a.id);
  } catch (err) {
    console.error(err);
    toast('❌ เกิดข้อผิดพลาดในการส่งงาน');
  }
}