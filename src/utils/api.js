// ═══════════════════════════════════════════
//   ECE FEEDBACK SYSTEM — API LAYER
//   All communication with Google Apps Script backend
// ═══════════════════════════════════════════

const API = {
  /**
   * Core POST request to Apps Script
   */
async post(action, payload = {}) {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...payload })
  });
    if (!res.ok) throw new Error('Network error: ' + res.status);
    return res.json();
  },

  /**
   * Core GET request to Apps Script
   */
  async get(params = {}) {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Network error: ' + res.status);
    return res.json();
  },

  // ─── SETTINGS ───────────────────────────────────────

  /** Get all settings (form status, limit, deadline, questions) */
  async getSettings() {
    return this.get({ action: 'getSettings' });
  },

  /** Admin: update settings */
  async updateSettings(settings, adminKey) {
    return this.post('updateSettings', { settings, adminKey });
  },

  // ─── AUTHENTICATION ──────────────────────────────────

  /** Verify login password for a role */
  async login(role, password, studentId = null) {
    return this.post('login', { role, password, studentId });
  },

  // ─── STUDENTS ────────────────────────────────────────

  /** Admin: get full student list with identities */
  async getStudentsFull(adminKey) {
    return this.post('getStudentsFull', { adminKey });
  },

  /** Admin: randomly select students for this round */
  async selectStudents(adminKey, count) {
    return this.post('selectStudents', { adminKey, count });
  },

  /** Admin: reset all students for new batch */
  async resetBatch(adminKey) {
    return this.post('resetBatch', { adminKey });
  },

  /** Admin: add/update a student */
  async saveStudent(adminKey, student) {
    return this.post('saveStudent', { adminKey, student });
  },

  /** Admin: delete a student */
  async deleteStudent(adminKey, studentId) {
    return this.post('deleteStudent', { adminKey, studentId });
  },

  /** Admin: bulk import students */
  async importStudents(adminKey, students) {
    return this.post('importStudents', { adminKey, students });
  },

  // ─── FEEDBACK ────────────────────────────────────────

  /** Student: submit feedback (anonymized server-side) */
  async submitFeedback(studentToken, answers) {
    return this.post('submitFeedback', { studentToken, answers });
  },

  /** Teacher: get anonymized feedback results */
  async getFeedbackResults(teacherKey) {
    return this.post('getFeedbackResults', { teacherKey });
  },

  /** Admin: get full feedback with student identity */
  async getFeedbackFull(adminKey) {
    return this.post('getFeedbackFull', { adminKey });
  },

  // ─── QUESTIONS ───────────────────────────────────────

  /** Admin: update questions list */
  async updateQuestions(adminKey, questions) {
    return this.post('updateQuestions', { adminKey, questions });
  },

  // ─── USERS ───────────────────────────────────────────

  /** Admin: update passwords */
  async updatePasswords(adminKey, passwords) {
    return this.post('updatePasswords', { adminKey, passwords });
  }
};

// ─── TOAST NOTIFICATIONS ──────────────────────────────

function showToast(message, type = 'info', duration = 3500) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── SESSION HELPERS ──────────────────────────────────

const Session = {
  set(key, val) { sessionStorage.setItem(key, val); },
  get(key) { return sessionStorage.getItem(key); },
  clear(key) { sessionStorage.removeItem(key); },
  clearAll() { sessionStorage.clear(); },
  isAuth(key) { return !!sessionStorage.getItem(key); }
};
