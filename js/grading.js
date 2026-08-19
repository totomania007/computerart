/* ============================================================
   Classwork Hub — grading.js
   หน้าตรวจงาน (ครู): ให้คะแนน + คอมเมนต์ + บันทึก (API Sync)
   ============================================================ */
'use strict';

function renderGrading(){
  const sel = document.getElementById('gradingSelect');
  const area = document.getElementById('gradingArea');
  const sorted = data.assignments.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(!sorted.length){ sel.innerHTML=''; area.innerHTML='<div class="card empty"><p>ยังไม่มีใบงาน — สร้างใบงานก่อน</p></div>'; return; }
  if(!gradingId || !data.assignments.find(a=>a.id===gradingId)) gradingId = sorted[0].id;
  sel.innerHTML = '<div class="bento">'+
    sorted.map(a=>{
      const subs = a.submissions||[];
      const ungraded = subs.filter(s=>s.score==null).length;
      return '<button class="tile-select '+(a.id===gradingId?'selected':'')+'" onclick="gradingId=\''+a.id+'\'; render()">'+
        '<span>'+esc(a.title)+'</span>'+
        (ungraded?'<span class="badge">'+ungraded+' ยังไม่ได้ตรวจ</span>':'')+
        '</button>';
    }).join('')+'</div>';

  const a = data.assignments.find(x=>x.id===gradingId);
  const subs = a.submissions||[];
  const graded = subs.filter(s=>s.score!=null).length;
  area.innerHTML = '<div class="card card-pad" style="margin-bottom:16px">'+
    '<div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap">'+
      '<div><h3 style="font-size:17px">'+esc(a.title)+'</h3>'+
      '<p style="font-size:13px; color:var(--muted-fg)">'+esc(a.subject||'')+' • ส่งแล้ว '+subs.length+' คน • ตรวจแล้ว '+graded+'/'+subs.length+' • คะแนนเต็ม '+a.maxScore+'</p></div>'+
      '<div style="margin-left:auto"><button class="btn btn-ghost" onclick="openDetail(\''+a.id+'\')">ดูรายละเอียดงาน</button></div>'+
    '</div></div>'+
    (subs.length
      ? '<div class="'+(subs.length>2?'submissions-2col':'')+'">'+subs.map(s=>gradingCard(a,s)).join('')+'</div>'
      : '<div class="card empty"><p>ยังไม่มีนักเรียนส่งงาน</p></div>');
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

  return '<div class="card card-pad" style="margin-bottom:14px">'+
    '<div class="sub-head">'+avatarOf(s.studentName,1)+'<div><b style="font-size:14.5px">'+esc(s.studentName)+'</b>'+
      '<div style="font-size:12px; color:var(--muted-fg)">ส่งเมื่อ '+fmtDate(s.submittedAt)+'</div></div>'+
      '<div style="margin-left:auto">'+saved+'</div>'+
    '</div>'+
    (s.text?'<div class="sub-body">'+esc(s.text)+'</div>':'')+
    filesHtml+
    (s.link?'<div style="margin:8px 0"><a class="sub-file" href="'+esc(s.link)+'" target="_blank" rel="noopener">'+ICONS.link+'เปิดลิงก์ผลงาน</a></div>':'')+
    '<div class="grade-grid">'+
      '<div><label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px">คะแนน</label>'+
        '<input type="number" class="input score-input" id="score-'+s.id+'" min="0" max="'+a.maxScore+'" value="'+(s.score??'')+'" placeholder="—"></div>'+
      '<div><label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px">คำติชม (comment)</label>'+
        '<textarea class="textarea" id="cmt-'+s.id+'" placeholder="เช่น งานสวยมาก แต่สีพื้นกับตัวหนังสือตัดกันน้อยไปนิดนะ">'+esc(s.comment)+'</textarea>'+
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
  const status = (score != null && comment && score >= a.maxScore * 0.5) ? 'graded' : (score !== null ? 'graded' : 'pending');

  await API.gradeSubmission(subId, {
    score,
    comment,
    status
  });

  renderGrading();
  toast('✅ บันทึกคะแนนให้ '+s.studentName+' แล้ว');
}