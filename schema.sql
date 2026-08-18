-- ============================================================
-- Classwork Hub — Cloudflare D1 Database Schema
-- ============================================================

DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS assignment_examples;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS posts;

-- 1. Posts table
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'announcement', 'example', 'video', 'tutorial', 'inspiration'
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'คุณครู',
  text TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  video_file_url TEXT,
  created_at TEXT NOT NULL
);

-- 2. Post Likes table
CREATE TABLE post_likes (
  post_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_name),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- 3. Post Comments table
CREATE TABLE post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- 4. Assignments table
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  due_date TEXT NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 10,
  attachment_name TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TEXT NOT NULL
);

-- 5. Assignment Example Images table
CREATE TABLE assignment_examples (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT DEFAULT 'image/png',
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- 6. Submissions table
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  text TEXT,
  file_name TEXT,
  file_url TEXT,
  file_type TEXT,
  link TEXT,
  submitted_at TEXT NOT NULL,
  score REAL,
  comment TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'graded', 'resubmit'
  graded_at TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Indices for high query performance
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_comments_post ON post_comments(post_id);
CREATE INDEX idx_likes_post ON post_likes(post_id);
CREATE INDEX idx_assignments_created ON assignments(created_at DESC);
CREATE INDEX idx_examples_assignment ON assignment_examples(assignment_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_name);

-- Initial Seed Data
INSERT INTO posts (id, type, title, author, text, image_url, video_url, video_file_url, created_at)
VALUES 
('post_seed_1', 'announcement', 'ยินดีต้อนรับเข้าสู่ห้องเรียนออนไลน์ 🎉', 'คุณครู', 'สวัสดีนักเรียนทุกคน! หน้านี้ใช้สำหรับดูใบงาน ส่งงาน ตรวจสอบคะแนน และดูตัวอย่างงาน/วิดีโอสอน\n\nสามารถสลับโหมดเป็น "นักเรียน" ด้านบนเพื่อลองส่งงาน หรือ "ครู" เพื่อสร้างงานและตรวจงาน (รหัสผ่านครู: 1234)', NULL, NULL, NULL, datetime('now', '-3 days')),
('post_seed_2', 'inspiration', 'แรงบันดาลใจ: โปสเตอร์สีสันสดใส', 'คุณครู', 'ลองดูตัวอย่างงานที่ใช้สีสดใสตัดกัน ลายเส้นเรียบง่ายแต่โดดเด่น — เหมาะเป็นแนวทางสำหรับงานชิ้นแรกของเรา', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80', NULL, NULL, datetime('now', '-2 days')),
('post_seed_3', 'video', 'วิดีโอสอน: ทำโปสเตอร์ง่ายๆ ด้วย Canva', 'คุณครู', 'ดูวิดีโอนี้ก่อนเริ่มทำงานนะคะ จะได้เข้าใจขั้นตอนการออกแบบโปสเตอร์ตั้งแต่เริ่มต้น', NULL, 'https://www.youtube.com/watch?v=FTFaQWZBqQ8', NULL, datetime('now', '-1 days')),
('post_seed_4', 'tutorial', 'ขั้นตอนการส่งงานในเว็บนี้', 'คุณครู', '1. เปิดเมนู "ใบงาน" เลือกงานที่ต้องการ\n2. กด "ส่งงาน"\n3. พิมพ์ชื่อ-นามสกุล\n4. เขียนคำตอบ หรืออัปโหลดไฟล์ / แปะลิงก์\n5. กด "ส่งงาน" — จากนั้นรอคุณครูตรวจ\n\nตรวจสอบคะแนนได้ที่เมนู "ผลงานของฉัน"', NULL, NULL, NULL, datetime('now', '-5 hours'));

INSERT INTO post_likes (post_id, user_name, created_at)
VALUES 
('post_seed_1', 'คุณครู', datetime('now', '-2 days')),
('post_seed_2', 'คุณครู', datetime('now', '-1 days')),
('post_seed_2', 'สมชาย ใจดี', datetime('now', '-1 days'));

INSERT INTO post_comments (id, post_id, name, text, created_at)
VALUES 
('comm_seed_1', 'post_seed_1', 'สมชาย ใจดี', 'รับทราบครับครู', datetime('now', '-2 days'));

INSERT INTO assignments (id, title, subject, description, instructions, due_date, max_score, attachment_name, attachment_url, attachment_type, created_at)
VALUES 
('assign_seed_1', 'ออกแบบโปสเตอร์แนะนำตัวเอง', 'คอมพิวเตอร์กราฟิก', 'ออกแบบโปสเตอร์แนะนำตัวเอง 1 หน้ากระดาษ A4 ใส่ชื่อ รูป หรือสิ่งที่ชอบ เพื่อให้เพื่อนและครูรู้จักเรามากขึ้น', '1) ใช้ Canva / Photoshop / โปรแกรมอะไรก็ได้\n2) กำหนดขนาด A4 (210×297 มม.)\n3) ใส่ชื่อ-นามสกุล ชั้นเรียน งานอดิเรก\n4) ออกแบบให้สวยงาม อ่านง่าย สีไม่แย่งกัน\n5) ส่งไฟล์ PDF หรือ PNG ผ่านหน้าเว็บนี้', datetime('now', '+7 days'), 10, NULL, NULL, NULL, datetime('now', '-1 days'));

INSERT INTO assignment_examples (id, assignment_id, name, image_url, type)
VALUES 
('ex_seed_1', 'assign_seed_1', 'ตัวอย่างโปสเตอร์ 1', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80', 'image/jpeg'),
('ex_seed_2', 'assign_seed_1', 'ตัวอย่างโปสเตอร์ 2', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80', 'image/jpeg');

INSERT INTO submissions (id, assignment_id, student_name, text, file_name, file_url, file_type, link, submitted_at, score, comment, status, graded_at)
VALUES 
('sub_seed_1', 'assign_seed_1', 'สมชาย ใจดี', 'ส่งงานครับครู ผมออกแบบด้วย Canva ใช้ธีมสีเขียว-ส้ม', NULL, NULL, NULL, 'https://drive.google.com/example-posters', datetime('now', '-3 hours'), NULL, '', 'pending', NULL);
