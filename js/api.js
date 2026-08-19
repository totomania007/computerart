/* ============================================================
   Classwork Hub — api.js
   จัดการข้อมูลแบบ Dual-mode (Cloudflare D1 API + LocalStorage Fallback)
   ============================================================ */
'use strict';

const API = {
  isCloudConnected: false,

  async init() {
    const url = APP_CONFIG.getApiUrl();
    if (!url) {
      this.isCloudConnected = false;
      return false;
    }
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const json = await res.json();
        this.isCloudConnected = !!json.success;
        return this.isCloudConnected;
      }
    } catch (_) {
      this.isCloudConnected = false;
    }
    return false;
  },

  // -------------------------------------------------------------
  // Teachers Management & Verification
  // -------------------------------------------------------------
  async verifyTeacherPin(pin) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/verify-pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const json = await res.json();
        if (json.valid) return json;
      } catch (e) {
        console.warn('Verify teacher fallback to local:', e);
      }
    }
    const localTeachers = JSON.parse(localStorage.getItem('cwh_teachers_v1') || '[]');
    const match = localTeachers.find(t => t.pin === pin);
    if (match) {
      return { success: true, valid: true, teacher: match };
    }
    if (pin === APP_CONFIG.teacherPin || pin === '1234') {
      return { success: true, valid: true, teacher: { id: 'teacher_default', name: 'คุณครู', pin: '1234', avatar: '👩‍🏫' } };
    }
    return { success: false, valid: false, error: 'รหัสผ่านครูไม่ถูกต้อง' };
  },

  async getTeachers() {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/teachers`);
        const json = await res.json();
        if (json.success && Array.isArray(json.teachers)) {
          return json.teachers;
        }
      } catch (e) {
        console.warn('Fallback to local teachers:', e);
      }
    }
    const local = JSON.parse(localStorage.getItem('cwh_teachers_v1') || '[]');
    if (!local.length) {
      const def = [{ id: 'teacher_default', name: 'คุณครู', pin: '1234', avatar: '👩‍🏫', createdAt: new Date().toISOString() }];
      localStorage.setItem('cwh_teachers_v1', JSON.stringify(def));
      return def;
    }
    return local;
  },

  async addTeacher(teacherData) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/teachers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teacherData)
        });
        const json = await res.json();
        if (json.success) return true;
      } catch (e) {
        console.warn('Add teacher fallback to local:', e);
      }
    }
    const teachers = await this.getTeachers();
    teachers.push({
      id: teacherData.id || uid(),
      name: teacherData.name,
      pin: teacherData.pin,
      avatar: teacherData.avatar || '👩‍🏫',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('cwh_teachers_v1', JSON.stringify(teachers));
    return true;
  },

  async updateTeacher(id, teacherData) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/teachers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teacherData)
        });
        const json = await res.json();
        if (json.success) return true;
      } catch (e) {
        console.warn('Update teacher fallback to local:', e);
      }
    }
    const teachers = await this.getTeachers();
    const idx = teachers.findIndex(t => t.id === id);
    if (idx >= 0) {
      teachers[idx] = { ...teachers[idx], ...teacherData };
      localStorage.setItem('cwh_teachers_v1', JSON.stringify(teachers));
      return true;
    }
    return false;
  },

  async deleteTeacher(id) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/teachers/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) return true;
        if (json.error) {
          toast(`⚠️ ${json.error}`);
          return false;
        }
      } catch (e) {
        console.warn('Delete teacher fallback to local:', e);
      }
    }
    const teachers = await this.getTeachers();
    if (teachers.length <= 1) {
      toast('⚠️ ต้องมีครูอย่างน้อย 1 คนในระบบ');
      return false;
    }
    const filtered = teachers.filter(t => t.id !== id);
    localStorage.setItem('cwh_teachers_v1', JSON.stringify(filtered));
    return true;
  },

  // -------------------------------------------------------------
  // Students Management & Verification
  // -------------------------------------------------------------
  async verifyStudent(code) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/students/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const json = await res.json();
        return json;
      } catch (e) {
        console.warn('Verify fallback to local:', e);
      }
    }
    const students = JSON.parse(localStorage.getItem('cwh_students_v1') || '[]');
    const cleanCode = String(code || '').trim().replace(/\D/g, '');
    const found = students.find(s => {
      const sId = String(s.studentId || '').replace(/\D/g, '');
      const sCode = String(s.studentCode || '').replace(/\D/g, '');
      const gen8 = sId.length >= 8 ? (sId.slice(0, 4) + sId.slice(-4)) : sId;
      return sCode === cleanCode || sId === cleanCode || gen8 === cleanCode;
    });
    if (found) {
      return { success: true, valid: true, student: found };
    }
    return { success: false, valid: false, error: 'ไม่พบรหัสนักศึกษาในระบบ (กรุณาตรวจสอบรหัส 8 ตัว)' };
  },

  async getStudents() {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/students`);
        const json = await res.json();
        if (json.success && Array.isArray(json.students)) {
          return json.students;
        }
      } catch (e) {
        console.warn('Fallback to local students:', e);
      }
    }
    return JSON.parse(localStorage.getItem('cwh_students_v1') || '[]');
  },

  async saveStudents(studentsList) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: studentsList })
        });
        const json = await res.json();
        if (json.success) return true;
      } catch (e) {
        console.warn('Save students fallback to local:', e);
      }
    }
    localStorage.setItem('cwh_students_v1', JSON.stringify(studentsList));
    return true;
  },

  async deleteStudent(studentId) {
    if (this.isCloudConnected) {
      try {
        await fetch(`${APP_CONFIG.getApiUrl()}/students/${studentId}`, { method: 'DELETE' });
        return true;
      } catch (e) {
        console.warn('Delete student fallback to local:', e);
      }
    }
    const students = JSON.parse(localStorage.getItem('cwh_students_v1') || '[]');
    const filtered = students.filter(s => s.studentId !== studentId);
    localStorage.setItem('cwh_students_v1', JSON.stringify(filtered));
    return true;
  },

  // -------------------------------------------------------------
  // Posts & Feed
  // -------------------------------------------------------------
  async getPosts() {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/posts`);
        const json = await res.json();
        if (json.success && Array.isArray(json.posts)) {
          return json.posts;
        }
      } catch (e) {
        console.warn('Fallback to local posts:', e);
      }
    }
    return data.posts || [];
  },

  async createPost(postData) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        toast('⚠️ ไม่สามารถบันทึกไปยัง Cloud ได้ บันทึกลงเครื่องแทน');
      }
    }
    data.posts.unshift(postData);
    save();
    return true;
  },

  async generateCuratorPost(apiKey, topic) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/curator/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, topic })
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
        }
        return json;
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'กรุณาเชื่อมต่อ Cloudflare D1 ก่อน' };
  },

  async updatePost(postId, postData) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        console.warn('Update post fallback to local:', e);
      }
    }
    const idx = data.posts.findIndex(p => p.id === postId);
    if (idx >= 0) {
      data.posts[idx] = { ...data.posts[idx], ...postData };
      save();
      await this.syncAll();
      return true;
    }
    return false;
  },

  async deletePost(postId) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/posts/${postId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        console.warn('Delete post fallback to local:', e);
      }
    }
    data.posts = data.posts.filter(p => p.id !== postId);
    save();
    await this.syncAll();
    return true;
  },

  async toggleLike(postId, userName) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/posts/${postId}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: userName })
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return json.liked;
        }
      } catch (e) {
        console.warn('Like fallback to local:', e);
      }
    }
    const p = data.posts.find(x => x.id === postId);
    if (!p) return false;
    if (!Array.isArray(p.likes)) p.likes = [];
    const idx = p.likes.indexOf(userName);
    if (idx >= 0) {
      p.likes.splice(idx, 1);
      save();
      return false;
    } else {
      p.likes.push(userName);
      save();
      return true;
    }
  },

  async addComment(postId, commentObj) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/posts/${postId}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commentObj)
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        console.warn('Comment fallback to local:', e);
      }
    }
    const p = data.posts.find(x => x.id === postId);
    if (!p) return false;
    if (!Array.isArray(p.comments)) p.comments = [];
    p.comments.push(commentObj);
    save();
    return true;
  },

  async updateComment(postId, commentId, text) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/posts/${postId}/comments/${commentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        console.warn('Update comment fallback to local:', e);
      }
    }
    const p = data.posts.find(x => x.id === postId);
    if (p && Array.isArray(p.comments)) {
      const c = p.comments.find(x => x.id === commentId);
      if (c) {
        c.text = text;
        save();
        render();
        return true;
      }
    }
    return false;
  },

  async deleteComment(postId, commentId) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/posts/${postId}/comments/${commentId}`, {
          method: 'DELETE'
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        console.warn('Delete comment fallback to local:', e);
      }
    }
    const p = data.posts.find(x => x.id === postId);
    if (p && Array.isArray(p.comments)) {
      p.comments = p.comments.filter(c => c.id !== commentId);
      save();
      render();
      return true;
    }
    return false;
  },

  // -------------------------------------------------------------
  // Assignments
  // -------------------------------------------------------------
  async getAssignments() {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/assignments`);
        const json = await res.json();
        if (json.success && Array.isArray(json.assignments)) {
          return json.assignments;
        }
      } catch (e) {
        console.warn('Fallback to local assignments:', e);
      }
    }
    return data.assignments || [];
  },

  async createAssignment(assignData) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignData)
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        toast('⚠️ ไม่สามารถบันทึกไปยัง Cloud ได้ บันทึกลงเครื่องแทน');
      }
    }
    data.assignments.unshift(assignData);
    save();
    return true;
  },

  async updateAssignment(id, assignData) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/assignments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignData)
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        console.warn('Update assignment fallback to local:', e);
      }
    }
    const idx = data.assignments.findIndex(a => a.id === id);
    if (idx >= 0) {
      data.assignments[idx] = { ...data.assignments[idx], ...assignData };
      save();
      await this.syncAll();
      return true;
    }
    return false;
  },

  async deleteAssignment(id) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/assignments/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        console.warn('Delete assignment fallback to local:', e);
      }
    }
    data.assignments = data.assignments.filter(a => a.id !== id);
    save();
    await this.syncAll();
    return true;
  },

  // -------------------------------------------------------------
  // Submissions & Grading
  // -------------------------------------------------------------
  async submitWork(subData) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subData)
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        toast('⚠️ ไม่สามารถส่งไปยัง Cloud ได้ บันทึกลงเครื่องแทน');
      }
    }
    const a = data.assignments.find(x => x.id === subData.assignmentId);
    if (!a) return false;
    if (!Array.isArray(a.submissions)) a.submissions = [];
    const idx = a.submissions.findIndex(s => s.studentName === subData.studentName || (subData.studentId && s.studentId === subData.studentId));
    if (idx >= 0) {
      a.submissions[idx] = {
        ...a.submissions[idx],
        studentName: subData.studentName,
        studentId: subData.studentId,
        text: subData.text,
        file: subData.file,
        link: subData.link,
        submittedAt: new Date().toISOString(),
        score: null,
        comment: '',
        status: 'pending'
      };
    } else {
      a.submissions.push({
        id: subData.id || uid(),
        studentName: subData.studentName,
        studentId: subData.studentId || '',
        text: subData.text,
        file: subData.file,
        link: subData.link,
        submittedAt: new Date().toISOString(),
        score: null,
        comment: '',
        status: 'pending',
        gradedAt: null
      });
    }
    save();
    return true;
  },

  async gradeSubmission(subId, gradeData) {
    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/submissions/${subId}/grade`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gradeData)
        });
        const json = await res.json();
        if (json.success) {
          await this.syncAll();
          return true;
        }
      } catch (e) {
        toast('⚠️ ไม่สามารถบันทึกคะแนนไปยัง Cloud ได้');
      }
    }
    for (const a of data.assignments) {
      const s = (a.submissions || []).find(x => x.id === subId);
      if (s) {
        s.score = gradeData.score !== undefined ? Number(gradeData.score) : null;
        s.comment = gradeData.comment || '';
        s.status = gradeData.status || (s.score !== null ? 'graded' : 'pending');
        s.gradedAt = new Date().toISOString();
        save();
        return true;
      }
    }
    return false;
  },

  // -------------------------------------------------------------
  // Link Preview / Open Graph Scraper
  // -------------------------------------------------------------
  async fetchLinkPreview(rawUrl) {
    if (!rawUrl) return null;
    if (window._linkPreviewCache && window._linkPreviewCache[rawUrl]) {
      return window._linkPreviewCache[rawUrl];
    }
    window._linkPreviewCache = window._linkPreviewCache || {};

    if (this.isCloudConnected) {
      try {
        const res = await fetch(`${APP_CONFIG.getApiUrl()}/link-preview?url=${encodeURIComponent(rawUrl)}`);
        const json = await res.json();
        if (json.success && json.preview) {
          window._linkPreviewCache[rawUrl] = json.preview;
          return json.preview;
        }
      } catch (e) {
        console.warn('Link preview fetch failed:', e);
      }
    }

    try {
      let u = rawUrl;
      if (!u.match(/^https?:\/\//i)) u = 'https://' + u;
      const parsed = new URL(u);
      const domain = parsed.hostname.replace(/^www\./, '');
      const fallback = {
        url: u,
        domain,
        title: domain,
        description: `เปิดเว็บไซต์ ${domain}`,
        image: null,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
      };
      window._linkPreviewCache[rawUrl] = fallback;
      return fallback;
    } catch (_) {
      return null;
    }
  },

  // -------------------------------------------------------------
  // Full State Sync
  // -------------------------------------------------------------
  async syncAll() {
    if (this.isCloudConnected) {
      const [posts, assignments, teachers] = await Promise.all([
        this.getPosts(),
        this.getAssignments(),
        this.getTeachers()
      ]);
      data.posts = posts;
      data.assignments = assignments;
      if (Array.isArray(teachers) && teachers.length) {
        data.teachers = teachers;
        teachers.forEach(t => {
          if (t.avatar) {
            localStorage.setItem('cwh_avatar_' + t.name, t.avatar);
            if (t.id === 'teacher_default' || t.name === currentTeacherName() || t.name === 'คุณครู') {
              localStorage.setItem('cwh_teacher_avatar', t.avatar);
            }
          }
        });
      }
    }
    renderHeader();
    render();
  }
};