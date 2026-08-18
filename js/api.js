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
    // Local fallback search
    const students = JSON.parse(localStorage.getItem('cwh_students_v1') || '[]');
    const cleanCode = String(code || '').trim();
    const found = students.find(s => s.studentCode === cleanCode || s.studentId === cleanCode || (s.studentId && s.studentId.endsWith(cleanCode)));
    if (found) {
      return { success: true, valid: true, student: found };
    }
    return { success: false, valid: false, error: 'ไม่พบรหัสนักศึกษาในระบบ' };
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
    // Local fallback
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
  // Full State Sync
  // -------------------------------------------------------------
  async syncAll() {
    if (this.isCloudConnected) {
      const [posts, assignments] = await Promise.all([
        this.getPosts(),
        this.getAssignments()
      ]);
      data.posts = posts;
      data.assignments = assignments;
    }
    render();
  }
};