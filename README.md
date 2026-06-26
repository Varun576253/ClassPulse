# ClassPulse

## Overview

ClassPulse is an AI-powered classroom intelligence platform that helps teachers identify learning gaps in real time. Using Google Gemini AI, it generates diagnostic questions, analyzes student responses, detects misconceptions, and provides actionable intervention plans to improve classroom learning outcomes.

Designed for low-connectivity environments, students can join sessions using a QR code without installing an application or creating an account.

---

## Features

* AI-generated diagnostic questions
* Real-time learning gap detection
* Misconception analysis
* Teacher dashboard with classroom insights
* Individual student learning profiles
* QR-based student participation
* Offline-first support
* Regional language support

---

## Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL

### AI

* Google Gemini 1.5 Flash

---

## Project Structure

```text
ClassPulse
│
├── client
│   ├── src
│   ├── package.json
│   └── vite.config.js
│
├── server
│   ├── routes
│   ├── controllers
│   ├── services
│   ├── package.json
│   └── server.js
│
├── database
│
└── README.md
```

---

## Backend Setup

```bash
cd server
npm install
npm run dev
```

Backend runs at:

```
http://localhost:5000
```

---

## Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## Future Improvements

* Parent progress summaries
* Voice-based assessments
* DIKSHA integration
* Enhanced learning analytics
* Mobile application support
* Offline database synchronization

---

## License

This project was developed for educational and hackathon purposes.
