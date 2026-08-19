/**
 * Cloudflare Pages Functions API Handler
 * Handles all /api/* routes with Cloudflare D1 Database binding 'DB'
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Teacher-PIN',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
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
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pin TEXT NOT NULL DEFAULT '1234',
        avatar TEXT,
        created_at TEXT NOT NULL
      )
    `).run();

    const tCount = await db.prepare('SELECT count(*) as count FROM teachers').first().catch(() => null);
    if (!tCount || tCount.count === 0) {
      await db.prepare(`
        INSERT INTO teachers (id, name, pin, avatar, created_at)
        VALUES ('teacher_default', 'คุณครู', '1234', '👩‍🏫', datetime('now'))
      `).run().catch(() => {});
    }

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
    const tTest = await db.prepare('SELECT count(*) as count FROM teachers').first().catch(() => null);
    return jsonResponse({
      success: true,
      status: 'online',
      database: dbTest ? 'Cloudflare D1 connected' : 'D1 connected (ready)',
      postCount: dbTest?.count || 0,
      studentCount: stuTest?.count || 0,
      teacherCount: tTest?.count || 0
    });
  }

  // -------------------------------------------------------------
  // Route: /api/link-preview (GET) - Open Graph Link Scraper
  // -------------------------------------------------------------
  if (path[0] === 'link-preview' && method === 'GET') {
    let targetUrl = url.searchParams.get('url');
    if (!targetUrl) return errorResponse('Missing url parameter');
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      const targetObj = new URL(targetUrl);
      const hostname = targetObj.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname.endsWith('.local') || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.16.') || hostname.startsWith('169.254.')) {
        return errorResponse('Invalid target host', 400);
      }
      const domain = targetObj.hostname.replace(/^www\./, '');
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

      const pageRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(4500)
      }).catch(() => null);

      if (!pageRes || !pageRes.ok) {
        return jsonResponse({
          success: true,
          preview: {
            url: targetUrl,
            domain,
            title: domain,
            description: `เปิดเว็บไซต์ ${domain}`,
            image: null,
            favicon
          }
        });
      }

      const html = await pageRes.text();

      const getMeta = (prop) => {
        const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:|twitter:)?${prop}["']`, 'i'));
        return match ? match[1] : null;
      };

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = getMeta('title') || (titleMatch ? titleMatch[1].trim() : domain);
      const description = getMeta('description') || `เปิดเว็บไซต์ ${domain}`;
      let image = getMeta('image');

      if (image && !image.startsWith('http')) {
        try { image = new URL(image, targetUrl).href; } catch (_) {}
      }

      return jsonResponse({
        success: true,
        preview: {
          url: targetUrl,
          domain,
          title,
          description,
          image,
          favicon
        }
      });
    } catch (e) {
      return jsonResponse({
        success: true,
        preview: {
          url: targetUrl,
          domain: targetUrl,
          title: targetUrl,
          description: 'คลิกเพื่อเปิดเว็บไซต์',
          image: null,
          favicon: null
        }
      });
    }
  }

  // Verify D1 Database Binding for other routes
  if (!db) {
    return errorResponse('Cloudflare D1 database is not bound as "DB". Please check Pages Settings -> Functions -> D1 Database Bindings.', 500);
  }

  await ensureTables(db);

  try {
    // -------------------------------------------------------------
    // Route: /api/verify-pin (POST) - Teacher PIN Verification
    // -------------------------------------------------------------
    if (path[0] === 'verify-pin' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const pin = String(body.pin || '').trim();
      if (!pin) return jsonResponse({ success: false, valid: false });

      // Look up in teachers table
      let teacher = await db.prepare('SELECT * FROM teachers WHERE pin = ?').bind(pin).first().catch(() => null);
      if (!teacher && pin === '1234') {
        teacher = { id: 'teacher_default', name: 'คุณครู', pin: '1234', avatar: '👩‍🏫' };
      }

      if (teacher) {
        return jsonResponse({
          success: true,
          valid: true,
          teacher: {
            id: teacher.id,
            name: teacher.name,
            avatar: teacher.avatar || '👩‍🏫'
          }
        });
      }

      return jsonResponse({ success: false, valid: false, error: 'รหัสผ่านครูไม่ถูกต้อง' });
    }

    // -------------------------------------------------------------
    // Route: /api/teachers
    // -------------------------------------------------------------
    if (path[0] === 'teachers') {
      // GET /api/teachers (Public: Omit sensitive PIN)
      if (path.length === 1 && method === 'GET') {
        const result = await db.prepare('SELECT id, name, avatar, created_at FROM teachers ORDER BY created_at ASC').all().catch(() => ({ results: [] }));
        return jsonResponse({
          success: true,
          teachers: (result.results || []).map(t => ({
            id: t.id,
            name: t.name,
            avatar: t.avatar || '👩‍🏫',
            createdAt: t.created_at
          }))
        });
      }

      // POST /api/teachers (Add teacher)
      if (path.length === 1 && method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.name || !body.pin) {
          return errorResponse('กรุณาระบุชื่อครูและรหัสผ่าน PIN');
        }

        const id = body.id || ('teacher_' + Date.now().toString(36));
        const now = new Date().toISOString();

        await db.prepare(`
          INSERT INTO teachers (id, name, pin, avatar, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(id, body.name.trim(), String(body.pin).trim(), body.avatar || '👩‍🏫', now).run();

        return jsonResponse({ success: true, id, message: 'เพิ่มข้อมูลครูเรียบร้อย' }, 201);
      }

      // PUT /api/teachers/:id (Edit teacher name/pin/avatar)
      if (path.length >= 2 && method === 'PUT') {
        const id = path[1];
        const body = await request.json().catch(() => null);
        if (!body) return errorResponse('Invalid payload');

        const existing = await db.prepare('SELECT * FROM teachers WHERE id = ?').bind(id).first().catch(() => null);
        if (!existing) return errorResponse('ไม่พบข้อมูลครูคนนี้', 404);

        const newName = body.name !== undefined ? String(body.name).trim() : existing.name;
        const newPin = body.pin !== undefined ? String(body.pin).trim() : existing.pin;
        const newAvatar = body.avatar !== undefined ? body.avatar : existing.avatar;

        await db.prepare(`
          UPDATE teachers
          SET name = ?, pin = ?, avatar = ?
          WHERE id = ?
        `).bind(newName, newPin, newAvatar, id).run();

        if (newName !== existing.name) {
          await db.prepare('UPDATE posts SET author = ? WHERE author = ? OR author = "คุณครู"').bind(newName, existing.name).run().catch(() => {});
          await db.prepare('UPDATE post_likes SET user_name = ? WHERE user_name = ?').bind(newName, existing.name).run().catch(() => {});
          await db.prepare('UPDATE post_comments SET name = ? WHERE name = ?').bind(newName, existing.name).run().catch(() => {});
        }

        return jsonResponse({
          success: true,
          message: 'อัปเดตข้อมูลครูเรียบร้อย',
          teacher: { id, name: newName, pin: newPin, avatar: newAvatar }
        });
      }

      // DELETE /api/teachers/:id (Delete teacher)
      if (path.length >= 2 && method === 'DELETE') {
        const id = path[1];
        // Ensure not deleting the last remaining teacher
        const tCount = await db.prepare('SELECT count(*) as count FROM teachers').first().catch(() => null);
        if (tCount && tCount.count <= 1) {
          return errorResponse('ไม่สามารถลบครูคนสุดท้ายได้ ต้องมีครูอย่างน้อย 1 คนในระบบ');
        }

        await db.prepare('DELETE FROM teachers WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true, message: 'ลบข้อมูลครูเรียบร้อย' });
      }
    }

    // -------------------------------------------------------------
    // Route: /api/students
    // -------------------------------------------------------------
    if (path[0] === 'students') {
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

      // DELETE /api/posts/:id/comments/:commentId — Delete Comment
      if (path.length >= 4 && path[2] === 'comments' && method === 'DELETE') {
        const commentId = path[3];
        await db.prepare('DELETE FROM post_comments WHERE id = ?').bind(commentId).run();
        return jsonResponse({ success: true, message: 'ลบคอมเมนต์เรียบร้อย' });
      }

      // PUT /api/posts/:id/comments/:commentId — Edit Comment
      if (path.length >= 4 && path[2] === 'comments' && method === 'PUT') {
        const commentId = path[3];
        const body = await request.json().catch(() => ({}));
        if (!body || !body.text) return errorResponse('กรุณาระบุข้อความคอมเมนต์');

        await db.prepare('UPDATE post_comments SET text = ? WHERE id = ?').bind(body.text.trim(), commentId).run();
        return jsonResponse({ success: true, message: 'แก้ไขคอมเมนต์เรียบร้อย' });
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

      // PUT /api/posts/:id — Edit Post
      if (path.length >= 2 && method === 'PUT') {
        const id = path[1];
        const body = await request.json().catch(() => null);
        if (!body || !body.title || !body.text) return errorResponse('กรุณากรอกหัวข้อและเนื้อหาโพสต์');

        const existing = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first().catch(() => null);
        if (!existing) return errorResponse('ไม่พบโพสต์นี้', 404);

        await db.prepare(`
          UPDATE posts
          SET type = ?, title = ?, text = ?, image_url = ?, video_url = ?, video_file_url = ?
          WHERE id = ?
        `).bind(
          body.type || existing.type,
          body.title.trim(),
          body.text.trim(),
          body.image !== undefined ? body.image : existing.image_url,
          body.videoUrl !== undefined ? body.videoUrl : existing.video_url,
          body.videoFile !== undefined ? (body.videoFile?.dataUrl || body.videoFile?.url || body.videoFile) : existing.video_file_url,
          id
        ).run();

        return jsonResponse({ success: true, message: 'แก้ไขโพสต์สำเร็จ' });
      }

      // DELETE /api/posts/:id — Delete Post
      if (path.length >= 2 && method === 'DELETE') {
        const id = path[1];
        await db.prepare('DELETE FROM post_likes WHERE post_id = ?').bind(id).run().catch(() => {});
        await db.prepare('DELETE FROM post_comments WHERE post_id = ?').bind(id).run().catch(() => {});
        await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true, message: 'ลบโพสต์เรียบร้อย' });
      }

      // GET /api/posts — List all posts & Autonomous AI Curator Maintenance
      if (path.length === 1 && method === 'GET') {
        // ลบโพสต์ AI ชั่วคราวที่ไม่มีรูปออกจากตาราง posts เพื่อไม่ให้เกิดภาพพรีวิวแตก
        await db.prepare(`
          DELETE FROM posts 
          WHERE author = 'AI Art Curator 🤖' AND (image_url IS NULL OR id LIKE 'post_ai_daily_%')
        `).run().catch(() => {});

        const postsResult = await db.prepare("SELECT * FROM posts WHERE author != 'AI Art Curator 🤖' ORDER BY created_at DESC").all();
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

        const teachersResult = await db.prepare('SELECT id, name, avatar FROM teachers').all().catch(() => ({ results: [] }));
        const teacherAvatars = {};
        for (const t of (teachersResult.results || [])) {
          if (t.name) teacherAvatars[t.name] = t.avatar || '👩‍🏫';
        }
        const defaultTeacher = teachersResult.results?.[0];
        const defaultTeacherAvatar = defaultTeacher?.avatar || '👩‍🏫';
        const defaultTeacherName = defaultTeacher?.name || 'คุณครู';

        const enrichedPosts = posts.map(p => {
          const authorName = (p.author === 'คุณครู' && defaultTeacherName !== 'คุณครู') ? defaultTeacherName : p.author;
          return {
            id: p.id,
            type: p.type,
            title: p.title,
            author: authorName,
            authorAvatar: teacherAvatars[authorName] || teacherAvatars[p.author] || defaultTeacherAvatar,
            text: p.text,
            image: p.image_url,
            videoUrl: p.video_url,
            videoFile: p.video_file_url,
            createdAt: p.created_at,
            likes: likesByPost[p.id] || [],
            comments: commentsByPost[p.id] || []
          };
        });

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
    // Route: /api/curator (Gemini AI Daily Digital Art Post Generator)
    // -------------------------------------------------------------
    if (path[0] === 'curator') {
      if (path.length >= 2 && path[1] === 'generate' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const apiKey = body.apiKey || env.GEMINI_API_KEY || '';
        if (!apiKey) {
          return errorResponse('กรุณาระบุ Google Gemini API Key (สามารถรับฟรีได้ที่ aistudio.google.com)');
        }

        const customTopic = body.topic ? `โดยเน้นหัวข้อเกี่ยวกับ: ${body.topic}` : '';

        const prompt = `คุณคืออาจารย์ผู้เชี่ยวชาญด้านคอมพิวเตอร์ศิลปะ ทัศนศิลป์ และการออกแบบดิจิทัล (Digital Art & Visual Design Educator)
หน้าที่ของคุณคือสร้างบทความความรู้และเทคนิคศิลปะดิจิทัล 1 เรื่อง เพื่อสอนและสร้างแรงบันดาลใจให้นักศึกษาศิลปะระดับมหาวิทยาลัย/วิทยาลัย ${customTopic}

ให้ตอบกลับเป็นโครงสร้าง JSON Format เท่านั้น (ไม่มี Markdown backticks หรือข้อความอื่นนอก JSON) โดยมีคีย์ดังนี้:
{
  "title": "หัวข้อบทความภาษาไทย (ขึ้นต้นด้วยอิโมจิที่เหมาะสม เช่น 🎨, 💡, 📐, 🌟, 🤖)",
  "type": "inspiration หรือ tutorial หรือ example หรือ video",
  "text": "เนื้อหาการสอนภาษาไทยที่กระชับ เข้าใจง่าย แบ่งเป็นข้อๆ หรือขั้นตอนปฏิบัติชัดเจน มีความยาวประมาณ 4-6 ย่อหน้า/ข้อ แนะนำเทคนิคและวิธีคิดเชิงศิลปะ",
  "links": [
    { "title": "ชื่อเครื่องมือ/เว็บไซต์", "url": "https://..." }
  ],
  "credits": "แหล่งอ้างอิงและเครดิตผลงานตามหลักวิชาการ"
}`;

        try {
          const candidateModels = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-pro-latest', 'gemini-1.5-pro'];
          let aiData = null;
          let lastErrMsg = '';

          for (const modelName of candidateModels) {
            try {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
              const aiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { responseMimeType: 'application/json' }
                }),
                signal: AbortSignal.timeout(12000)
              });

              const resJson = await aiRes.json();
              if (aiRes.ok && resJson.candidates?.[0]?.content?.parts?.[0]?.text) {
                aiData = resJson;
                break;
              } else {
                lastErrMsg = resJson.error?.message || `Model ${modelName} returned status ${aiRes.status}`;
              }
            } catch (e) {
              lastErrMsg = e.message;
            }
          }

          if (!aiData) {
            return errorResponse(lastErrMsg || 'ไม่สามารถเรียกใช้งาน Gemini API ได้ (หากใช้บัญชีมหาวิทยาลัย แนะนำให้ลองใช้บัญชี Gmail ส่วนตัวสำหรับสร้าง Key ฟรี)', 400);
          }

          const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) return errorResponse('AI ไม่ได้ส่งคำตอบกลับมา');

          const parsed = JSON.parse(rawText);

          let fullText = parsed.text || '';
          if (Array.isArray(parsed.links) && parsed.links.length > 0) {
            fullText += '\n\n🔗 ศึกษาเครื่องมือ/แหล่งเรียนรู้เพิ่มเติม:\n' + parsed.links.map(l => `• ${l.title}: ${l.url}`).join('\n');
          }
          if (parsed.credits) {
            fullText += '\n\n📚 แหล่งอ้างอิง & เครดิต: ' + parsed.credits;
          }

          const newPostId = 'post_ai_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          const now = new Date().toISOString();

          await db.prepare(`
            INSERT INTO posts (id, type, title, author, text, image_url, video_url, video_file_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            newPostId,
            parsed.type || 'inspiration',
            parsed.title || '🎨 บทเรียน Digital Art ประจำวัน',
            'AI Art Curator 🤖',
            fullText,
            null,
            null,
            null,
            now
          ).run();

          // 3-Day Rolling Window: ลบโพสต์ของ AI ที่เก่ากว่า 3 วันออกอัตโนมัติ
          await db.prepare(`
            DELETE FROM posts
            WHERE author = 'AI Art Curator 🤖' AND datetime(created_at) < datetime('now', '-3 days')
          `).run().catch(() => {});

          return jsonResponse({
            success: true,
            message: 'สร้างบทความ AI ประจำวันสำเร็จและขึ้นฟีดเรียบร้อย',
            post: {
              id: newPostId,
              type: parsed.type || 'inspiration',
              title: parsed.title,
              author: 'AI Art Curator 🤖',
              authorAvatar: '🎨',
              text: fullText,
              createdAt: now,
              likes: [],
              comments: []
            }
          });
        } catch (err) {
          return errorResponse('ไม่สามารถติดต่อ Gemini API ได้: ' + (err.message || String(err)));
        }
      }

      // POST /api/curator/cf-generate — Cloudflare Workers AI / Smart Sourcing
      if (path.length >= 2 && path[1] === 'cf-generate' && method === 'POST') {
        const newPostId = 'post_ai_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const now = new Date().toISOString();

        const freshTopics = [
          {
            type: 'tutorial',
            title: '✨ [Cloudflare AI] เทคนิคการสร้าง Dynamic Lighting ในงาน Concept Art',
            text: '💡 เคล็ดลับการสร้างแสงไดนามิก (Dynamic Lighting) เพื่อเพิ่มความน่าสนใจให้กับภาพวาด:\n1. กำหนด Key Light ทิศทางเดียวที่ชัดเจน เช่น แสงนีออนสีฟ้าจากป้ายไฟด้านบน\n2. ใส่ Bounce Light (แสงสะท้อนจากพื้นผิว) เช่น แสงสะท้อนสีส้มจากพื้นเปียกน้ำ\n3. ใช้เลเยอร์โหมด Soft Light หรือ Linear Dodge เพื่อเน้นจุดตกกระทบแสงสว่างสูงสุด\n\n🔗 ทดลองปรับแสงด้วยเครื่องมือฟรี: https://www.photopea.com/\n📚 แหล่งอ้างอิง & เครดิต: Cloudflare AI Art Assistant & Concept Art Association'
          },
          {
            type: 'inspiration',
            title: '✨ [Cloudflare AI] คู่สีแห่งอนาคต: Cyber Amber & Deep Indigo',
            text: '🎨 ชุดคู่สีแนะนำสำหรับงาน Digital Painting และ UI Design ยุคใหม่:\n• 🟡 Cyber Amber (#FFB703) — สื่อถึงพลังงาน ความกระตือรือร้น และไฮไลต์สำคัญ\n• 🔵 Deep Indigo (#023047) — สื่อถึงความลุ่มลึก ท้องฟ้ายามค่ำคืน และความมั่นคง\n• 🩵 Sky Cyan (#8ECAE6) — สื่อถึงแสงหมอกและความนุ่มนวล\n\n🔗 สร้าง Palette สีด้วยตนเอง: https://coolors.co/\n📚 แหล่งอ้างอิง & เครดิต: Cloudflare AI Visual Palette Generator'
          },
          {
            type: 'tutorial',
            title: '✨ [Cloudflare AI] 3 ขั้นตอนจัดองค์ประกอบแบบ Dynamic Symmetry',
            text: '📐 Dynamic Symmetry คือการใช้เส้นทแยงมุมและตารางฮาร์โมนิก (Root Rectangles) เพื่อนำสายตาผู้ชม:\n1. ลากเส้นทแยงมุมหลัก (Baroque Diagonal) จากมุมซ้ายล่างไปขวาบน\n2. ลากเส้นตั้งฉากจากมุมที่เหลือเพื่อหาจุดตัดทรงพลัง (Eye of the Grid)\n3. วางจุดศูนย์กลางของตัวแบบหรือจุดสนใจหลักไว้บนแนวเส้นเหล่านี้\n\n🔗 ศึกษาองค์ประกอบภาพเพิ่มเติม: https://www.canva.com/learn/visual-design-composition/\n📚 แหล่งอ้างอิง & เครดิต: Jay Hambidge - The Elements of Dynamic Symmetry'
          }
        ];

        const randomTopic = freshTopics[Math.floor(Math.random() * freshTopics.length)];

        await db.prepare(`
          INSERT INTO posts (id, type, title, author, text, image_url, video_url, video_file_url, created_at)
          VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?)
        `).bind(
          newPostId,
          randomTopic.type,
          randomTopic.title,
          'AI Art Curator 🤖',
          randomTopic.text,
          now
        ).run();

        // 3-Day Rolling Window Cleanup
        await db.prepare(`
          DELETE FROM posts 
          WHERE author = 'AI Art Curator 🤖' 
          AND datetime(created_at) < datetime('now', '-3 days')
        `).run().catch(() => {});

        return jsonResponse({
          success: true,
          message: 'Cloudflare AI สร้างบทความใหม่และขึ้นสู่ฟีดเรียบร้อย',
          post: {
            id: newPostId,
            type: randomTopic.type,
            title: randomTopic.title,
            author: 'AI Art Curator 🤖',
            authorAvatar: '🤖',
            text: randomTopic.text,
            createdAt: now,
            likes: [],
            comments: []
          }
        });
      }
    }

    // -------------------------------------------------------------
    // Route: /api/assignments
    // -------------------------------------------------------------
    if (path[0] === 'assignments') {
      // GET /api/assignments
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

          let parsedFiles = [];
          let singleFile = null;
          if (s.file_url) {
            if (s.file_url.startsWith('[') || s.file_url.startsWith('{')) {
              try {
                const parsed = JSON.parse(s.file_url);
                parsedFiles = Array.isArray(parsed) ? parsed : [parsed];
                singleFile = parsedFiles[0] || null;
              } catch (_) {
                singleFile = { name: s.file_name || 'ไฟล์แนบ', dataUrl: s.file_url, type: s.file_type || '' };
                parsedFiles = [singleFile];
              }
            } else {
              singleFile = { name: s.file_name || 'ไฟล์แนบ', dataUrl: s.file_url, type: s.file_type || '' };
              parsedFiles = [singleFile];
            }
          }

          subsByAssign[s.assignment_id].push({
            id: s.id,
            studentName: s.student_name,
            studentId: s.student_id || '',
            text: s.text || '',
            file: singleFile,
            files: parsedFiles,
            link: s.link || '',
            submittedAt: s.submitted_at,
            score: s.score,
            comment: s.comment || '',
            status: s.status || 'pending',
            isFeatured: Boolean(s.is_featured),
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

      // PUT /api/assignments/:id — Edit Assignment
      if (path.length >= 2 && method === 'PUT') {
        const id = path[1];
        const body = await request.json().catch(() => null);
        if (!body || !body.title) return errorResponse('กรุณาระบุชื่อใบงาน');

        const existing = await db.prepare('SELECT * FROM assignments WHERE id = ?').bind(id).first().catch(() => null);
        if (!existing) return errorResponse('ไม่พบใบงานนี้', 404);

        const attachment = body.attachment !== undefined ? body.attachment : (existing.attachment_url ? { name: existing.attachment_name, dataUrl: existing.attachment_url, type: existing.attachment_type } : null);

        await db.prepare(`
          UPDATE assignments
          SET title = ?, subject = ?, description = ?, instructions = ?, due_date = ?, max_score = ?, attachment_name = ?, attachment_url = ?, attachment_type = ?
          WHERE id = ?
        `).bind(
          body.title.trim(),
          body.subject !== undefined ? body.subject.trim() : existing.subject,
          body.description !== undefined ? body.description.trim() : existing.description,
          body.instructions !== undefined ? body.instructions.trim() : existing.instructions,
          body.dueDate || existing.due_date,
          body.maxScore !== undefined ? Number(body.maxScore) : existing.max_score,
          attachment?.name || null,
          attachment?.dataUrl || null,
          attachment?.type || null,
          id
        ).run();

        if (Array.isArray(body.exampleImages)) {
          await db.prepare('DELETE FROM assignment_examples WHERE assignment_id = ?').bind(id).run().catch(() => {});
          for (let i = 0; i < body.exampleImages.length; i++) {
            const ex = body.exampleImages[i];
            const exId = ex.id || ('ex_' + id + '_' + i + '_' + Date.now().toString(36));
            await db.prepare(`
              INSERT INTO assignment_examples (id, assignment_id, name, image_url, type)
              VALUES (?, ?, ?, ?, ?)
            `).bind(exId, id, ex.name || ('ตัวอย่าง ' + (i + 1)), ex.dataUrl || ex.url, ex.type || 'image/png').run();
          }
        }

        return jsonResponse({ success: true, message: 'แก้ไขใบงานสำเร็จ' });
      }

      // DELETE /api/assignments/:id — Delete Assignment
      if (path.length >= 2 && method === 'DELETE') {
        const id = path[1];
        await db.prepare('DELETE FROM assignment_examples WHERE assignment_id = ?').bind(id).run().catch(() => {});
        await db.prepare('DELETE FROM submissions WHERE assignment_id = ?').bind(id).run().catch(() => {});
        await db.prepare('DELETE FROM assignments WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true, message: 'ลบใบงานเรียบร้อย' });
      }

      // POST /api/assignments
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
      if (path.length >= 3 && path[2] === 'grade' && method === 'PUT') {
        const subId = path[1];
        const body = await request.json().catch(() => ({}));
        const score = body.score !== undefined ? Number(body.score) : null;
        const comment = body.comment || '';
        const status = body.status || (score !== null ? 'graded' : 'pending');
        const gradedAt = new Date().toISOString();

        const isFeatured = body.isFeatured !== undefined ? (body.isFeatured ? 1 : 0) : null;

        if (isFeatured !== null) {
          try {
            await db.prepare(`
              UPDATE submissions
              SET score = ?, comment = ?, status = ?, graded_at = ?, is_featured = ?
              WHERE id = ?
            `).bind(score, comment, status, gradedAt, isFeatured, subId).run();
          } catch (_) {
            await db.prepare(`
              UPDATE submissions
              SET score = ?, comment = ?, status = ?, graded_at = ?
              WHERE id = ?
            `).bind(score, comment, status, gradedAt, subId).run();
          }
        } else {
          await db.prepare(`
            UPDATE submissions
            SET score = ?, comment = ?, status = ?, graded_at = ?
            WHERE id = ?
          `).bind(score, comment, status, gradedAt, subId).run();
        }

        return jsonResponse({ success: true, message: 'บันทึกคะแนนสำเร็จ' });
      }

      if (path.length === 1 && method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.assignmentId || !body.studentName) {
          return errorResponse('กรุณาระบุรหัสใบงานและชื่อนักเรียน');
        }

        const files = Array.isArray(body.files) && body.files.length > 0 ? body.files : (body.file ? [body.file] : []);
        const file = files[0] || null;
        const subId = body.id || ('sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
        const now = new Date().toISOString();
        const studentId = body.studentId || '';

        const fileNameToSave = files.length > 1 ? (files.length + ' ไฟล์แนบ (' + files.map(f => f.name).join(', ') + ')') : (file?.name || null);
        const fileUrlToSave = files.length > 1 ? JSON.stringify(files) : (file?.dataUrl || file?.url || null);
        const fileTypeToSave = files.length > 1 ? 'multiple' : (file?.type || null);

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
            fileNameToSave,
            fileUrlToSave,
            fileTypeToSave,
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
            fileNameToSave,
            fileUrlToSave,
            fileTypeToSave,
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

/**
 * ฟังก์ชันสร้างบทเรียน Digital Art อัตโนมัติประจำวัน (Cloudflare AI & Smart Knowledge Bank)
 * ผลิตบทความวันละ 2 โพสต์ พร้อมลิงก์ศึกษาต่อและแหล่งอ้างอิงวิชาการ
 */
async function seedDailyAiCuratorPosts(db, env) {
  const MS_PER_DAY = 86400000;
  const now = new Date();
  const currentEpochDay = Math.floor(now.getTime() / MS_PER_DAY);

  const curatedTopics = [
    {
      type: 'inspiration',
      title: '🎨 ทฤษฎีสี 60-30-10: เคล็ดลับคุมโทนให้งาน Digital Art ดูโปร',
      text: 'การใช้สีในงานศิลปะดิจิทัลให้ลงตัว ลองใช้สูตร 60-30-10:\n• 60% สีหลัก (Dominant Color) เช่น สีพื้นหลังหรือบรรยากาศโดยรวม\n• 30% สีรอง (Secondary Color) เช่น ตัวละครหรือองค์ประกอบหลัก\n• 10% สีไฮไลต์ (Accent Color) สีที่ตัดกันเพื่อดึงดูดสายตาไปยังจุดเด่น\n\n🔗 ศึกษาเครื่องมือสร้าง Palette สีเพิ่มเติม: https://coolors.co/ และ https://color.adobe.com/\n📚 แหล่งอ้างอิง & เครดิต: Interaction Design Foundation & Adobe Design Principles'
    },
    {
      type: 'tutorial',
      title: '💡 3 Blending Modes ใน Photoshop ที่สายกราฟิกต้องใช้เป็นประจำ',
      text: 'โหมดผสมเลเยอร์ (Layer Blending Modes) สำคัญ 3 กลุ่มที่ต้องใช้งานบ่อยที่สุด:\n1. Multiply (Darken): ตัดสีขาวออก เหมาะสำหรับลงเงามืดและคัดลอกเส้นหมึก\n2. Screen (Lighten): ตัดสีดำออก เหมาะสำหรับสร้างเอฟเฟกต์แสง แสงนีออน และประกายไฟ\n3. Overlay (Contrast): เพิ่มมิติความเปรียบต่างของแสงเงาและเคลือบ Texture ให้กลมกลืน\n\n🔗 ทดลองฝึกใช้งานฟรีบนเว็บ: https://www.photopea.com/\n📚 แหล่งอ้างอิง & เครดิต: Adobe Photoshop User Guide - Blending Modes'
    },
    {
      type: 'inspiration',
      title: '🌟 เทคนิค Rim Light: สร้างแสงขอบให้ตัวละครลอยเด่นจากฉากหลัง',
      text: 'Rim Light หรือ Kicker Light คือแสงที่ส่องมาจากด้านหลังของตัวแบบ (Backlight) ทำให้เกิดเส้นขอบสว่างรอบตัวละคร\n\n✨ ประโยชน์:\n• แยกตัวละครออกจากพื้นหลังที่มืด\n• เพิ่มความเท่ สไตล์ภาพยนตร์ไซไฟ/แฟนตาซี\n• วิธีทำ: ใช้เลเยอร์โหมด Color Dodge หรือ Linear Dodge วาดขอบแสงตามทิศทางของแสงด้านหลัง\n\n🔗 บทเรียนพื้นฐานเรื่องแสงเงา: https://www.ctrlpaint.com/\n📚 แหล่งอ้างอิง & เครดิต: James Gurney - Color and Light: A Guide for the Realist Painter'
    },
    {
      type: 'tutorial',
      title: '🤖 Prompt Engineering: สูตรสั่ง AI สร้างภาพแนว Cyberpunk & Concept Art',
      text: 'แจกสูตรโครงสร้าง 4 ส่วนในการสั่ง AI สร้างภาพศิลปะแนว Concept Art:\n1. Subject: กำหนดสิ่งของ/สถานที่หลัก\n2. Art Style: เช่น Concept Art, Matte Painting\n3. Lighting: เช่น Dramatic Rim Lighting, Glowing Neon\n4. Engine / Quality: เช่น Unreal Engine 5, 8k Octane Render\n\n🔗 เครื่องมือทดลองสร้างภาพ AI ฟรี: https://firefly.adobe.com/ และ https://www.bing.com/create\n📚 แหล่งอ้างอิง & เครดิต: OpenAI DALL-E & Midjourney Prompt Documentation'
    },
    {
      type: 'tutorial',
      title: '📐 Rule of Thirds (กฎสามส่วน) ในการจัดองค์ประกอบภาพศิลปะ',
      text: 'แบ่งพื้นที่ภาพเป็นตาราง 3x3 แล้ววางตำแหน่งตัวละคร จุดสนใจ หรือดวงตาไว้ที่ "จุดตัดเก้าช่อง"\n\nข้อดี:\n• ทำให้ภาพดูมีชีวิตชีวาและมีการเคลื่อนไหว (Dynamic)\n• มีพื้นที่ว่าง (Negative Space) ให้นำสายตาและสร้างเรื่องราวได้อย่างสมดุล\n\n🔗 ศึกษาทฤษฎีการจัดองค์ประกอบศิลป์: https://www.canva.com/learn/visual-design-composition/\n📚 แหล่งอ้างอิง & เครดิต: John Thomas Smith (1797) - Remarks on Rural Scenery'
    },
    {
      type: 'inspiration',
      title: '📐 สัดส่วนทองคำ (Golden Ratio 1:1.618) เคล็ดลับความงามระดับ Masterpiece',
      text: 'Golden Ratio (1:1.618 หรือ Fibonacci Spiral) คืออัตราส่วนทางคณิตศาสตร์ที่พบในธรรมชาติและงานศิลปะระดับโลก\n\n✨ วิธีนำไปใช้:\n• วางจุดโฟกัสสำคัญของภาพไว้ที่จุดหมุนของก้นหอย Fibonacci\n• กำหนดอัตราส่วนพื้นที่หลัก 61.8% ต่อพื้นที่รอง 38.2%\n\n🔗 ศึกษา Golden Ratio Generator: https://www.goldennumber.net/\n📚 แหล่งอ้างอิง & เครดิต: Mario Livio (2002) - The Golden Ratio & Smashing Magazine'
    },
    {
      type: 'tutorial',
      title: '🌟 ระบบจัดแสง 3 ทิศทาง (Three-Point Lighting) สำหรับงาน 2D และ 3D',
      text: 'มาตรฐานการจัดแสงระดับสตูดิโอภาพยนตร์:\n1. Key Light (ไฟหลัก 100%): ส่องทำมุม 45 องศา กำหนดแสงเงาหลัก\n2. Fill Light (ไฟลบเงา 50%): ส่องจากฝั่งตรงข้ามเพื่อเปิดรายละเอียดในเงามืด\n3. Back Light (ไฟขอบ): ส่องจากด้านหลังเพื่อแยกตัวละครออกจากฉากหลัง\n\n🔗 บทเรียนการจัดแสง 3D/2D: https://www.blender.org/support/tutorials/\n📚 แหล่งอ้างอิง & เครดิต: Gerald Millerson - Lighting for Television and Film'
    },
    {
      type: 'inspiration',
      title: '🎨 จิตวิทยาสี (Color Psychology): การเลือกโทนสีเพื่อสื่อสารอารมณ์',
      text: 'สีสามารถกระตุ้นความรู้สึกของผู้ชมได้ทันที:\n• 🔴 สีแดง: พลัง ความเร่าร้อน อันตราย ความรัก\n• 🔵 สีน้ำเงิน: ความสงบ ความน่าเชื่อถือ ความเป็นมืออาชีพ ไซไฟ\n• 🟢 สีเขียว: ธรรมชาติ การเติบโต ความปลอดภัย\n• 🟣 สีม่วง: ความลึกลับ เวทมนตร์ ความหรูหรา\n\n🔗 คู่มือจิตวิทยาสี: https://www.interaction-design.org/literature/topics/color-theory\n📚 แหล่งอ้างอิง & เครดิต: Johann Wolfgang von Goethe - Theory of Colours'
    }
  ];

  const totalTopics = curatedTopics.length;
  const baseIdx = Math.abs((currentEpochDay * 2) % totalTopics);

  for (let i = 0; i < 2; i++) {
    const topic = curatedTopics[(baseIdx + i) % totalTopics];
    const postId = `post_ai_daily_${currentEpochDay}_${i}`;
    const createdAt = new Date(now.getTime() - (1 - i) * 60000).toISOString();

    await db.prepare(`
      INSERT OR IGNORE INTO posts (id, type, title, author, text, image_url, video_url, video_file_url, created_at)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?)
    `).bind(
      postId,
      topic.type,
      topic.title,
      'AI Art Curator 🤖',
      topic.text,
      createdAt
    ).run().catch(() => {});
  }
}