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
    // Local fallback
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
    // Local fallback
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
    // Local fallback
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
    // Local fallback
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
    // Local fallback
    const a = data.assignments.find(x => x.id === subData.assignmentId);
    if (!a) return false;
    if (!Array.isArray(a.submissions)) a.submissions = [];
    const idx = a.submissions.findIndex(s => s.studentName === subData.studentName);
    if (idx >= 0) {
      a.submissions[idx] = {
        ...a.submissions[idx],
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
    // Local fallback
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