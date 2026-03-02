// ═══════════════════════════════════════════
//   ECE FEEDBACK SYSTEM — CONFIGURATION
//   IMPORTANT: Replace APPS_SCRIPT_URL with your
//   deployed Google Apps Script Web App URL
// ═══════════════════════════════════════════

const CONFIG = {
  // 🔴 REPLACE THIS with your Google Apps Script Web App URL
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzRHtY8ZsnXLgs9gsfbZPUNs3iYQ2mS9auunEURYvubmMjFMOZQZxaTYo0r8aR0pY_wng/exec',

  // Default passwords (Admin MUST change via Admin Panel)
  PASSWORDS: {
    admin: 'ece-admin-2024',
    teacher: 'ece-teacher-2024',
    student: 'ece-student-2024'
  },

  // Session keys
  SESSION: {
    ADMIN: 'ece_admin_session',
    TEACHER: 'ece_teacher_session',
    STUDENT: 'ece_student_session',
    STUDENT_ID: 'ece_student_id'
  },

  ROLES: {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student'
  }
};

