/* ============================================================
   Classwork Hub — state.js
   ข้อมูล + การบันทึก/โหลด (localStorage + Cloud sync) + ข้อมูลตัวอย่าง
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
  try{ const raw = localStorage.getItem(KEY); data = raw ? JSON.parse(raw) : null; }
  catch(e){ data = null; }
  if(!data){ data = defaultData(); }
  if(!Array.isArray(data.posts)) data.posts = [];
  if(!Array.isArray(data.assignments)) data.assignments = [];
  
  if(!localStorage.getItem(KEY) && data.posts.length === 0) seed();

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

function seed(){
  const t = Date.now();
  const day = 86400000;
  data.posts = [
    {
      id: uid(), type:'announcement', title:'ยินดีต้อนรับเข้าสู่ห้องเรียนออนไลน์ 🎉', author:TEACHER,
      text:'สวัสดีนักเรียนทุกคน! หน้านี้ใช้สำหรับดูใบงาน ส่งงาน ตรวจสอบคะแนน และดูตัวอย่างงาน/วิดีโอสอน\n\nสามารถสลับโหมดเป็น "นักเรียน" ด้านบนเพื่อลองส่งงาน หรือ "ครู" เพื่อสร้างงานและตรวจงาน (รหัสผ่านครู: 1234)',
      image:null, videoUrl:null, videoFile:null, createdAt: new Date(t - 3*day).toISOString(),
      likes:['คุณครู'], comments:[{id:uid(), name:'สมชาย ใจดี', text:'รับทราบครับครู', createdAt:new Date(t-2*day).toISOString()}]
    },
    {
      id: uid(), type:'inspiration', title:'แรงบันดาลใจ: โปสเตอร์สีสันสดใส', author:TEACHER,
      text:'ลองดูตัวอย่างงานที่ใช้สีสดใสตัดกัน ลายเส้นเรียบง่ายแต่โดดเด่น — เหมาะเป็นแนวทางสำหรับงานชิ้นแรกของเรา',
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80', videoUrl:null, videoFile:null, createdAt: new Date(t - 2*day).toISOString(),
      likes:['คุณครู','สมชาย ใจดี'], comments:[]
    },
    {
      id: uid(), type:'video', title:'วิดีโอสอน: ทำโปสเตอร์ง่ายๆ ด้วย Canva', author:TEACHER,
      text:'ดูวิดีโอนี้ก่อนเริ่มทำงานนะคะ จะได้เข้าใจขั้นตอนการออกแบบโปสเตอร์ตั้งแต่เริ่มต้น',
      image:null, videoUrl:'https://www.youtube.com/watch?v=FTFaQWZBqQ8', videoFile:null, createdAt: new Date(t - day).toISOString(),
      likes:[], comments:[]
    },
    {
      id: uid(), type:'tutorial', title:'ขั้นตอนการส่งงานในเว็บนี้', author:TEACHER,
      text:'1. เปิดเมนู "ใบงาน" เลือกงานที่ต้องการ\n2. กด "ส่งงาน"\n3. พิมพ์ชื่อ-นามสกุล\n4. เขียนคำตอบ หรืออัปโหลดไฟล์ / แปะลิงก์\n5. กด "ส่งงาน" — จากนั้นรอคุณครูตรวจ\n\nตรวจสอบคะแนนได้ที่เมนู "ผลงานของฉัน"',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80', videoUrl:null, videoFile:null, createdAt: new Date(t - 5*86400000).toISOString(),
      likes:[], comments:[]
    }
  ];
  data.assignments = [
    {
      id: uid(), title:'ออกแบบโปสเตอร์แนะนำตัวเอง', subject:'คอมพิวเตอร์กราฟิก',
      description:'ออกแบบโปสเตอร์แนะนำตัวเอง 1 หน้ากระดาษ A4 ใส่ชื่อ รูป หรือสิ่งที่ชอบ เพื่อให้เพื่อนและครูรู้จักเรามากขึ้น',
      instructions:'1) ใช้ Canva / Photoshop / โปรแกรมอะไรก็ได้\n2) กำหนดขนาด A4 (210×297 มม.)\n3) ใส่ชื่อ-นามสกุล ชั้นเรียน งานอดิเรก\n4) ออกแบบให้สวยงาม อ่านง่าย สีไม่แย่งกัน\n5) ส่งไฟล์ PDF หรือ PNG ผ่านหน้าเว็บนี้',
      dueDate: new Date(t + 6*day).toISOString(), maxScore: 10,
      attachment: null,
      exampleImages: [
        { name:'ตัวอย่างโปสเตอร์ 1', dataUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80', type:'image/jpeg' },
        { name:'ตัวอย่างโปสเตอร์ 2', dataUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80', type:'image/jpeg' }
      ],
      createdAt: new Date(t - day).toISOString(),
      submissions: [
        { id: uid(), studentName:'สมชาย ใจดี', text:'ส่งงานครับครู ผมออกแบบด้วย Canva ใช้ธีมสีเขียว-ส้ม', file:null,
          link:'https://drive.google.com/example-posters', submittedAt:new Date(t - 3*3600000).toISOString(),
          score:null, comment:'', status:'pending', gradedAt:null }
      ]
    }
  ];
  save();
}