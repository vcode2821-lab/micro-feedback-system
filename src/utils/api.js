// ECE FEEDBACK SYSTEM — API LAYER (FIXED)

const API = {

  // Core request - uses GET with params to avoid CORS issues
  async post(action, payload = {}) {
    // Convert to URL params for GET request (avoids CORS preflight)
    const params = new URLSearchParams();
    params.append('action', action);
    params.append('data', JSON.stringify(payload));
    
    const res = await fetch(CONFIG.APPS_SCRIPT_URL + '?' + params.toString(), {
      method: 'GET',
      redirect: 'follow'
    });
    if (!res.ok) throw new Error('Network error: ' + res.status);
    return res.json();
  },

  async get(params = {}) {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { redirect: 'follow' });
    if (!res.ok) throw new Error('Network error: ' + res.status);
    return res.json();
  },

  async getSettings() { return this.get({ action: 'getSettings' }); },
  async updateSettings(settings, adminKey) { return this.post('updateSettings', { settings, adminKey }); },
  async login(role, password, studentId) { return this.post('login', { role, password, studentId }); },
  async getStudentsFull(adminKey) { return this.post('getStudentsFull', { adminKey }); },
  async selectStudents(adminKey, count) { return this.post('selectStudents', { adminKey, count }); },
  async resetBatch(adminKey) { return this.post('resetBatch', { adminKey }); },
  async saveStudent(adminKey, student) { return this.post('saveStudent', { adminKey, student }); },
  async deleteStudent(adminKey, studentId) { return this.post('deleteStudent', { adminKey, studentId }); },
  async importStudents(adminKey, students) { return this.post('importStudents', { adminKey, students }); },
  async submitFeedback(studentToken, answers) { return this.post('submitFeedback', { studentToken, answers }); },
  async getFeedbackResults(teacherKey) { return this.post('getFeedbackResults', { teacherKey }); },
  async getFeedbackFull(adminKey) { return this.post('getFeedbackFull', { adminKey }); },
  async updateQuestions(adminKey, questions) { return this.post('updateQuestions', { adminKey, questions }); },
  async updatePasswords(adminKey, passwords) { return this.post('updatePasswords', { adminKey, passwords }); }
};

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

const Session = {
  set(key, val) { sessionStorage.setItem(key, val); },
  get(key) { return sessionStorage.getItem(key); },
  clear(key) { sessionStorage.removeItem(key); },
  clearAll() { sessionStorage.clear(); },
  isAuth(key) { return !!sessionStorage.getItem(key); }
};
