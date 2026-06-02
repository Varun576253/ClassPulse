# ClassPulse

AI-powered **Teacher Learning Gap Intervention Assistant** built for Indian school classrooms.

## What it does

ClassPulse helps teachers detect learning gaps early and act on them immediately:

1. **Create a check-in** — Teacher picks a topic (or types a custom one). Gemini AI generates 3 diagnostic questions designed to surface misconceptions, not just measure correctness.
2. **Generate QR code** — Students scan the code and join on any smartphone browser. No app install needed.
3. **AI analysis** — After responses come in, Gemini analyses the class as a whole: who understood, who is partially there, who needs support — and identifies the root misconception.
4. **Intervention plan** — Teacher receives a concrete 5-minute reteach activity and a group breakdown (Advanced / Average / Needs Support).
5. **Track progress** — Each student builds a learning profile over time: strong topics, weak topics, recurring mistakes, confidence level, risk level.

## Demo credentials

| Role | Credential | Password |
|------|-----------|----------|
| Teacher (Maths) | sunita@classpulse.demo | ClassPulse@123 |
| Teacher (Science) | ramesh@classpulse.demo | ClassPulse@123 |

Student quiz phones (10-digit): 9876541200 through 9876541224

## Local development

```bash
npm install
npm run dev
```

The app seeds demo data automatically on first start if the database is empty.

- Backend: http://localhost:3000
- Frontend: http://localhost:5000

## Offline Classroom Mode

For classrooms with no internet:

1. Enable **Offline Classroom Mode** in the New Session screen
2. Select your device's local IP address
3. Create a mobile hotspot on the teacher device
4. Students connect to the hotspot
5. The QR code points to the teacher's local IP (e.g. `http://192.168.x.x:3000/quiz?sessionId=...`)
6. Students join without internet — responses are stored in the local database
7. Sync later when internet returns

## Architecture

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express (CommonJS) |
| Database | PostgreSQL (custom ORM wrapper) |
| Frontend | React 19 + Vite |
| AI | Google Gemini via official API |
| Styles | Tailwind CSS |
| QR | `qrcode` npm package |
| Offline | Service worker + localStorage queue |

## Key files

```
server/
  index.js                — entry point + auto-seed
  config/db.js            — schema + migrations
  routes/                 — auth, sessions, analytics, system
  controllers/            — questionController (AI + QR)
  services/
    analyticsService.js   — health score, gap trends
    geminiService.js      — question + analysis generation
    autoSeed.js           — first-run demo data
  utils/quizQr.js         — QR generation (cloud + offline)

client/src/
  pages/
    Dashboard.jsx         — learning-gap first teacher view
    NewSession.jsx        — create check-in + offline mode
    SessionResults.jsx    — live responses + AI analysis
    StudentProgress.jsx   — per-student learning profile
    StudentQuiz.jsx       — student-facing quiz (phone login)
  components/
    ClassHealthScore.jsx  — overall class health gauge
    InterventionRecommendations.jsx
    MisconceptionTracker.jsx
    RiskStudents.jsx
```

## Challenge alignment: Learning Gaps & Timely Feedback

| Requirement | Implementation |
|-------------|---------------|
| Identify learning gaps | AI analysis after every check-in |
| Timely feedback | Results available immediately after session |
| Low teacher burden | One tap to create session, QR to distribute |
| Actionable insights | Named 5-min reteach activity per session |
| Student grouping | Auto-grouped: Advanced / Average / Needs Support |
| Progress tracking | Per-student risk level, confidence, history |
| Offline ready | Local IP QR + service worker queue |
| Regional languages | English, Hindi, Telugu, Marathi, Tamil |
| Mobile-first | Responsive design optimised for smartphones |

## User preferences

- Keep component structure modular (one component per file)
- No mocked or fake data — all metrics must be computed from real session responses
- Empty states must be informative (no placeholder numbers like "50")
- Student login: phone number only (no free-form name entry)
- Seed data must be pedagogically realistic (real misconceptions, not random scores)
