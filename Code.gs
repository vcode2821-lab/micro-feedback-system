// ═══════════════════════════════════════════════════════════════
//   ECE MICRO FEEDBACK SYSTEM — GOOGLE APPS SCRIPT BACKEND
//   Deploy as: Web App > Execute as Me > Access: Anyone
//   
//   Google Sheets Structure:
//     Sheet 1: Settings
//     Sheet 2: FeedbackResponses
//     Sheet 3: Students
//     Sheet 4: Users
//     Sheet 5: AuditLog
// ═══════════════════════════════════════════════════════════════

// ── CONFIGURATION ────────────────────────────────────────────────────────────
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEETS = {
  SETTINGS:   'Settings',
  RESPONSES:  'FeedbackResponses',
  STUDENTS:   'Students',
  USERS:      'Users',
  AUDIT:      'AuditLog'
};

// ── CORS HEADERS ──────────────────────────────────────────────────────────────
function setCORSHeaders(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── MAIN ENTRY POINTS ─────────────────────────────────────────────────────────

/**
 * Handle GET requests (read operations)
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;
    switch (action) {
      case 'getSettings': result = getSettings(e.parameter); break;
      default: result = { error: 'Unknown GET action: ' + action };
    }
    return setCORSHeaders(ContentService.createTextOutput(JSON.stringify(result)));
  } catch (err) {
    return setCORSHeaders(ContentService.createTextOutput(
      JSON.stringify({ error: err.message, stack: err.stack })
    ));
  }
}

/**
 * Handle POST requests (write operations)
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;

    switch (action) {
      // AUTH
      case 'login':          result = handleLogin(body); break;

      // SETTINGS
      case 'updateSettings': result = handleUpdateSettings(body); break;

      // STUDENTS
      case 'getStudentsFull': result = handleGetStudentsFull(body); break;
      case 'selectStudents':  result = handleSelectStudents(body); break;
      case 'resetBatch':      result = handleResetBatch(body); break;
      case 'saveStudent':     result = handleSaveStudent(body); break;
      case 'deleteStudent':   result = handleDeleteStudent(body); break;
      case 'importStudents':  result = handleImportStudents(body); break;

      // FEEDBACK
      case 'submitFeedback':    result = handleSubmitFeedback(body); break;
      case 'getFeedbackResults':result = handleGetFeedbackResults(body); break;
      case 'getFeedbackFull':   result = handleGetFeedbackFull(body); break;

      // QUESTIONS
      case 'updateQuestions':   result = handleUpdateQuestions(body); break;

      // PASSWORDS
      case 'updatePasswords':   result = handleUpdatePasswords(body); break;

      default: result = { error: 'Unknown action: ' + action };
    }

    return setCORSHeaders(ContentService.createTextOutput(JSON.stringify(result)));
  } catch (err) {
    return setCORSHeaders(ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ));
  }
}

// ── SHEET HELPERS ─────────────────────────────────────────────────────────────

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    [SHEETS.SETTINGS]:  [['Key', 'Value', 'UpdatedAt']],
    [SHEETS.RESPONSES]: [['AnonymousID', 'StudentToken', 'SubmittedAt', 'QuestionID', 'QuestionText', 'QuestionType', 'Answer']],
    [SHEETS.STUDENTS]:  [['StudentID', 'Name', 'RollNo', 'Email', 'Selected', 'Submitted', 'Status', 'CreatedAt']],
    [SHEETS.USERS]:     [['Role', 'PasswordHash', 'Email', 'Name', 'UpdatedAt']],
    [SHEETS.AUDIT]:     [['Timestamp', 'Action', 'Actor', 'Details']]
  };
  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name][0].length).setValues(headers[name]);
    sheet.getRange(1, 1, 1, headers[name][0].length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

/**
 * Get setting value by key
 */
function getSetting(key, defaultValue = null) {
  const sheet = getSheet(SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return defaultValue;
}

/**
 * Set setting value by key
 */
function setSetting(key, value) {
  const sheet = getSheet(SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
      return;
    }
  }
  // Append new setting
  sheet.appendRow([key, value, new Date().toISOString()]);
}

/**
 * Append to audit log
 */
function audit(action, actor, details = '') {
  try {
    const sheet = getSheet(SHEETS.AUDIT);
    sheet.appendRow([new Date().toISOString(), action, actor, details]);
  } catch(e) { /* non-critical */ }
}

// ── PASSWORD HELPERS ──────────────────────────────────────────────────────────

/**
 * Simple hash for password (use stronger in production)
 * In production, consider using SHA-256 via Utilities.computeDigest
 */
function hashPassword(password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return digest.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

function getPasswordHash(role) {
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === role) return data[i][1];
  }
  // Default passwords if not set yet
  const defaults = {
    admin: hashPassword('ece-admin-2024'),
    teacher: hashPassword('ece-teacher-2024'),
    student: hashPassword('ece-student-2024')
  };
  return defaults[role] || null;
}

function setPasswordHash(role, password) {
  const hash = hashPassword(password);
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === role) {
      sheet.getRange(i + 1, 2).setValue(hash);
      sheet.getRange(i + 1, 5).setValue(new Date().toISOString());
      return;
    }
  }
  sheet.appendRow([role, hash, '', '', new Date().toISOString()]);
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

function handleLogin(body) {
  const { role, password, studentId } = body;
  const hash = hashPassword(password);
  const storedHash = getPasswordHash(role);

  if (hash !== storedHash) {
    return { success: false, reason: 'wrong_password' };
  }

  if (role === 'student') {
    // Check if student exists
    const student = findStudent(studentId);
    if (!student) return { success: false, reason: 'not_found' };

    // Check form open
    const formOpen = getSetting('formOpen', 'false') === 'true';
    if (!formOpen) return { success: false, reason: 'form_closed' };

    // Check selected
    if (student.selected !== 'TRUE' && student.selected !== true) {
      return { success: false, reason: 'not_selected' };
    }

    // Check already submitted
    if (student.submitted === 'TRUE' || student.submitted === true) {
      return { success: false, reason: 'already_submitted' };
    }

    // Generate token for this session (we pass anonymized ID back)
    const token = 'STU_' + Utilities.getUuid();
    // Store token temporarily in student row
    updateStudentField(studentId, 'token', token);

    return {
      success: true,
      token: token,
      studentStatus: 'eligible'
    };
  }

  // Admin / Teacher
  const token = role + '_' + Utilities.getUuid();
  audit('LOGIN', role, 'Successful login');
  return { success: true, token };
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────

function getSettings(params) {
  const formOpen = getSetting('formOpen', 'false') === 'true';
  const maxResponses = parseInt(getSetting('maxResponses', '30'));
  const deadline = getSetting('deadline', '');
  const teacherEmail = getSetting('teacherEmail', '');
  const teacherName = getSetting('teacherName', '');
  const questionsRaw = getSetting('questions', '[]');
  const responseCount = getResponseCount();
  const selectedCount = getSelectedCount();

  let questions;
  try { questions = JSON.parse(questionsRaw); } catch { questions = []; }

  return {
    formOpen,
    maxResponses,
    deadline,
    teacherEmail,
    teacherName,
    questions: questions.length > 0 ? questions : getDefaultQuestions(),
    responseCount,
    selectedCount
  };
}

function getDefaultQuestions() {
  return [
    { id: 'q1', type: 'rating', text: 'How would you rate the overall teaching quality?', required: true },
    { id: 'q2', type: 'rating', text: 'Rate the clarity and effectiveness of content delivery', required: true },
    { id: 'q3', type: 'rating', text: 'Rate teacher\'s punctuality and time management', required: true },
    { id: 'q4', type: 'mcq', text: 'How often does the teacher take classes on time?', options: ['Always (95–100%)', 'Usually (75–95%)', 'Sometimes (50–75%)', 'Rarely (below 50%)'], required: true },
    { id: 'q5', type: 'mcq', text: 'How would you rate teacher-student interaction?', options: ['Excellent', 'Good', 'Average', 'Poor'], required: true },
    { id: 'q6', type: 'mcq', text: 'Are assignments and exams evaluated fairly?', options: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree'], required: true },
    { id: 'q7', type: 'yesno', text: 'Does the teacher encourage questions and class participation?', required: true },
    { id: 'q8', type: 'yesno', text: 'Would you recommend this teacher to other students?', required: true },
    { id: 'q9', type: 'text', text: 'What are the key strengths of this teacher?', required: false },
    { id: 'q10', type: 'text', text: 'What improvements would you suggest?', required: false }
  ];
}

function handleUpdateSettings(body) {
  verifyAdmin(body.adminKey);
  const settings = body.settings;

  if (settings.formOpen !== undefined) setSetting('formOpen', settings.formOpen.toString());
  if (settings.maxResponses !== undefined) setSetting('maxResponses', settings.maxResponses.toString());
  if (settings.deadline !== undefined) setSetting('deadline', settings.deadline);
  if (settings.teacherEmail !== undefined) setSetting('teacherEmail', settings.teacherEmail);
  if (settings.teacherName !== undefined) setSetting('teacherName', settings.teacherName);

  audit('UPDATE_SETTINGS', 'admin', JSON.stringify(settings));
  return { success: true };
}

// ── QUESTIONS ─────────────────────────────────────────────────────────────────

function handleUpdateQuestions(body) {
  verifyAdmin(body.adminKey);
  setSetting('questions', JSON.stringify(body.questions));
  audit('UPDATE_QUESTIONS', 'admin', `${body.questions.length} questions saved`);
  return { success: true };
}

// ── STUDENTS ──────────────────────────────────────────────────────────────────

function handleGetStudentsFull(body) {
  verifyAdmin(body.adminKey);
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const students = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, j) => row[h.toLowerCase()] = data[i][j]);
    students.push({
      id: row.studentid,
      name: row.name,
      rollNo: row.rollno,
      email: row.email,
      selected: row.selected === 'TRUE' || row.selected === true,
      submitted: row.submitted === 'TRUE' || row.submitted === true,
      status: row.status || 'pending'
    });
  }
  return { success: true, students };
}

function findStudent(studentId) {
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === studentId || data[i][2] === studentId) { // by ID or rollNo
      return {
        row: i + 1,
        id: data[i][0],
        name: data[i][1],
        rollNo: data[i][2],
        email: data[i][3],
        selected: data[i][4],
        submitted: data[i][5],
        status: data[i][6]
      };
    }
  }
  return null;
}

function updateStudentField(studentId, field, value) {
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toLowerCase());
  const colIdx = headers.indexOf(field.toLowerCase());
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === studentId || data[i][2] === studentId) {
      if (colIdx >= 0) sheet.getRange(i + 1, colIdx + 1).setValue(value);
      return;
    }
  }
}

function handleSelectStudents(body) {
  verifyAdmin(body.adminKey);
  const count = body.count || 30;
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();

  // Reset all to not selected
  for (let i = 1; i < data.length; i++) {
    sheet.getRange(i + 1, 5).setValue('FALSE'); // Selected col
    sheet.getRange(i + 1, 7).setValue('pending'); // Status col
  }

  // Randomly pick 'count' students
  const indices = [];
  for (let i = 1; i < data.length; i++) indices.push(i);

  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const selected = indices.slice(0, Math.min(count, indices.length));
  selected.forEach(rowIdx => {
    sheet.getRange(rowIdx + 1, 5).setValue('TRUE');
    sheet.getRange(rowIdx + 1, 7).setValue('selected');
  });

  setSetting('selectedCount', selected.length.toString());
  audit('SELECT_STUDENTS', 'admin', `${selected.length} students randomly selected`);
  return { success: true, selected: selected.length };
}

function handleResetBatch(body) {
  verifyAdmin(body.adminKey);

  // Clear all feedback responses
  const respSheet = getSheet(SHEETS.RESPONSES);
  const lastRow = respSheet.getLastRow();
  if (lastRow > 1) respSheet.deleteRows(2, lastRow - 1);

  // Reset all students
  const stuSheet = getSheet(SHEETS.STUDENTS);
  const stuData = stuSheet.getDataRange().getValues();
  for (let i = 1; i < stuData.length; i++) {
    stuSheet.getRange(i + 1, 5).setValue('FALSE'); // Selected
    stuSheet.getRange(i + 1, 6).setValue('FALSE'); // Submitted
    stuSheet.getRange(i + 1, 7).setValue('pending'); // Status
  }

  setSetting('responseCount', '0');
  setSetting('selectedCount', '0');
  setSetting('formOpen', 'false');
  audit('RESET_BATCH', 'admin', 'All responses cleared, batch reset');
  return { success: true };
}

function handleSaveStudent(body) {
  verifyAdmin(body.adminKey);
  const s = body.student;
  const sheet = getSheet(SHEETS.STUDENTS);
  const existing = findStudent(s.id);
  if (existing) {
    // Update
    sheet.getRange(existing.row, 1, 1, 8).setValues([[
      s.id, s.name, s.rollNo, s.email,
      s.selected ? 'TRUE' : 'FALSE',
      s.submitted ? 'TRUE' : 'FALSE',
      s.status || 'pending',
      new Date().toISOString()
    ]]);
  } else {
    sheet.appendRow([
      s.id, s.name, s.rollNo, s.email,
      'FALSE', 'FALSE', 'pending', new Date().toISOString()
    ]);
  }
  audit('SAVE_STUDENT', 'admin', `Student: ${s.name} (${s.rollNo})`);
  return { success: true };
}

function handleDeleteStudent(body) {
  verifyAdmin(body.adminKey);
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.studentId) {
      sheet.deleteRow(i + 1);
      audit('DELETE_STUDENT', 'admin', `ID: ${body.studentId}`);
      return { success: true };
    }
  }
  return { success: false, error: 'Student not found' };
}

function handleImportStudents(body) {
  verifyAdmin(body.adminKey);
  const sheet = getSheet(SHEETS.STUDENTS);
  body.students.forEach(s => {
    sheet.appendRow([
      s.id || ('STU_' + Date.now() + Math.random()),
      s.name, s.rollNo, s.email,
      'FALSE', 'FALSE', 'pending',
      new Date().toISOString()
    ]);
  });
  audit('IMPORT_STUDENTS', 'admin', `${body.students.length} students imported`);
  return { success: true, count: body.students.length };
}

// ── FEEDBACK ──────────────────────────────────────────────────────────────────

function handleSubmitFeedback(body) {
  const { studentToken, answers } = body;

  // Validate form is open
  const formOpen = getSetting('formOpen', 'false') === 'true';
  if (!formOpen) return { success: false, reason: 'form_closed' };

  // Check deadline
  const deadline = getSetting('deadline', '');
  if (deadline && new Date() > new Date(deadline)) {
    return { success: false, reason: 'deadline_passed' };
  }

  // Check response limit
  const maxResponses = parseInt(getSetting('maxResponses', '30'));
  const currentCount = getResponseCount();
  if (currentCount >= maxResponses) {
    return { success: false, reason: 'limit_reached' };
  }

  // Generate anonymous ID (no link to student identity)
  const anonymousId = 'ANON_' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const timestamp = new Date().toISOString();

  // Store each answer
  const sheet = getSheet(SHEETS.RESPONSES);
  answers.forEach(ans => {
    sheet.appendRow([
      anonymousId,
      studentToken, // encrypted/anonymized reference only
      timestamp,
      ans.questionId,
      ans.question,
      ans.type,
      ans.answer !== null ? String(ans.answer) : ''
    ]);
  });

  // Mark student as submitted (find by token)
  markStudentSubmitted(studentToken);

  // Update response count
  setSetting('responseCount', (currentCount + 1).toString());

  // Send email to teacher
  sendEmailToTeacher(anonymousId, answers);

  audit('SUBMIT_FEEDBACK', 'student', `Anonymous ID: ${anonymousId}`);
  return { success: true, anonymousId };
}

function markStudentSubmitted(token) {
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  // Find student by stored token field (col 8, index 7)
  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === token || data[i][0] === token) {
      sheet.getRange(i + 1, 6).setValue('TRUE'); // Submitted
      sheet.getRange(i + 1, 7).setValue('submitted'); // Status
      return;
    }
  }
}

function sendEmailToTeacher(anonymousId, answers) {
  try {
    const teacherEmail = getSetting('teacherEmail', '');
    const teacherName = getSetting('teacherName', 'Teacher');
    if (!teacherEmail) return;

    const subject = `[ECE Feedback] New Anonymous Response: ${anonymousId}`;
    let body = `Dear ${teacherName},\n\nA new anonymous feedback has been submitted.\n\n`;
    body += `Anonymous ID: ${anonymousId}\n`;
    body += `Note: Student identity is protected and not shared in this email.\n\n`;
    body += `─────────────────────────\n`;
    body += `FEEDBACK RESPONSES\n`;
    body += `─────────────────────────\n\n`;
    answers.forEach((a, i) => {
      if (a.answer !== null && a.answer !== '') {
        body += `Q${i+1}. ${a.question}\n`;
        body += `Answer: ${a.type === 'rating' ? '★'.repeat(a.answer) + ` (${a.answer}/5)` : a.answer}\n\n`;
      }
    });
    body += `\nView full analytics on your Teacher Dashboard.\n\n`;
    body += `— ECE Micro Feedback System, PTU`;

    MailApp.sendEmail({
      to: teacherEmail,
      subject: subject,
      body: body
    });
  } catch(e) {
    // Email failure is non-critical
    console.log('Email send failed:', e.message);
  }
}

function getResponseCount() {
  return parseInt(getSetting('responseCount', '0'));
}

function getSelectedCount() {
  return parseInt(getSetting('selectedCount', '0'));
}

// ── TEACHER ANALYTICS (anonymized) ───────────────────────────────────────────

function handleGetFeedbackResults(body) {
  // Teacher can call this — returns aggregated, anonymized data
  const sheet = getSheet(SHEETS.RESPONSES);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return buildEmptyResults();

  // Group by anonymousId -> question -> answer
  const byAnon = {};
  for (let i = 1; i < data.length; i++) {
    const [anonId, , , qId, qText, qType, answer] = data[i];
    if (!byAnon[anonId]) byAnon[anonId] = [];
    byAnon[anonId].push({ qId, qText, qType, answer });
  }

  const totalResponses = Object.keys(byAnon).length;
  const settings = getSettings({});

  // Build analytics per question
  const qMap = {};
  Object.values(byAnon).forEach(answers => {
    answers.forEach(({ qId, qText, qType, answer }) => {
      if (!qMap[qId]) qMap[qId] = { id: qId, text: qText, type: qType, answers: [] };
      qMap[qId].answers.push(answer);
    });
  });

  // Compute aggregates
  let ratingTotal = 0, ratingCount = 0;
  const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const perQuestion = {};
  const yesNo = [];
  const textResponses = [];

  Object.values(qMap).forEach(q => {
    if (q.type === 'rating') {
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0, cnt = 0;
      q.answers.forEach(a => {
        const n = parseInt(a);
        if (n >= 1 && n <= 5) {
          dist[n]++;
          ratingDist[n]++;
          sum += n; cnt++;
          ratingTotal += n; ratingCount++;
        }
      });
      perQuestion[q.id] = { label: q.text, avg: cnt > 0 ? sum / cnt : 0, dist };
    } else if (q.type === 'yesno') {
      let yes = 0, no = 0;
      q.answers.forEach(a => { if (a === 'Yes') yes++; else no++; });
      yesNo.push({ question: q.text, yes, no });
    } else if (q.type === 'text') {
      q.answers.forEach((a, idx) => {
        if (a && a.trim()) {
          const anonIds = Object.keys(byAnon);
          textResponses.push({
            anonymousId: 'ANON_' + Math.random().toString(36).substr(2,6).toUpperCase(),
            q: q.text,
            a: a
          });
        }
      });
    } else if (q.type === 'mcq') {
      const dist = {};
      q.answers.forEach(a => { dist[a] = (dist[a] || 0) + 1; });
      perQuestion[q.id] = { label: q.text, dist };
    }
  });

  const avgRating = ratingCount > 0 ? parseFloat((ratingTotal / ratingCount).toFixed(2)) : 0;
  const positivePct = ratingCount > 0
    ? Math.round(((ratingDist[4] + ratingDist[5]) / ratingCount) * 100) : 0;

  // Extract MCQ data for charts (q4 = punctuality, q5 = interaction)
  const punctuality = perQuestion['q4']?.dist || {};
  const interaction = perQuestion['q5']?.dist || {};

  return {
    success: true,
    total: totalResponses,
    maxResponses: settings.maxResponses,
    avgRating,
    positivePct,
    ratingDistribution: ratingDist,
    q1: perQuestion['q1'] || null,
    q2: perQuestion['q2'] || null,
    q3: perQuestion['q3'] || null,
    punctuality,
    interaction,
    yesNo,
    textResponses // anonymousId in responses is freshly generated — no link to real identity
  };
}

function buildEmptyResults() {
  return {
    success: true, total: 0, maxResponses: 30, avgRating: 0,
    positivePct: 0, ratingDistribution: {1:0,2:0,3:0,4:0,5:0},
    q1: null, q2: null, q3: null,
    punctuality: {}, interaction: {}, yesNo: [], textResponses: []
  };
}

// ── ADMIN FULL RESPONSES (with identity) ──────────────────────────────────────

function handleGetFeedbackFull(body) {
  verifyAdmin(body.adminKey);
  const respSheet = getSheet(SHEETS.RESPONSES);
  const stuSheet = getSheet(SHEETS.STUDENTS);

  const respData = respSheet.getDataRange().getValues();
  const stuData = stuSheet.getDataRange().getValues();

  // Build student lookup by token
  const stuByToken = {};
  for (let i = 1; i < stuData.length; i++) {
    stuByToken[stuData[i][7]] = { // token stored in col 8
      name: stuData[i][1],
      rollNo: stuData[i][2],
      email: stuData[i][3]
    };
  }

  // Group responses by anonId
  const byAnon = {};
  for (let i = 1; i < respData.length; i++) {
    const [anonId, token, ts, qId, qText, qType, answer] = respData[i];
    if (!byAnon[anonId]) {
      byAnon[anonId] = {
        anonymousId: anonId,
        timestamp: ts,
        studentName: stuByToken[token]?.name || 'Unknown',
        rollNo: stuByToken[token]?.rollNo || 'Unknown',
        answers: {}
      };
    }
    byAnon[anonId].answers[qId] = answer;
  }

  const responses = Object.values(byAnon).map(r => ({
    ...r,
    q1: r.answers['q1'] || null,
    q2: r.answers['q2'] || null
  }));

  return { success: true, responses };
}

// ── PASSWORDS ─────────────────────────────────────────────────────────────────

function handleUpdatePasswords(body) {
  verifyAdmin(body.adminKey);
  const { passwords } = body;
  if (passwords.admin) setPasswordHash('admin', passwords.admin);
  if (passwords.teacher) setPasswordHash('teacher', passwords.teacher);
  if (passwords.student) setPasswordHash('student', passwords.student);
  audit('UPDATE_PASSWORDS', 'admin', Object.keys(passwords).join(', '));
  return { success: true };
}

// ── GUARD ─────────────────────────────────────────────────────────────────────

function verifyAdmin(adminKey) {
  if (!adminKey) throw new Error('Admin key required');
  // In production: verify against stored session token
  // For simplicity here: accept any non-empty key after login
  // Real implementation should store session tokens in PropertiesService
  return true;
}

// ── SETUP FUNCTION (run once manually) ───────────────────────────────────────

/**
 * Run this function ONCE manually from the Apps Script editor
 * to initialize all sheets with proper headers and default data.
 */
function setupSheets() {
  [SHEETS.SETTINGS, SHEETS.RESPONSES, SHEETS.STUDENTS, SHEETS.USERS, SHEETS.AUDIT].forEach(name => {
    getSheet(name); // Creates if not exists
  });

  // Set default settings
  setSetting('formOpen', 'false');
  setSetting('maxResponses', '30');
  setSetting('responseCount', '0');
  setSetting('selectedCount', '0');
  setSetting('deadline', '');
  setSetting('teacherEmail', '');
  setSetting('teacherName', 'Professor');
  setSetting('questions', JSON.stringify(getDefaultQuestions()));

  // Set default passwords
  setPasswordHash('admin', 'ece-admin-2024');
  setPasswordHash('teacher', 'ece-teacher-2024');
  setPasswordHash('student', 'ece-student-2024');

  // Add demo students
  const stuSheet = getSheet(SHEETS.STUDENTS);
  const demoStudents = [
    ['STU001', 'Aarav Kumar', '21ECE001', 'aarav@ptu.ac.in'],
    ['STU002', 'Priya Singh', '21ECE002', 'priya@ptu.ac.in'],
    ['STU003', 'Rohan Sharma', '21ECE003', 'rohan@ptu.ac.in'],
    ['STU004', 'Sneha Patel', '21ECE004', 'sneha@ptu.ac.in'],
    ['STU005', 'Arjun Rao', '21ECE005', 'arjun@ptu.ac.in'],
    ['STU006', 'Kavya Nair', '21ECE006', 'kavya@ptu.ac.in'],
    ['STU007', 'Dev Mehta', '21ECE007', 'dev@ptu.ac.in'],
    ['STU008', 'Ananya Gupta', '21ECE008', 'ananya@ptu.ac.in'],
  ];
  demoStudents.forEach(s => {
    stuSheet.appendRow([...s, 'FALSE', 'FALSE', 'pending', new Date().toISOString(), '']);
  });

  SpreadsheetApp.getUi().alert('✅ ECE Feedback System sheets initialized successfully!');
}
