# ⚡ ECE Micro Feedback System
### Dept. of Electronics & Communication Engineering | Punjab Technical University
**DC Course Project | Full-Stack: Vercel + Google Apps Script + Google Sheets**

---

## 📁 Project Folder Structure

```
micro-feedback-system/
├── index.html              ← Homepage (hero, navbar, cards)
├── vercel.json             ← Vercel deployment config
├── Code.gs                 ← Google Apps Script backend (copy this)
├── src/
│   ├── styles/
│   │   └── main.css        ← All styles (shared)
│   ├── utils/
│   │   ├── config.js       ← Config (put your Apps Script URL here)
│   │   └── api.js          ← API calls to Google Apps Script
│   └── pages/
│       ├── admin.html      ← Admin Control Panel
│       ├── student.html    ← Student Feedback Form
│       └── teacher.html    ← Teacher Analytics Dashboard
```

---

## 🚀 STEP-BY-STEP DEPLOYMENT GUIDE

---

### STEP 1 — Set Up Google Sheets

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **+ Blank spreadsheet**
3. Rename it: `ECE Feedback System`
4. Note the **Spreadsheet ID** from the URL:  
   `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`

---

### STEP 2 — Deploy Google Apps Script Backend

1. Inside your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. **Paste the entire contents of `Code.gs`** from this project
4. Click **Save** (Ctrl+S)
5. In the editor toolbar, select function `setupSheets` and click **▶ Run**
   - This creates all required sheets and default data
   - Allow permissions when prompted
6. **Deploy as Web App:**
   - Click **Deploy → New deployment**
   - Type: `Web App`
   - Description: `ECE Feedback System v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
7. **COPY the Web App URL** — it looks like:  
   `https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXXXXXXXX/exec`

> ⚠️ **Important:** Every time you edit Code.gs, you must create a **New Deployment** (not update existing) for changes to take effect in production.

---

### STEP 3 — Configure Frontend

1. Open `src/utils/config.js`
2. Replace the placeholder URL:

```javascript
// BEFORE
APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec',

// AFTER (paste your URL)
APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbXXXXXX.../exec',
```

3. Optionally update default passwords (you can change them via Admin Panel later):
```javascript
PASSWORDS: {
  admin: 'your-new-admin-pass',
  teacher: 'your-teacher-pass',
  student: 'your-student-pass'
}
```

---

### STEP 4 — Deploy Frontend to Vercel

#### Option A: GitHub + Vercel (Recommended)
1. Create a GitHub account at [github.com](https://github.com)
2. Create a new repository: `ece-feedback-system`
3. Upload all project files (drag & drop into GitHub)
4. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
5. Click **Add New Project** → Select your repository
6. Framework Preset: **Other**
7. Click **Deploy** — Vercel will give you a URL like:  
   `https://ece-feedback-system.vercel.app`

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project folder
cd micro-feedback-system

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: ece-feedback-system
# - Which directory? ./
# - Override settings? No

# For production:
vercel --prod
```

---

### STEP 5 — First-Time Setup

1. Visit your Vercel URL
2. Click **Admin** in navbar
3. Login with password: `ece-admin-2024`
4. **Immediately change the admin password** in Access Control tab
5. Add your students via **Students tab** (or import CSV)
6. Set your teacher's email in **Form Control tab**
7. Review/edit questions in **Questions tab**
8. Set a deadline
9. Click **Randomly Select Students** to pick 30 students
10. **Open the form** using the toggle

---

## 🔑 DEFAULT PASSWORDS

| Role | Default Password |
|------|-----------------|
| Admin | `ece-admin-2024` |
| Teacher | `ece-teacher-2024` |
| Student | `ece-student-2024` |

> ⚠️ **Change all passwords immediately after first login via Admin → Access Control**

---

## 🗄️ Google Sheets Structure

After running `setupSheets()`, your spreadsheet will have these tabs:

### Settings Sheet
| Key | Value | UpdatedAt |
|-----|-------|-----------|
| formOpen | false | ... |
| maxResponses | 30 | ... |
| deadline | 2024-12-31T23:59 | ... |
| teacherEmail | teacher@ptu.ac.in | ... |
| questions | [JSON array] | ... |
| responseCount | 0 | ... |

### FeedbackResponses Sheet
| AnonymousID | StudentToken | SubmittedAt | QuestionID | QuestionText | QuestionType | Answer |
|-------------|-------------|-------------|------------|--------------|--------------|--------|
| ANON_ABC123 | STU_uuid... | 2024-12-01 | q1 | How would you rate... | rating | 4 |

> 🔒 **Student identity is NOT stored here.** Only an anonymous token is stored.

### Students Sheet
| StudentID | Name | RollNo | Email | Selected | Submitted | Status |
|-----------|------|--------|-------|----------|-----------|--------|
| STU001 | Name | 21ECE001 | ... | TRUE | FALSE | selected |

### Users Sheet
| Role | PasswordHash | Email | Name | UpdatedAt |
|------|-------------|-------|------|-----------|
| admin | sha256hash | ... | ... | ... |

### AuditLog Sheet
| Timestamp | Action | Actor | Details |
|-----------|--------|-------|---------|

---

## 🔒 Security Model

```
ADMIN ──────────────► Full access (all data including identity)
                           │
TEACHER ────────────► Anonymized analytics only (no identity)
                           │
STUDENT ────────────► Submit form (anonymous token only)
                           │
                    Google Sheets (source of truth)
```

**Identity Protection Chain:**
1. Student submits → server generates `ANON_XXXXX` random token
2. This anonymous token is what gets stored in `FeedbackResponses`
3. Teacher only sees `ANON_XXXXX` — never name or roll number
4. Admin can cross-reference Students sheet by token (separate sheet)

---

## 📧 Email Notifications

When a student submits feedback:
- Teacher receives email with anonymous ID and all answers
- Email subject: `[ECE Feedback] New Anonymous Response: ANON_XXX`
- **Student name is NOT included in the email**
- Teacher only sees responses, not who submitted

---

## ⚙️ Admin Controls Reference

| Control | Description |
|---------|-------------|
| Form Open/Close toggle | Enables or disables student submission |
| Max Responses | Limit (default 30) — auto-closes form when reached |
| Set Deadline | Countdown shown to students; form auto-closes |
| Random Select | Picks N random students from registered list |
| Reset Batch | Clears all responses & resets for next round |
| Edit Questions | Add/edit/delete questions (rating, MCQ, text, yes/no) |
| View Responses | See all responses WITH student identity |
| Change Passwords | Update passwords for all roles |
| Export CSV | Download all response data |

---

## 🔄 Updating Apps Script (Important!)

After any code change to `Code.gs`:
1. Apps Script Editor → Deploy → **New deployment** (not "Manage existing")
2. Copy the **new URL**
3. Update `APPS_SCRIPT_URL` in `config.js`
4. Redeploy to Vercel: `vercel --prod`

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Backend not connected" | Check your Apps Script URL in config.js |
| CORS error | Redeploy Apps Script with "Anyone" access |
| Login fails | Verify password, run setupSheets() again |
| Email not received | Check teacher email in Admin panel |
| Charts not showing | Ensure Chart.js CDN is accessible |
| Students not found | Add students via Admin → Students tab first |

---

## 📱 Features Summary

✅ Professional ECE-themed homepage with circuit board animation  
✅ Role-based access (Admin / Student / Teacher)  
✅ Password-protected login for all roles  
✅ Random student selection (configurable limit)  
✅ Anonymous feedback with token system  
✅ Teacher analytics: pie charts, bar charts, ratings, text responses  
✅ Admin can see student identity (teacher cannot)  
✅ Email notification to teacher on new feedback  
✅ Form open/close control  
✅ Deadline with countdown timer  
✅ Reset for new batch  
✅ Add/edit questions (rating, MCQ, yes/no, text)  
✅ Audit log of all admin actions  
✅ Google Sheets as database  
✅ Deployable on Vercel  

---

*Built for DC Course Project | Dept. of ECE | PTU*
