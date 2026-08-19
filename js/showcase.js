/* ============================================================
   Classwork Hub — showcase.js
   หน้านิทรรศการผลงานเด่น (Hall of Fame & Art Exhibition)
   ============================================================ */
'use strict';

function renderShowcase(){
  const container = document.getElementById('showcaseGallery');
  if(!container) return;

  const allAssignments = data.assignments || [];
  const featuredList = [];

  allAssignments.forEach(a => {
    (a.submissions || []).forEach(s => {
      // Considered featured if teacher flagged isFeatured OR high score
      if (s.isFeatured || (s.score !== null && s.score !== undefined && s.score >= (a.maxScore || 10))) {
        featuredList.push({
          assignment: a,
          submission: s
        });
      }
    });
  });

  // Sort by newest submission or highest score
  featuredList.sort((x, y) => new Date(y.submission.submittedAt || 0) - new Date(x.submission.submittedAt || 0));

  if (!featuredList.length) {
    container.innerHTML = `
      <div class="card empty" style="background:#fff; border:2px dashed #000">
        <div style="font-size:42px; margin-bottom:10px">🎨✨</div>
        <h3 style="font-size:16px; margin-bottom:6px">ยังไม่มีผลงานในนิทรรศการ</h3>
        <p style="color:var(--muted-fg); font-size:13.5px">เมื่อคุณครูตรวจงานและกดปุ่ม "⭐ ปักหมุดเป็นผลงานเด่น" ผลงานสร้างสรรค์จะมาจัดแสดงที่นี่เพื่อเป็นแรงบันดาลใจให้เพื่อนๆ ในห้องเรียน</p>
      </div>
    `;
    return;
  }

  let html = '<div class="bento showcase-grid">';

  featuredList.forEach(({ assignment: a, submission: s }, idx) => {
    const files = (Array.isArray(s.files) && s.files.length) ? s.files : (s.file ? [s.file] : []);
    const imgFiles = files.filter(f => {
      const fUrl = f.dataUrl || f.url || '';
      return (f.type && f.type.startsWith('image')) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name || fUrl);
    });
    const docFiles = files.filter(f => !imgFiles.includes(f));

    let mediaHtml = '';
    if (imgFiles.length > 0) {
      const firstImg = imgFiles[0];
      const firstUrl = firstImg.dataUrl || firstImg.url;
      mediaHtml = `
        <div class="showcase-cover" onclick="openLightbox('${esc(firstUrl)}', '${esc(firstImg.name)}')">
          <img src="${esc(firstUrl)}" alt="${esc(firstImg.name)}" loading="lazy">
          ${imgFiles.length > 1 ? `<span class="showcase-count-badge">+${imgFiles.length - 1} รูปภาพ</span>` : ''}
        </div>
      `;
    }

    let docsHtml = '';
    if (docFiles.length > 0) {
      docsHtml = `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px">` +
        docFiles.map(f => {
          const fUrl = f.dataUrl || f.url;
          return `<a class="sub-file" style="font-size:12px; padding:4px 8px" onclick="openFile('${esc(fUrl)}', '${esc(f.name)}')">${ICONS.download}${esc(f.name)}</a>`;
        }).join('') + `</div>`;
    }

    const spanClass = (idx === 0 && featuredList.length >= 3) ? ' span-2' : '';

    html += `
      <div class="card card-pad showcase-card${spanClass}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:10px">
          <div style="display:flex; align-items:center; gap:10px">
            ${avatarOf(s.studentName, idx)}
            <div>
              <b style="font-size:15px">${esc(s.studentName)}</b>
              <div style="font-size:12px; color:var(--muted-fg)">${esc(s.studentId ? 'รหัส ' + s.studentId : '')} • ${fmtDateShort(s.submittedAt)}</div>
            </div>
          </div>
          <span class="chip chip-amber" style="font-weight:800">${ICONS.trophy || '🏆'} ผลงานเด่น</span>
        </div>

        <div style="margin-bottom:8px">
          <span class="chip chip-indigo" style="font-size:11.5px; margin-bottom:4px">${esc(a.title)}</span>
          ${s.score !== null && s.score !== undefined ? `<span class="chip chip-green" style="font-size:11.5px; font-weight:700">⭐ ${s.score}/${a.maxScore} คะแนน</span>` : ''}
        </div>

        ${mediaHtml}

        ${s.text ? `<p style="font-size:13.5px; line-height:1.6; margin:8px 0; background:var(--muted); padding:8px 10px; border-radius:2px">${linkify(s.text)}</p>` : ''}

        ${docsHtml}

        ${s.link ? `<div style="margin-top:8px"><a class="sub-file" href="${esc(s.link)}" target="_blank" rel="noopener">${ICONS.link}เปิดลิงก์ผลงาน</a></div>` : ''}

        ${s.comment ? `
          <div class="showcase-comment">
            <b>💬 คำชมจากครู:</b> ${esc(s.comment)}
          </div>
        ` : ''}
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}
