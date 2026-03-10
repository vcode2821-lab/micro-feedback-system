// ═══════════════════════════════════════════════════════
//   ECE FEEDBACK SYSTEM — API LAYER
//   Uses /api/proxy (Vercel serverless) — NO CORS issues!
// ═══════════════════════════════════════════════════════

const API = {

  // All requests go through /api/proxy on Vercel
  PROXY: '/api/proxy',

  // POST request via proxy
  async post(action, payload = {}) {
    const res = await fetch(this.PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload })
    });
    if (!res.ok) throw new Error('Request failed: ' + res.status);
    return res.json();
  },

  // GET request via proxy
  async get(params = {}) {
    const url = new URL(this.PROXY, window.location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Request failed: ' + res.status);
    return res.json();
  },

  // ── SETTINGS ──────────────────────────────────────────
  async getSettings()                        { return this.get({ action: 'getSettings' }); },
  async updateSettings(settings, adminKey)   { return this.post('updateSettings', { settings, adminKey }); },

  // ── AUTH ──────────────────────────────────────────────
  async login(role, password, studentId)     { return this.post('login', { role, password, studentId }); },

  // ── STUDENTS ──────────────────────────────────────────
  async getStudentsFull(adminKey)            { return this.post('getStudentsFull', { adminKey }); },
  async selectStudents(adminKey, count)      { return this.post('selectStudents', { adminKey, count }); },
  async resetBatch(adminKey)                 { return this.post('resetBatch', { adminKey }); },
  async saveStudent(adminKey, student)       { return this.post('saveStudent', { adminKey, student }); },
  async deleteStudent(adminKey, studentId)   { return this.post('deleteStudent', { adminKey, studentId }); },
  async importStudents(adminKey, students)   { return this.post('importStudents', { adminKey, students }); },

  // ── FEEDBACK ──────────────────────────────────────────
  async submitFeedback(studentToken, answers){ return this.post('submitFeedback', { studentToken, answers }); },
  async getFeedbackResults(teacherKey)       { return this.post('getFeedbackResults', { teacherKey }); },
  async getFeedbackFull(adminKey)            { return this.post('getFeedbackFull', { adminKey }); },

  // ── QUESTIONS ─────────────────────────────────────────
  async updateQuestions(adminKey, questions) { return this.post('updateQuestions', { adminKey, questions }); },

  // ── PASSWORDS ─────────────────────────────────────────
  async updatePasswords(adminKey, passwords) { return this.post('updatePasswords', { adminKey, passwords }); }
};

// ── TOAST NOTIFICATIONS ───────────────────────────────
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

// ── SESSION HELPERS ───────────────────────────────────
const Session = {
  set(key, val)  { sessionStorage.setItem(key, val); },
  get(key)       { return sessionStorage.getItem(key); },
  clear(key)     { sessionStorage.removeItem(key); },
  clearAll()     { sessionStorage.clear(); },
  isAuth(key)    { return !!sessionStorage.getItem(key); }
};



