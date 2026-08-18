/* ============================================================
   Classwork Hub — state.js
   ข้อมูล + การบันทึก/โหลด (localStorage + Cloud sync)
   ============================================================ */
'use strict';

const KEY = 'classworkHub_v1';
const STUDENT_KEY = 'cwh_student_v1';
const ROLE_KEY = 'cwh_role_v1';

let data = null;
let role = localStorage.getItem(ROLE_KEY) || 'teacher';
let studentName = localStorage.getItem(STUDENT_KEY) || '';
let gradingId = null;
let editingAssignId = null;   // assignment id being submitted
let editingSubId = null;      // existing submission id being edited

function defaultData(){ return { posts: [], assignments: [] }; }

async function load(){
  try{ 
    const raw = localStorage.getItem(KEY); 
    data = raw ? JSON.parse(raw) : null; 
  } catch(e){ 
    data = null; 
  }
  
  if(!data){ data = defaultData(); }
  if(!Array.isArray(data.posts)) data.posts = [];
  if(!Array.isArray(data.assignments)) data.assignments = [];

  // Try to connect with Cloudflare API if available
  const isCloud = await API.init();
  if (isCloud) {
    try {
      const [cloudPosts, cloudAssignments] = await Promise.all([
        API.getPosts(),
        API.getAssignments()
      ]);
      data.posts = cloudPosts;
      data.assignments = cloudAssignments;
      toast('☁️ เชื่อมต่อระบบฐานข้อมูล Cloudflare สำเร็จ!');
    } catch(e) {
      console.warn('Cloud sync error on load:', e);
    }
  }
}

function save(){
  try{
    const json = JSON.stringify(data);
    if(json.length > 4.5 * 1024 * 1024) toast('⚠️ ข้อมูลใกล้เต็มพื้นที่จัดเก็บ — ลบไฟล์/รูปเก่าที่ไม่ใช้');
    localStorage.setItem(KEY, json);
  }catch(e){ toast('⚠️ พื้นที่จัดเก็บเต็ม — แนะนำให้ใช้ Cloudinary หรือลิงก์แทน'); }
}