/* ============================================================
   Classwork Hub — feed.js
   ฟีดสไตล์ Facebook: render โพสต์ + ถูกใจ + คอมเมนต์ + แชร์ + Hyperlink + Rich Link Preview
   ============================================================ */
'use strict';

function renderFeed(){
  const wrap = document.getElementById('feed');
  const teacherBar = '<div id="feedAddBtns" style="display:flex; justify-content:flex-end; margin-bottom:14px; gap:8px"></div>';
  let html = teacherBar;
  if(!data.posts.length){
    html += '<div class="card empty"><p>ยังไม่มีโพสต์</p></div>';
  }else{
    html += data.posts.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(postCard).join('');
  }
  wrap.innerHTML = html;
  renderHeader();
  loadLinkPreviews();
}

function postCard(p){
  const meta = POST_META[p.type] || POST_META.announcement;
  const me = currentIdentity();
  const liked = me && p.likes && p.likes.includes(me);
  
  const img = p.image ? '<div class="post-media"><img src="'+esc(p.image)+'" alt="'+esc(p.title)+'" style="cursor:pointer" onclick="openLightbox(\''+esc(p.image)+'\',\''+esc(p.title)+'\')"></div>' : '';
  let media = img;
  const embed = p.videoUrl ? ytEmbed(p.videoUrl) : null;
  if(embed) media += '<div class="post-media"><div class="video-frame"><iframe src="'+esc(embed)+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div></div>';
  if(p.videoFile) {
    const vUrl = p.videoFile.dataUrl || p.videoFile.url || p.videoFile;
    media += '<div class="post-media"><video controls src="'+esc(vUrl)+'"></video></div>';
  }

  // Detect external URL for Rich Link Preview
  const detectedUrl = extractFirstUrl(p.text) || (p.videoUrl && !embed ? p.videoUrl : null);
  let linkPreviewHtml = '';
  if (detectedUrl && !p.image && !p.videoFile && !embed) {
    linkPreviewHtml = `<div class="post-link-preview-box" id="link-preview-${p.id}" data-url="${esc(detectedUrl)}"></div>`;
  }

  const isTeacher = role === 'teacher';

  const comments = (p.comments||[]).map(c => {
    const commentControls = isTeacher ? `
      <div style="display:inline-flex; gap:4px; margin-left:8px">
        <button class="btn btn-ghost" style="padding:0 4px; font-size:11px" onclick="editComment('${p.id}', '${c.id}', '${esc(c.text)}')">✏️</button>
        <button class="btn btn-ghost" style="padding:0 4px; font-size:11px; color:#B91C1C" onclick="deleteComment('${p.id}', '${c.id}')">🗑️</button>
      </div>` : '';

    return '<div class="comment-item">'+avatarOf(c.name, (p.comments||[]).indexOf(c))+
      '<div class="comment-bubble">' +
        '<div style="display:flex; justify-content:space-between; align-items:center">' +
          '<div class="comment-name">'+esc(c.name)+'</div>' +
          commentControls +
        '</div>' +
        '<div class="comment-text" id="cmt-text-'+c.id+'">'+linkify(c.text)+'</div>' +
      '</div></div>';
  }).join('');

  const teacherPostActions = isTeacher ? `
    <div style="display:flex; gap:4px; margin-left:auto">
      <button class="btn btn-soft" style="padding:2px 8px; font-size:12px" onclick="openEditPostModal('${p.id}')">✏️ แก้ไข</button>
      <button class="btn btn-ghost" style="padding:2px 8px; font-size:12px; color:#B91C1C" onclick="deletePost('${p.id}')">🗑️ ลบ</button>
    </div>` : '';

  return '<article class="post">'+
    '<div class="post-head">'+avatarOf(p.author, (p.likes||[]).length+(p.comments||[]).length)+
      '<div class="post-meta"><div class="post-author">'+esc(p.author)+'</div><div class="post-time">'+fmtDate(p.createdAt)+'</div></div>'+
      '<span class="chip '+meta.cls+'" style="margin-right:6px">'+meta.label+'</span>'+
      teacherPostActions +
    '</div>'+
    '<div class="post-body"><div class="post-title">'+esc(p.title)+'</div>'+linkify(p.text)+'</div>'+
    media+
    linkPreviewHtml+
    '<div class="post-actions">'+
      '<button class="'+(liked?'liked':'')+'" onclick="toggleLike(\''+p.id+'\')">'+(liked?ICONS.heartFill:ICONS.heart)+'ถูกใจ ('+(p.likes||[]).length+')</button>'+
      '<button onclick="focusComment(\''+p.id+'\')">'+ICONS.comment+'คอมเมนต์ ('+(p.comments||[]).length+')</button>'+
      '<button onclick="sharePost(\''+p.id+'\')">'+ICONS.share+'แชร์</button>'+
    '</div>'+
    (comments ? '<div class="comments">'+comments+'</div>' : '')+
    '<div class="comments" style="'+(comments?'':'padding-top:0')+'">'+
      '<div class="comment-form">'+avatarOf(me||'ก', 1)+
        '<input class="input" id="cmt-'+p.id+'" placeholder="เขียนคอมเมนต์..." onkeydown="if(event.key===\'Enter\')addComment(\''+p.id+'\')">'+
        '<button class="btn btn-soft" onclick="addComment(\''+p.id+'\')">ส่ง</button>'+
      '</div>'+
    '</div>'+
  '</article>';
}

/**
 * ดึงข้อมูลตัวอย่างเว็บไซต์ (Open Graph Preview) แบบ Asynchronous
 */
async function loadLinkPreviews(){
  const boxes = document.querySelectorAll('.post-link-preview-box[data-url]');
  for(const box of boxes){
    const url = box.getAttribute('data-url');
    if(!url || box.dataset.loaded) continue;
    box.dataset.loaded = 'true';

    try {
      const preview = await API.fetchLinkPreview(url);
      if(!preview) continue;

      const imgHtml = preview.image ? `<div class="link-preview-img"><img src="${esc(preview.image)}" alt="${esc(preview.title || '')}" loading="lazy"></div>` : '';
      const favHtml = preview.favicon ? `<img src="${esc(preview.favicon)}" alt="" class="link-favicon">` : '';

      box.innerHTML = `
        <a href="${esc(preview.url)}" target="_blank" rel="noopener noreferrer" class="link-preview-card" onclick="event.stopPropagation()">
          ${imgHtml}
          <div class="link-preview-info">
            <div class="link-preview-domain">${favHtml}<span>${esc(preview.domain || '')}</span></div>
            <div class="link-preview-title">${esc(preview.title || preview.domain)}</div>
            <div class="link-preview-desc">${esc(preview.description || '')}</div>
          </div>
        </a>
      `;
    } catch (e) {
      console.warn('Load link preview error:', e);
    }
  }
}

async function toggleLike(postId){
  const p = data.posts.find(x=>x.id===postId); if(!p) return;
  const me = currentIdentity();
  if(!me){ if(!ensureStudentName()) return; }
  const userName = currentIdentity();
  await API.toggleLike(postId, userName);
  renderFeed();
}

function focusComment(postId){
  const el = document.getElementById('cmt-'+postId);
  if(el) el.focus();
}

async function addComment(postId){
  const p = data.posts.find(x=>x.id===postId); if(!p) return;
  if(!ensureStudentName()) return;
  const input = document.getElementById('cmt-'+postId);
  const text = (input.value||'').trim();
  if(!text) return;
  const userName = currentIdentity();
  input.value = '';
  await API.addComment(postId, { id: uid(), name: userName, text, createdAt: nowISO() });
  renderFeed();
}

async function deletePost(postId){
  if(!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้?')) return;
  toast('⏳ กำลังลบโพสต์...');
  const ok = await API.deletePost(postId);
  if(ok){
    toast('🗑️ ลบโพสต์เรียบร้อย');
    renderFeed();
  }
}

async function deleteComment(postId, commentId){
  if(!confirm('ลบคอมเมนต์นี้?')) return;
  toast('⏳ กำลังลบคอมเมนต์...');
  const ok = await API.deleteComment(postId, commentId);
  if(ok){
    toast('🗑️ ลบคอมเมนต์เรียบร้อย');
    renderFeed();
  }
}

async function editComment(postId, commentId, currentText){
  const newText = prompt('แก้ไขข้อความคอมเมนต์:', currentText);
  if(newText === null) return;
  if(!newText.trim()){
    toast('กรุณาระบุข้อความ');
    return;
  }
  toast('⏳ กำลังบันทึกการแก้ไข...');
  const ok = await API.updateComment(postId, commentId, newText.trim());
  if(ok){
    toast('✏️ แก้ไขคอมเมนต์เรียบร้อย');
    renderFeed();
  }
}

function sharePost(postId){
  const url = location.href;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(()=>toast('🔗 คัดลอกลิงก์หน้าเว็บแล้ว!'), ()=>toast('โพสต์พร้อมแชร์แล้ว!'));
  }else toast('โพสต์พร้อมแชร์แล้ว!');
}