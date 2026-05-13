# ⚡ NexHire — AI-Powered MERN Job Portal

> **NexHire** connects talent with opportunity. Recruiters post jobs, seekers apply with AI resume matching, and both sides get real-time updates via Socket.io.

---

## 📁 Folder Structure

```
NexHire/
│
├── backend/                          ← Express + Node.js API
│   ├── models/
│   │   ├── User.js                   ← Roles: seeker | recruiter, notifications array
│   │   ├── Job.js                    ← Full job schema with NLP keywordVector
│   │   ├── Application.js            ← Status lifecycle + AI match score storage
│   │   ├── Resume.js                 ← Structured sections + Cloudinary upload fields
│   │   └── Bookmark.js               ← User ↔ Job unique bookmark
│   │
│   ├── routes/
│   │   ├── auth.js                   ← Register, login, profile, avatar upload
│   │   ├── jobs.js                   ← CRUD + paginated listing + dashboard stats
│   │   ├── applications.js           ← Apply, status update (→ Socket.io), withdraw
│   │   ├── resume.js                 ← Builder save, PDF upload, AI match, suggestions
│   │   ├── bookmarks.js              ← Toggle + list saved jobs
│   │   └── notifications.js          ← Read/clear notification history
│   │
│   ├── middleware/
│   │   ├── auth.js                   ← JWT protect + recruiterOnly / seekerOnly guards
│   │   └── upload.js                 ← Cloudinary multer (resume PDF, avatar, logo)
│   │
│   ├── utils/
│   │   ├── resumeMatcher.js          ← NLP keyword extractor + match scorer (0-100)
│   │   └── socketHandler.js          ← Socket.io rooms, notifyUser(), broadcastToJobRoom()
│   │
│   ├── server.js                     ← Express bootstrap, Socket.io, MongoDB connect
│   ├── package.json
│   └── .env.example
│
└── client/                           ← React + Vite + Tailwind CSS
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx             ← Sticky nav, notification bell, mobile menu
    │   │   ├── JobCard.jsx            ← AI match badge, bookmark toggle, salary, chips
    │   │   ├── JobDetailsDrawer.jsx   ← Slide-in panel: match bar, apply, cover letter
    │   │   ├── Dashboard.jsx          ← Recruiter: pipeline chart, jobs table, applicants
    │   │   ├── ResumeBuilder.jsx      ← 5-tab form + jsPDF export + Cloudinary upload
    │   │   └── ProtectedRoute.jsx     ← Role-aware route guard
    │   │
    │   ├── pages/
    │   │   ├── Login.jsx              ← Clean login form
    │   │   ├── Register.jsx           ← Role picker + password strength
    │   │   ├── JobList.jsx            ← Infinite scroll, filter panel, AI suggestions
    │   │   ├── AppliedJobs.jsx        ← Status timeline, summary cards, withdraw
    │   │   ├── Bookmarks.jsx          ← Saved jobs grid with drawer
    │   │   ├── ResumePage.jsx         ← Loads resume data → ResumeBuilder
    │   │   └── PostJob.jsx            ← 3-step wizard with live preview
    │   │
    │   ├── context/
    │   │   ├── AuthContext.jsx        ← JWT session, login/register/logout
    │   │   └── SocketContext.jsx      ← Socket.io connect, toast on notification:new
    │   │
    │   ├── hooks/
    │   │   └── useInfiniteScroll.js   ← IntersectionObserver hook with 200px preload
    │   │
    │   └── utils/
    │       └── api.js                 ← Axios instance with JWT interceptor + 401 redirect
    │
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── .env.example
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- Cloudinary account (free tier is fine)

### 1 — Install dependencies

```bash
# Backend
cd NexHire/backend
npm install

# Frontend
cd ../client
npm install
```

### 2 — Environment variables

```bash
# Backend
cd backend
cp .env.example .env
# → fill in MONGO_URI, JWT_SECRET, CLOUDINARY_* values

# Frontend
cd ../client
cp .env.example .env
# → defaults work for local dev
```

**`backend/.env` minimum required:**
```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/nexhire
JWT_SECRET=nexhire_change_this_in_production
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3 — Run

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd client  && npm run dev
```

| Service  | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8000 |
| Health   | http://localhost:8000/api/health |

---

## 🌐 Full API Reference

### Auth  `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register seeker or recruiter |
| POST | `/login` | — | Returns JWT token |
| GET | `/me` | ✅ | Current user profile |
| PATCH | `/profile` | ✅ | Update name/skills/headline |
| PATCH | `/avatar` | ✅ | Upload avatar → Cloudinary |
| POST | `/generate-invite` | Recruiter | Generate recruiter invite code |

### Jobs  `/api/jobs`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Paginated, filterable job list |
| GET | `/:id` | — | Single job detail |
| POST | `/` | Recruiter | Create job + build NLP vector |
| PATCH | `/:id` | Recruiter | Update job fields |
| DELETE | `/:id` | Recruiter | Soft-close job |
| GET | `/recruiter/my-jobs` | Recruiter | Recruiter's own jobs |
| GET | `/recruiter/dashboard` | Recruiter | Stats + pipeline + recent data |

### Applications  `/api/applications`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Seeker | Apply (calculates AI match score) |
| GET | `/my` | Seeker | Own applications with status history |
| GET | `/job/:jobId` | Recruiter | All applicants for a job |
| PATCH | `/:id/status` | Recruiter | Update status → DB + Socket.io notify |
| DELETE | `/:id` | Seeker | Withdraw application |

### Resume  `/api/resume`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/me` | Seeker | Fetch full resume |
| PUT | `/` | Seeker | Save structured data, rebuild keyword vector |
| POST | `/upload` | Seeker | Upload PDF to Cloudinary |
| POST | `/match/:jobId` | Seeker | Get AI match score for a job |
| GET | `/suggested-jobs` | Seeker | AI-recommended jobs based on resume |

### Bookmarks  `/api/bookmarks`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Seeker | Paginated saved jobs |
| POST | `/:jobId` | Seeker | Save job |
| DELETE | `/:jobId` | Seeker | Remove bookmark |
| GET | `/check/:jobId` | Seeker | Check if bookmarked |

---

## 🤖 AI Resume Matching — How It Works

No external API needed — runs entirely on the server.

```
1. EXTRACT   → Tokenize text, remove 60+ stop words
               Detect multi-word tech phrases (e.g. "machine learning", "ci/cd")
               Phrases get 2× weight in scoring

2. VECTORIZE → Resume: built from experience + projects + skills + education
               Job:    built from title + description + skills + requirements + tags

3. SCORE     → weighted_matched / weighted_total × 100  (capped at 100)
               Returns: score, matchedKeywords[], missingKeywords[], verdict

4. STORE     → matchScore saved on Application document for recruiter sorting
               Resume keywordVector updated on every save
```

**Score thresholds:**
| Score | Verdict |
|---|---|
| 75–100% | 🟢 Strong Match |
| 50–74%  | 🔵 Good Match |
| 30–49%  | 🟡 Partial Match |
| 0–29%   | ⚫ Low Match |

---

## ⚡ Real-time System (Socket.io)

```
Connection:
  Client connects with ?userId=xxx → joins room user:{userId}

Recruiter updates status:
  PATCH /applications/:id/status
  → persists to DB
  → notifyUser(io, seekerId, payload)    ← real-time ping
  → broadcastToJobRoom(io, jobId, ...)   ← dashboard live update

Seeker receives:
  socket.on("notification:new", handler)
  → react-hot-toast shows instantly
  → unreadCount badge increments in Navbar
```

---

## ☁️ Cloudinary Storage

| Asset | Folder | Transform |
|---|---|---|
| Resume PDF/DOC | `nexhire/resumes/{userId}` | Raw file, 5 MB max |
| User Avatar | `nexhire/avatars` | 400×400 face crop |
| Company Logo | `nexhire/logos` | 200×200 padded |

Old files deleted automatically when replaced.

---

## 🛡️ Security

- JWT with configurable expiry (default 7 days)
- Role-based middleware — seekers can't access recruiter routes and vice-versa
- Rate limiting — 300 req / 15 min per IP
- `helmet` security headers on all responses
- Multer file type + size validation before Cloudinary upload
- Unique index on `(job, applicant)` — no duplicate applications
- bcrypt password hashing with 12 salt rounds
- Global 401 interceptor auto-redirects expired sessions

---

## 🧩 Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS 3 |
| Forms | React Hook Form |
| Routing | React Router v6 |
| HTTP client | Axios |
| Backend | Express.js (ESM) |
| Database | MongoDB + Mongoose |
| Authentication | JWT + bcrypt |
| Real-time | Socket.io |
| File storage | Cloudinary |
| PDF generation | jsPDF (client-side) |
| NLP matching | Custom (no external API) |

---

## 🎨 Name & Branding

**NexHire** — combining *"Next"* (your next opportunity) with *"Hire"*.  
Brand color: Indigo `#4f46e5` · Icon: ⚡ (speed, energy, connection)
