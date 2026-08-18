/* ============================================================
   Classwork Hub — feed.js
   ฟีดสไตล์ Facebook: render โพสต์ + ถูกใจ + คอมเมนต์ + แชร์
   ============================================================ */
'use strict';

function renderFeed(){
  const wrap = document.getElementById('feed');
  const teacherBar = '<div id="feedAddBtns" style="display:flex; justify-content:flex-end; margin-bottom:14px"></div>';
  let html = teacherBar;
  if(!data.posts.length){
    html += '<div class="card empty"><p>ยังไม่มีโพสต์</p></div>';
  }else{
    html += data.posts.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(postCard).join('');
  }
  wrap.innerHTML = html;
  renderHeader();
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

  const comments = (p.comments||[]).map(c =>
    '<div class="comment-item">'+avatarOf(c.name, (p.comments||[]).indexOf(c))+
    '<div class="comment-bubble"><div class="comment-name">'+esc(c.name)+'</div><div class="comment-text">'+esc(c.text)+'</div></div></div>'
  ).join('');

  return '<article class="post">'+
    '<div class="post-head">'+avatarOf(p.author, (p.likes||[]).length+(p.comments||[]).length)+
      '<div class="post-meta"><div class="post-author">'+esc(p.author)+'</div><div class="post-time">'+fmtDate(p.createdAt)+'</div></div>'+
      '<span class="chip '+meta.cls+'">'+meta.label+'</span>'+
    '</div>'+
    '<div class="post-body"><div class="post-title">'+esc(p.title)+'</div>'+esc(p.text)+'</div>'+
    media+
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

function sharePost(postId){
  const url = location.href;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(()=>toast('🔗 คัดลอกลิงก์หน้าเว็บแล้ว!'), ()=>toast('โพสต์พร้อมแชร์แล้ว!'));
  }else toast('โพสต์พร้อมแชร์แล้ว!');
}