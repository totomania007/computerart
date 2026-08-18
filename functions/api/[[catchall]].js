/**
 * Cloudflare Pages Functions API Handler
 * Handles all /api/* routes with Cloudflare D1 Database binding 'DB'
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function ensureTables(db) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS students (
        student_id TEXT PRIMARY KEY,
        student_code TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `).run();
  } catch (_) {}
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return onRequestOptions();
  }

  const db = env.DB;

  // -------------------------------------------------------------
  // Route: /api/health
  // -------------------------------------------------------------
  if (path.length === 0 || path[0] === 'health') {
    if (!db) {
      return jsonResponse({
        success: true,
        status: 'online',
        database: 'waiting_for_binding',
        message: 'Pages Function is online! D1 database binding "DB" can be configured in Cloudflare Pages Settings -> Functions.'
      });
    }
    await ensureTables(db);
    const dbTest = await db.prepare('SELECT count(*) as count FROM posts').first().catch(() => null);
    const stuTest = await db.prepare('SELECT count(*) as count FROM students').first().catch(() => null);
    return jsonResponse({
      success: true,
      status: 'online',
      database: dbTest ? 'Cloudflare D1 connected' : 'D1 connected (ready)',
      postCount: dbTest?.count || 0,
      studentCount: stuTest?.count || 0
    });
  }

  // Verify D1 Database Binding for other routes
  if (!db) {
    return errorResponse('Cloudflare D1 database is not bound as "DB". Please check Pages Settings -> Functions -> D1 Database Bindings.', 500);
  }

  await ensureTables(db);

  try {
    // -------------------------------------------------------------
    // Route: /api/verify-pin (POST) - Teacher PIN
    // -------------------------------------------------------------
    if (path[0] === 'verify-pin' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const pin = String(body.pin || '');
      const valid = pin === '1234';
      return jsonResponse({ success: valid, valid });
    }

    // -------------------------------------------------------------
    // Route: /api/students
    // -------------------------------------------------------------
    if (path[0] === 'students') {
      // POST /api/students/verify — Verify by 8-digit code (4 front + 4 back) or Student ID
      if (path.length >= 2 && path[1] === 'verify' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const code = String(body.code || '').trim().replace(/\D/g, '');
        const rawCode = String(body.code || '').trim();
        if (!code && !rawCode) return errorResponse('กรุณาระบุรหัสประจำตัว 8 หลัก (4 ตัวหน้า + 4 ตัวท้าย)');

        let student = await db.prepare(
          'SELECT * FROM students WHERE student_code = ? OR student_id = ?'
        ).bind(code, rawCode).first().catch(() => null);

        if (!student) {
          const allStudents = await db.prepare('SELECT * FROM students').all().catch(() => ({ results: [] }));
          for (const s of (allStudents.results || [])) {
            const cleanId = String(s.student_id).replace(/\D/g, '');
            const generated8 = cleanId.length >= 8 ? (cleanId.slice(0, 4) + cleanId.slice(-4)) : cleanId;
            if (generated8 === code || s.student_code === code || s.student_id === rawCode) {
              student = s;
              break;
            }
          }
        }

        if (student) {
          return jsonResponse({
            success: true,
            valid: true,
            student: {
              studentId: student.student_id,
              studentCode: student.student_code,
              fullName: student.full_name
            }
          });
        }

        return jsonResponse({
          success: false,
          valid: false,
          error: 'ไม่พบรหัสนักศึกษานี้ในระบบ (กรุณาตรวจสอบรหัส 8 ตัว: 4 ตัวหน้า + 4 ตัวท้าย)'
        });
      }

      // GET /api/students — List all students
      if (path.length === 1 && method === 'GET') {
        const result = await db.prepare('SELECT * FROM students ORDER BY student_id ASC').all().catch(() => ({ results: [] }));
        return jsonResponse({
          success: true,
          students: (result.results || []).map(s => ({
            studentId: s.student_id,
            studentCode: s.student_code,
            fullName: s.full_name,
            createdAt: s.created_at
          }))
        });
      }

      // POST /api/students — Add or Bulk import students
      if (path.length === 1 && method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body) return errorResponse('Invalid payload');

        const now = new Date().toISOString();
        const studentList = Array.isArray(body.students) ? body.students : (body.studentId ? [body] : []);
        if (!studentList.length) return errorResponse('กรุณาระบุข้อมูลนักศึกษา');

        let addedCount = 0;
        for (const s of studentList) {
          const sId = String(s.studentId || s.student_id || s.id || '').trim();
          const sName = String(s.fullName || s.full_name || s.name || '').trim();
          if (!sId || !sName) continue;

          const cleanDigits = sId.replace(/\D/g, '');
          let sCode = s.studentCode || s.student_code || s.code;
          if (!sCode) {
            sCode = cleanDigits.length >= 8 ? (cleanDigits.slice(0, 4) + cleanDigits.slice(-4)) : cleanDigits;
          }
          sCode = String(sCode).trim();

          await db.prepare(`
            INSERT INTO students (student_id, student_code, full_name, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(student_id) DO UPDATE SET student_code=excluded.student_code, full_name=excluded.full_name
          `).bind(sId, sCode, sName, now).run().catch(async () => {
            await db.prepare('DELETE FROM students WHERE student_id = ?').bind(sId).run().catch(() => {});
            await db.prepare('INSERT INTO students (student_id, student_code, full_name, created_at) VALUES (?, ?, ?, ?)').bind(sId, sCode, sName, now).run();
          });
          addedCount++;
        }

        return jsonResponse({ success: true, count: addedCount, message: `บันทึกรายชื่อนักศึกษา ${addedCount} คนเรียบร้อย` }, 201);
      }

      // DELETE /api/students/:id
      if (path.length >= 2 && method === 'DELETE') {
        const id = path[1];
        await db.prepare('DELETE FROM students WHERE student_id = ?').bind(id).run();
        return jsonResponse({ success: true, message: 'ลบรายชื่อนักศึกษาเรียบร้อย' });
      }
    }

    // -------------------------------------------------------------
    // Route: /api/posts
    // -------------------------------------------------------------
    if (path[0] === 'posts') {
      // POST /api/posts/:id/like — Toggle Like
      if (path.length >= 3 && path[2] === 'like' && method === 'POST') {
        const postId = path[1];
        const body = await request.json().catch(() => ({}));
        const userName = body.name || 'คุณครู';

        const existing = await db.prepare(
          'SELECT 1 FROM post_likes WHERE post_id = ? AND user_name = ?'
        ).bind(postId, userName).first().catch(() => null);

        if (existing) {
          await db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_name = ?').bind(postId, userName).run();
          return jsonResponse({ success: true, liked: false, userName });
        } else {
          await db.prepare('INSERT INTO post_likes (post_id, user_name, created_at) VALUES (?, ?, ?)').bind(
            postId, userName, new Date().toISOString()
          ).run();
          return jsonResponse({ success: true, liked: true, userName });
        }
      }

      // POST /api/posts/:id/comment — Add Comment
      if (path.length >= 3 && path[2] === 'comment' && method === 'POST') {
        const postId = path[1];
        const body = await request.json().catch(() => null);
        if (!body || !body.text || !body.name) return errorResponse('กรุณาระบุชื่อและข้อความคอมเมนต์');

        const id = body.id || ('comm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
        const createdAt = body.createdAt || new Date().toISOString();

        await db.prepare(`
          INSERT INTO post_comments (id, post_id, name, text, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(id, postId, body.name, body.text, createdAt).run();

        return jsonResponse({
          success: true,
          comment: { id, name: body.name, text: body.text, createdAt }
        }, 201);
      }

      // GET /api/posts — List all posts
      if (path.length === 1 && method === 'GET') {
        const postsResult = await db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
        const posts = postsResult.results || [];
        const likesResult = await db.prepare('SELECT * FROM post_likes').all().catch(() => ({ results: [] }));
        const commentsResult = await db.prepare('SELECT * FROM post_comments ORDER BY created_at ASC').all().catch(() => ({ results: [] }));

        const likesByPost = {};
        for (const l of (likesResult.results || [])) {
          if (!likesByPost[l.post_id]) likesByPost[l.post_id] = [];
          likesByPost[l.post_id].push(l.user_name);
        }

        const commentsByPost = {};
        for (const c of (commentsResult.results || [])) {
          if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
          commentsByPost[c.post_id].push({
            id: c.id,
            name: c.name,
            text: c.text,
            createdAt: c.created_at
          });
        }

        const enrichedPosts = posts.map(p => ({
          id: p.id,
          type: p.type,
          title: p.title,
          author: p.author,
          text: p.text,
          image: p.image_url,
          videoUrl: p.video_url,
          videoFile: p.video_file_url,
          createdAt: p.created_at,
          likes: likesByPost[p.id] || [],
          comments: commentsByPost[p.id] || []
        }));

        return jsonResponse({ success: true, posts: enrichedPosts });
      }

      // POST /api/posts — Create new post
      if (path.length === 1 && method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.title || !body.text) return errorResponse('กรุณากรอกหัวข้อและเนื้อหาโพสต์');

        const id = body.id || ('post_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
        const createdAt = body.createdAt || new Date().toISOString();

        await db.prepare(`
          INSERT INTO posts (id, type, title, author, text, image_url, video_url, video_file_url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          body.type || 'announcement',
          body.title,
          body.author || 'คุณครู',
          body.text,
          body.image || null,
          body.videoUrl || null,
          body.videoFile || null,
          createdAt
        ).run();

        return jsonResponse({ success: true, id, message: 'สร้างโพสต์สำเร็จ' }, 201);
      }
    }

    // -------------------------------------------------------------
    // Route: /api/assignments
    // -------------------------------------------------------------
    if (path[0] === 'assignments') {
      // GET /api/assignments — List all assignments
      if (path.length === 1 && method === 'GET') {
        const assignResult = await db.prepare('SELECT * FROM assignments ORDER BY created_at DESC').all();
        const assignments = assignResult.results || [];

        const examplesResult = await db.prepare('SELECT * FROM assignment_examples').all().catch(() => ({ results: [] }));
        const subsResult = await db.prepare('SELECT * FROM submissions ORDER BY submitted_at DESC').all().catch(() => ({ results: [] }));

        const examplesByAssign = {};
        for (const ex of (examplesResult.results || [])) {
          if (!examplesByAssign[ex.assignment_id]) examplesByAssign[ex.assignment_id] = [];
          examplesByAssign[ex.assignment_id].push({
            id: ex.id,
            name: ex.name,
            dataUrl: ex.image_url,
            type: ex.type
          });
        }

        const subsByAssign = {};
        for (const s of (subsResult.results || [])) {
          if (!subsByAssign[s.assignment_id]) subsByAssign[s.assignment_id] = [];
          subsByAssign[s.assignment_id].push({
            id: s.id,
            studentName: s.student_name,
            studentId: s.student_id || '',
            text: s.text || '',
            file: s.file_url ? { name: s.file_name || 'ไฟล์แนบ', dataUrl: s.file_url, type: s.file_type || '' } : null,
            link: s.link || '',
            submittedAt: s.submitted_at,
            score: s.score,
            comment: s.comment || '',
            status: s.status || 'pending',
            gradedAt: s.graded_at
          });
        }

        const enrichedAssignments = assignments.map(a => ({
          id: a.id,
          title: a.title,
          subject: a.subject,
          description: a.description,
          instructions: a.instructions,
          dueDate: a.due_date,
          maxScore: a.max_score,
          attachment: a.attachment_url ? { name: a.attachment_name, dataUrl: a.attachment_url, type: a.attachment_type } : null,
          exampleImages: examplesByAssign[a.id] || [],
          createdAt: a.created_at,
          submissions: subsByAssign[a.id] || []
        }));

        return jsonResponse({ success: true, assignments: enrichedAssignments });
      }

      // POST /api/assignments — Create Assignment
      if (path.length === 1 && method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.title) return errorResponse('กรุณาระบุชื่อใบงาน');

        const id = body.id || ('assign_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
        const createdAt = body.createdAt || new Date().toISOString();
        const attachment = body.attachment || null;

        await db.prepare(`
          INSERT INTO assignments (id, title, subject, description, instructions, due_date, max_score, attachment_name, attachment_url, attachment_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          body.title,
          body.subject || '',
          body.description || '',
          body.instructions || '',
          body.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
          body.maxScore || 10,
          attachment?.name || null,
          attachment?.dataUrl || null,
          attachment?.type || null,
          createdAt
        ).run();

        if (Array.isArray(body.exampleImages) && body.exampleImages.length > 0) {
          for (let i = 0; i < body.exampleImages.length; i++) {
            const ex = body.exampleImages[i];
            const exId = ex.id || ('ex_' + id + '_' + i);
            await db.prepare(`
              INSERT INTO assignment_examples (id, assignment_id, name, image_url, type)
              VALUES (?, ?, ?, ?, ?)
            `).bind(exId, id, ex.name || ('ตัวอย่าง ' + (i + 1)), ex.dataUrl || ex.url, ex.type || 'image/png').run();
          }
        }

        return jsonResponse({ success: true, id, message: 'สร้างใบงานสำเร็จ' }, 201);
      }
    }

    // -------------------------------------------------------------
    // Route: /api/submissions
    // -------------------------------------------------------------
    if (path[0] === 'submissions') {
      // PUT /api/submissions/:id/grade — Grade Submission
      if (path.length >= 3 && path[2] === 'grade' && method === 'PUT') {
        const subId = path[1];
        const body = await request.json().catch(() => ({}));
        const score = body.score !== undefined ? Number(body.score) : null;
        const comment = body.comment || '';
        const status = body.status || (score !== null ? 'graded' : 'pending');
        const gradedAt = new Date().toISOString();

        await db.prepare(`
          UPDATE submissions
          SET score = ?, comment = ?, status = ?, graded_at = ?
          WHERE id = ?
        `).bind(score, comment, status, gradedAt, subId).run();

        return jsonResponse({ success: true, message: 'บันทึกคะแนนสำเร็จ' });
      }

      // POST /api/submissions — Submit work
      if (path.length === 1 && method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.assignmentId || !body.studentName) {
          return errorResponse('กรุณาระบุรหัสใบงานและชื่อนักเรียน');
        }

        const file = body.file || null;
        const subId = body.id || ('sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
        const now = new Date().toISOString();
        const studentId = body.studentId || '';

        const existing = await db.prepare(
          'SELECT id FROM submissions WHERE assignment_id = ? AND (student_name = ? OR (student_id != "" AND student_id = ?))'
        ).bind(body.assignmentId, body.studentName, studentId).first().catch(() => null);

        if (existing) {
          await db.prepare(`
            UPDATE submissions
            SET student_name = ?, student_id = ?, text = ?, file_name = ?, file_url = ?, file_type = ?, link = ?, submitted_at = ?, status = 'pending', score = NULL, comment = ''
            WHERE id = ?
          `).bind(
            body.studentName,
            studentId,
            body.text || '',
            file?.name || null,
            file?.dataUrl || null,
            file?.type || null,
            body.link || '',
            now,
            existing.id
          ).run();

          return jsonResponse({ success: true, id: existing.id, message: 'แก้ไขและส่งงานใหม่สำเร็จ' });
        } else {
          await db.prepare(`
            INSERT INTO submissions (id, assignment_id, student_name, student_id, text, file_name, file_url, file_type, link, submitted_at, score, comment, status, graded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, '', 'pending', NULL)
          `).bind(
            subId,
            body.assignmentId,
            body.studentName,
            studentId,
            body.text || '',
            file?.name || null,
            file?.dataUrl || null,
            file?.type || null,
            body.link || '',
            now
          ).run();

          return jsonResponse({ success: true, id: subId, message: 'ส่งงานสำเร็จ' }, 201);
        }
      }
    }

    return errorResponse('Route not found', 404);
  } catch (err) {
    return errorResponse('Internal Server Error: ' + err.message, 500);
  }
}