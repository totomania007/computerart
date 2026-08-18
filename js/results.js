/* ============================================================
   Classwork Hub — results.js
   หน้าผลงานของฉัน (นักเรียน): สถิติ + คะแนน + คำติชม
   ============================================================ */
'use strict';

function renderResults(){
  const stats = document.getElementById('resultsStats');
  const list = document.getElementById('resultsList');
  const all = data.assignments;
  const mine = all.map(a=>({a, s:(a.submissions||[]).find(x=>x.studentName===studentName)||null}));
  const submitted = mine.filter(m=>m.s).length;
  const graded = mine.filter(m=>m.s && m.s.score!=null).length;
  const sum = mine.filter(m=>m.s && m.s.score!=null).reduce((t,m)=>t+m.s.score,0);
  const avg = graded ? (sum/graded).toFixed(1) : '—';
  stats.innerHTML =
    '<div class="card stat"><div class="stat-num">'+all.length+'</div><div class="stat-label">ใบงานทั้งหมด</div></div>'+
    '<div class="card stat"><div class="stat-num">'+submitted+'</div><div class="stat-label">ส่งแล้ว</div></div>'+
    '<div class="card stat"><div class="stat-num green">'+graded+'</div><div class="stat-label">ตรวจแล้ว</div></div>'+
    '<div class="card stat"><div class="stat-num amber">'+avg+'</div><div class="stat-label">คะแนนเฉลี่ย</div></div>';

  if(!all.length){ list.innerHTML = '<div class="card empty"><p>ยังไม่มีใบงาน</p></div>'; return; }
  list.innerHTML = '<div class="bento">' + all.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(a=>{
    const s = (a.submissions||[]).find(x=>x.studentName===studentName) || null;
    return '<div class="card card-hover assign-item" onclick="openDetail(\''+a.id+'\')">'+
      '<div class="assign-ico" style="background:linear-gradient(135deg,#059669,#10B981); box-shadow:0 4px 12px rgba(5,150,105,.3)">'+ICONS.clipboard+'</div>'+
      '<div class="assign-main">'+
        '<div class="assign-title">'+esc(a.title)+'</div>'+
        '<div class="assign-meta">'+subStatusChip(s, a.maxScore)+
          (s && s.score!=null ? '<span class="chip chip-gray">'+ICONS.star+'คะแนน '+s.score+'/'+a.maxScore+'</span>' : '')+
          '<span class="chip chip-gray">'+ICONS.clock+fmtDateShort(a.dueDate)+'</span>'+
        '</div>'+
        (s && s.comment ? '<div style="margin-top:8px; background:var(--muted); border-radius:12px; padding:8px 12px; font-size:13px"><b>💬 คำติชม:</b> '+esc(s.comment)+'</div>' : '')+
      '</div>'+
    '</div>';
  }).join('') + '</div>';
}
