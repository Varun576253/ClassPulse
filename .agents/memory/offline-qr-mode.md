---
name: Offline QR mode
description: How offline classroom mode generates a local-network QR code.
---

`server/utils/quizQr.js` — `buildQuizQr(sessionId, overrideBaseUrl?)` accepts an optional second argument. If provided, it builds the quiz URL from that base instead of the cloud URL.

`GET /api/system/local-addresses` returns all non-internal IPv4 interfaces via `os.networkInterfaces()` with the server port appended. Example response:
```json
{ "addresses": [{ "name": "eth0", "address": "192.168.1.5", "quizUrl": "http://192.168.1.5:3000" }] }
```

The frontend (`NewSession.jsx`) has an "Offline Classroom Mode" toggle that:
1. Fetches local addresses from that endpoint
2. Lets teacher select which IP to use
3. Sends `offlineBaseUrl` in the POST body to `/sessions/start` or `/custom-questions/start`

Both session start handlers pass `offlineBaseUrl` to `buildQuizQr`.

**Why:** True offline classroom mode — students join via teacher hotspot without internet. The QR must point to LAN IP, not cloud URL.

**How to apply:** In production build served from port 3000, students on the same hotspot can access `http://192.168.x.x:3000/quiz?sessionId=...` directly. In dev (Vite on 5000, API on 3000) the QR points to port 3000 which serves static files only in production build.
