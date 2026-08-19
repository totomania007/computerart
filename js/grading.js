/* ============================================================
   Classwork Hub — grading.js
   หน้าตรวจงาน (ครู): ให้คะแนน + คอมเมนต์ + ส่งออก Excel + ค้นหา/กรอง + ผลงานเด่น
   ============================================================ */
'use strict';

let gradingFilter = 'all'; // 'all' | 'pending' | 'graded' | 'unsubmitted'
let gradingSearch = '';

function setGradingFilter(f){
  gradingFilter = f;
  renderGradingArea();
}

function renderGrading(){
  const sel = document.getElementById('gradingSelect');
  const area = document.getElementById('gradingArea');
  const sorted = data.assignments.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(!sorted.length){
    sel.innerHTML='';
    area.innerHTML='<div class="card empty"><p>ยังไม่มีใบงาน — สร้างใบงานก่อน</p></div>';
    return;
  }
  if(!gradingId || !data.assignments.find(a=>a.id===gradingId)) gradingId = sorted[0].id;

  sel.innerHTML = '<div class="bento">'+
    sorted.map(a=>{
      const subs = a.submissions||[];
      const ungraded = subs.filter(s=>s.score==null).length;
      return '<button class="tile-select '+(a.id===gradingId?'selected':'')+'" onclick="gradingId=\''+a.id+'\'; renderGrading()">'+
        '<span>'+esc(a.title)+'</span>'+
        (ungraded?'<span class="badge">'+ungraded+' ยังไม่ได้ตรวจ</span>':'')+
        '</button>';
    }).join('')+'</div>';

  renderGradingArea();
}

function renderGradingArea(){
  const area = document.getElementById('gradingArea');
  const a = data.assignments.find(x=>x.id===gradingId);
  if(!a){ area.innerHTML = ''; return; }

  const subs = a.submissions||[];
  const gradedCount = subs.filter(s=>s.score!=null).length;
  const pendingCount = subs.filter(s=>s.score==null).length;

  // Cross-reference with enrolled students
  const enrolledStudents = data.students || [];
  const submittedStudentKeys = new Set(subs.map(s => s.studentName.trim().toLowerCase()));
  const unsubmittedStudents = enrolledStudents.filter(st => {
    return !submittedStudentKeys.has(st.fullName.trim().toLowerCase()) &&
           !(st.studentId && subs.some(s => s.studentId === st.studentId));
  });

  const totalEnrolled = enrolledStudents.length || subs.length;

  // Header and Toolbar
  let html = `
    <div class="card card-pad" style="margin-bottom:16px">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap">
        <div>
          <h3 style="font-size:18px; margin-bottom:4px">${esc(a.title)}</h3>
          <p style="font-size:13px; color:var(--muted-fg)">
            ${esc(a.subject ? a.subject + ' • ' : '')}
            คะแนนเต็ม <b>${a.maxScore}</b> คะแนน • 
            ส่งแล้ว <b>${subs.length}</b> คน (ตรวจแล้ว ${gradedCount}, รอตรวจ ${pendingCount})
            ${enrolledStudents.length ? ` • ทั้งหมด ${totalEnrolled} คนในระบบ` : ''}
          </p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          <button class="btn btn-primary" onclick="exportGradesCSV('${a.id}')" title="ดาวน์โหลดคะแนนเป็นไฟล์ Excel / CSV">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            📥 ส่งออกคะแนน (Excel/CSV)
          </button>
          <button class="btn btn-ghost" onclick="openDetail('${a.id}')">ดูรายละเอียดงาน</button>
        </div>
      </div>

      <!-- Search and Filter Bar -->
      <div style="margin-top:14px; padding-top:12px; border-top:1px dashed #000; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap">
        <div style="display:flex; gap:6px; flex-wrap:wrap">
          <button class="btn btn-soft ${gradingFilter==='all'?'active':''}" style="font-size:12.5px; padding:5px 12px" onclick="setGradingFilter('all')">🔘 ทั้งหมด (${subs.length})</button>
          <button class="btn btn-soft ${gradingFilter==='pending'?'active':''}" style="font-size:12.5px; padding:5px 12px" onclick="setGradingFilter('pending')">🟡 รอตรวจ (${pendingCount})</button>
          <button class="btn btn-soft ${gradingFilter==='graded'?'active':''}" style="font-size:12.5px; padding:5px 12px" onclick="setGradingFilter('graded')">🟢 ตรวจแล้ว (${gradedCount})</button>
          ${enrolledStudents.length ? `<button class="btn btn-soft ${gradingFilter==='unsubmitted'?'active':''}" style="font-size:12.5px; padding:5px 12px; color:#B91C1C" onclick="setGradingFilter('unsubmitted')">🔴 ยังไม่ส่ง (${unsubmittedStudents.length})</button>` : ''}
        </div>
        <div style="flex:1; max-width:260px; min-width:180px">
          <input class="input" style="padding:6px 12px; font-size:13px" placeholder="🔍 ค้นหาชื่อ/รหัสนักศึกษา..." value="${esc(gradingSearch)}" oninput="gradingSearch=this.value.trim().toLowerCase(); renderGradingArea()">
        </div>
      </div>
    </div>
  `;

  // Filter and Search logic
  if (gradingFilter === 'unsubmitted') {
    let filteredUnsub = unsubmittedStudents;
    if (gradingSearch) {
      filteredUnsub = filteredUnsub.filter(st => st.fullName.toLowerCase().includes(gradingSearch) || (st.studentId && st.studentId.toLowerCase().includes(gradingSearch)));
    }

    if (!filteredUnsub.length) {
      html += '<div class="card empty"><p>นักศึกษาทุกคนส่งงานใบงานนี้ครบเรียบร้อยแล้ว 🎉</p></div>';
    } else {
      html += `
        <div class="card card-pad">
          <h4 style="font-size:15px; margin-bottom:12px; color:#B91C1C">🔴 รายชื่อนักศึกษาที่ยังไม่ได้ส่งงาน (${filteredUnsub.length} คน)</h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:10px">
            ${filteredUnsub.map((st, idx) => `
              <div style="background:var(--muted); border:1.5px solid #000; padding:10px 12px; border-radius:2px; display:flex; align-items:center; gap:8px">
                <span style="font-weight:700; color:var(--muted-fg)">${idx+1}.</span>
                <div>
                  <b style="font-size:13.5px">${esc(st.fullName)}</b>
                  <div style="font-size:11.5px; color:var(--muted-fg)">รหัส: ${esc(st.studentId || st.studentCode)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  } else {
    let filteredSubs = subs;
    if (gradingFilter === 'pending') {
      filteredSubs = filteredSubs.filter(s => s.score == null);
    } else if (gradingFilter === 'graded') {
      filteredSubs = filteredSubs.filter(s => s.score != null);
    }

    if (gradingSearch) {
      filteredSubs = filteredSubs.filter(s => s.studentName.toLowerCase().includes(gradingSearch) || (s.studentId && s.studentId.toLowerCase().includes(gradingSearch)));
    }

    if (!filteredSubs.length) {
      html += '<div class="card empty"><p>ไม่พบรายการส่งงานตามตัวกรองนี้</p></div>';
    } else {
      html += `<div class="${filteredSubs.length > 2 ? 'submissions-2col' : ''}">` +
        filteredSubs.map(s => gradingCard(a, s)).join('') +
        '</div>';
    }
  }

  area.innerHTML = html;
}

function gradingCard(a, s){
  const isGraded = s.score != null;
  const saved = isGraded ? '<span class="saved-flash">'+ICONS.check+'บันทึกแล้ว'+(s.gradedAt?' • '+fmtDate(s.gradedAt):'')+'</span>' : '';
  const files = (Array.isArray(s.files) && s.files.length) ? s.files : (s.file ? [s.file] : []);
  let filesHtml = '';
  if (files.length) {
    filesHtml = '<div style="margin:8px 0"><b style="font-size:12.5px; display:block; margin-bottom:6px">ไฟล์/ภาพที่ส่ง ('+files.length+' ไฟล์):</b><div style="display:flex; gap:8px; flex-wrap:wrap">' +
      files.map(f => {
        const fUrl = f.dataUrl || f.url;
        const isImg = (f.type && f.type.startsWith('image')) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name || fUrl);
        if (isImg) {
          return `<div style="display:inline-block; border:2px solid #000; border-radius:2px; overflow:hidden; cursor:pointer" onclick="openLightbox('${esc(fUrl)}', '${esc(f.name)}')"><img src="${esc(fUrl)}" style="height:70px; width:70px; object-fit:cover" title="${esc(f.name)}"></div>`;
        }
        return `<span class="sub-file" onclick="openFile('${esc(fUrl)}','${esc(f.name)}')">${ICONS.download}${esc(f.name)}</span>`;
      }).join('') + '</div></div>';
  }

  const isFeatured = Boolean(s.isFeatured);

  return '<div class="card card-pad" style="margin-bottom:14px; position:relative">'+
    '<div class="sub-head">'+avatarOf(s.studentName,1)+
      '<div>'+
        '<b style="font-size:14.5px">'+esc(s.studentName)+'</b>'+
        '<div style="font-size:12px; color:var(--muted-fg)">'+(s.studentId?'รหัส '+esc(s.studentId)+' • ':'')+'ส่งเมื่อ '+fmtDate(s.submittedAt)+'</div>'+
      '</div>'+
      '<div style="margin-left:auto; display:flex; align-items:center; gap:6px">'+
        saved+
        `<button class="btn btn-soft" style="font-size:11.5px; padding:3px 8px; ${isFeatured?'background:var(--yellow); border-color:#000':''}" onclick="toggleFeaturedWork('${a.id}', '${s.id}')" title="ปักหมุดผลงานไปแสดงในหน้านิทรรศการ">${isFeatured ? '🌟 ผลงานเด่น' : '⭐ ปักหมุดเด่น'}</button>`+
      '</div>'+
    '</div>'+
    (s.text?'<div class="sub-body">'+linkify(esc(s.text))+'</div>':'')+
    filesHtml+
    (s.link?'<div style="margin:8px 0"><a class="sub-file" href="'+esc(s.link)+'" target="_blank" rel="noopener">'+ICONS.link+'เปิดลิงก์ผลงาน</a></div>':'')+
    '<div class="grade-grid">'+
      '<div><label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px">คะแนน</label>'+
        '<input type="number" class="input score-input" id="score-'+s.id+'" min="0" max="'+a.maxScore+'" value="'+(s.score??'')+'" placeholder="—"></div>'+
      '<div><label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px">คำติชม (comment)</label>'+
        '<textarea class="textarea" id="cmt-'+s.id+'" placeholder="เช่น งานสวยมาก แต่สีพื้นกับตัวหนังสือตัดกันน้อยไปนิดนะ">'+esc(s.comment||'')+'</textarea>'+
        '<div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap">'+
          '<button class="btn btn-soft" onclick="quickComment(\''+s.id+'\',\''+esc('งานดีมาก! ผ่านแล้ว 👍')+'\')">👍 ผ่าน</button>'+
          '<button class="btn btn-soft" onclick="quickComment(\''+s.id+'\',\''+esc('ยังไม่ผ่าน — แก้ไขตามคำแนะนำแล้วส่งใหม่')+'\')">🔄 ให้แก้ใหม่</button>'+
          '<button class="btn btn-success" style="margin-left:auto" onclick="saveGrade(\''+a.id+'\',\''+s.id+'\')">'+ICONS.check+'บันทึกคะแนน</button>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function quickComment(subId, text){
  const el = document.getElementById('cmt-'+subId);
  if(el){ el.value = text; el.focus(); }
}

async function saveGrade(assignId, subId){
  const a = data.assignments.find(x=>x.id===assignId); if(!a) return;
  const s = (a.submissions||[]).find(x=>x.id===subId); if(!s) return;
  const scoreEl = document.getElementById('score-'+subId);
  const cmtEl = document.getElementById('cmt-'+subId);
  const score = scoreEl.value === '' ? null : parseInt(scoreEl.value, 10);
  if(score != null && (isNaN(score) || score < 0 || score > a.maxScore)){ toast('คะแนนต้องอยู่ระหว่าง 0-'+a.maxScore); return; }

  const comment = (cmtEl.value||'').trim();
  const status = score != null ? 'graded' : 'pending';

  toast('⏳ กำลังบันทึกคะแนน...');
  const ok = await API.gradeSubmission(subId, {
    score,
    comment,
    status,
    isFeatured: s.isFeatured
  });

  if (ok) {
    s.score = score;
    s.comment = comment;
    s.status = status;
    s.gradedAt = new Date().toISOString();
    toast('✅ บันทึกคะแนนให้ '+s.studentName+' แล้ว');
    renderGradingArea();
  }
}

async function toggleFeaturedWork(assignId, subId){
  const a = data.assignments.find(x=>x.id===assignId); if(!a) return;
  const s = (a.submissions||[]).find(x=>x.id===subId); if(!s) return;

  s.isFeatured = !s.isFeatured;
  toast(s.isFeatured ? '🌟 ปักหมุดเป็นผลงานเด่นในหน้านิทรรศการแล้ว' : 'ยกเลิกการปักหมุดผลงานเด่น');

  await API.gradeSubmission(subId, {
    score: s.score,
    comment: s.comment,
    status: s.status,
    isFeatured: s.isFeatured
  });

  renderGradingArea();
}

/**
 * ส่งออกคะแนนของใบงานที่เลือกเป็นไฟล์ CSV (เปิดใน Excel ได้ภาษาไทยไม่เพี้ยน)
 */
function exportGradesCSV(assignId){
  const a = data.assignments.find(x => x.id === assignId);
  if(!a){ toast('ไม่พบข้อมูลใบงาน'); return; }

  const enrolled = data.students || [];
  const subs = a.submissions || [];

  // Prepare CSV Rows
  const rows = [];
  rows.push(['ลำดับ', 'รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'สถานะการส่งงาน', 'วันเวลาที่ส่ง', 'คะแนนที่ได้', 'คะแนนเต็ม', 'ผลงานเด่น', 'ลิงก์ผลงาน', 'คำติชมจากครู']);

  if (enrolled.length > 0) {
    enrolled.forEach((st, idx) => {
      const s = subs.find(sub => sub.studentName.trim().toLowerCase() === st.fullName.trim().toLowerCase() || (st.studentId && sub.studentId === st.studentId));
      if (s) {
        rows.push([
          idx + 1,
          st.studentId || st.studentCode || s.studentId || '',
          st.fullName,
          s.score !== null ? 'ตรวจแล้ว' : 'ส่งแล้ว (รอตรวจ)',
          s.submittedAt ? fmtDate(s.submittedAt) : '',
          s.score !== null ? s.score : '',
          a.maxScore,
          s.isFeatured ? 'ใช่' : 'ไม่ใช่',
          s.link || '',
          s.comment || ''
        ]);
      } else {
        rows.push([
          idx + 1,
          st.studentId || st.studentCode || '',
          st.fullName,
          'ยังไม่ส่งงาน',
          '',
          '',
          a.maxScore,
          '',
          '',
          ''
        ]);
      }
    });
  } else {
    subs.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.studentId || '',
        s.studentName,
        s.score !== null ? 'ตรวจแล้ว' : 'ส่งแล้ว (รอตรวจ)',
        s.submittedAt ? fmtDate(s.submittedAt) : '',
        s.score !== null ? s.score : '',
        a.maxScore,
        s.isFeatured ? 'ใช่' : 'ไม่ใช่',
        s.link || '',
        s.comment || ''
      ]);
    });
  }

  // Convert to CSV String with UTF-8 BOM for Excel
  const csvContent = '\uFEFF' + rows.map(r => r.map(cell => {
    const str = String(cell ?? '').replace(/"/g, '""');
    return `"${str}"`;
  }).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = (a.title || 'ใบงาน').replace(/[^\w\u0E00-\u0E7F]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `คะแนน_${safeTitle}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast('📥 ดาวน์โหลดไฟล์คะแนน CSV สำหรับ Excel เรียบร้อย!');
}