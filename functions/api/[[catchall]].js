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
    const dbTest = await db.prepare('SELECT count(*) as count FROM posts').first().catch(() => null);
    return jsonResponse({
      success: true,
      status: 'online',
      database: dbTest ? 'Cloudflare D1 connected' : 'D1 connected (ready)',
      postCount: dbTest?.count || 0
    });
  }

  // Verify D1 Database Binding for other routes
  if (!db) {
    return errorResponse('Cloudflare D1 database is not bound as "DB". Please check Pages Settings -> Functions -> D1 Database Bindings.', 500);
  }

  try {
    // -------------------------------------------------------------
    // Route: /api/verify-pin (POST)
    // -------------------------------------------------------------
    if (path[0] === 'verify-pin' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const pin = String(body.pin || '');
      const valid = pin === '1234';
      return jsonResponse({ success: valid, valid });
    }

    // -------------------------------------------------------------
    // Route: /api/posts
    // -------------------------------------------------------------
    if (path[0] === 'posts') {
      // GET /api/posts — List all posts with likes & comments
      if (method === 'GET') {
        const postsResult = await db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
        const posts = postsResult.results || [];

        const likesResult = await db.prepare('SELECT * FROM post_likes').all();
        const commentsResult = await db.prepare('SELECT * FROM post_comments ORDER BY created_at ASC').all();

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
      if (method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.title || !body.text) {
          return errorResponse('กรุณากรอกหัวข้อและเนื้อหาโพสต์');
        }

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

      // POST /api/posts/:id/like — Toggle Like
      if (path.length >= 3 && path[2] === 'like' && method === 'POST') {
        const postId = path[1];
        const body = await request.json().catch(() => ({}));
        const userName = body.name || 'คุณครู';

        const existing = await db.prepare(
          'SELECT 1 FROM post_likes WHERE post_id = ? AND user_name = ?'
        ).bind(postId, userName).first();

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
        if (!body || !body.text || !body.name) {
          return errorResponse('กรุณาระบุชื่อและข้อความคอมเมนต์');
        }

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
    }

    // -------------------------------------------------------------
    // Route: /api/assignments
    // -------------------------------------------------------------
    if (path[0] === 'assignments') {
      // GET /api/assignments — List all assignments with examples & submissions
      if (method === 'GET') {
        const assignResult = await db.prepare('SELECT * FROM assignments ORDER BY created_at DESC').all();
        const assignments = assignResult.results || [];

        const examplesResult = await db.prepare('SELECT * FROM assignment_examples').all();
        const subsResult = await db.prepare('SELECT * FROM submissions ORDER BY submitted_at DESC').all();

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
      if (method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.title) {
          return errorResponse('กรุณาระบุชื่อใบงาน');
        }

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

        // Insert example images
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
      // POST /api/submissions — Submit or Resubmit work
      if (method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.assignmentId || !body.studentName) {
          return errorResponse('กรุณาระบุรหัสใบงานและชื่อนักเรียน');
        }

        const file = body.file || null;
        const subId = body.id || ('sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
        const now = new Date().toISOString();

        // Check if student already submitted for this assignment
        const existing = await db.prepare(
          'SELECT id FROM submissions WHERE assignment_id = ? AND student_name = ?'
        ).bind(body.assignmentId, body.studentName).first();

        if (existing) {
          await db.prepare(`
            UPDATE submissions
            SET text = ?, file_name = ?, file_url = ?, file_type = ?, link = ?, submitted_at = ?, status = 'pending', score = NULL, comment = ''
            WHERE id = ?
          `).bind(
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
            INSERT INTO submissions (id, assignment_id, student_name, text, file_name, file_url, file_type, link, submitted_at, score, comment, status, graded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, '', 'pending', NULL)
          `).bind(
            subId,
            body.assignmentId,
            body.studentName,
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

      // PUT /api/submissions/:id/grade — Grade Submission (Teacher)
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
    }

    return errorResponse('Route not found', 404);
  } catch (err) {
    return errorResponse('Internal Server Error: ' + err.message, 500);
  }
}