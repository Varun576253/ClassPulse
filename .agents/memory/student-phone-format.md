---
name: Student phone format
description: How student phones are stored and looked up for quiz join.
---

Students are stored with phone in the format `91XXXXXXXXXX` (12 digits, no `+` prefix).

The student-login endpoint in `server/routes/sessions.js` does:
```js
Student.findOne({ teacherId: session.teacherId, phone: `91${cleanMobile}` })
```
Where `cleanMobile` is the 10-digit number the student types (e.g. `9876541200`).

The seed (`server/seed.js`) stores phones as:
```js
phone: `91${tenDigit}`  // e.g. "919876541200"
```

**Why:** No `+` because the DB lookup is an exact string match with no normalization. The `+` prefix caused lookup failures in early versions.

**How to apply:** When creating students via the UI (Roster page), ensure the stored phone is `91XXXXXXXXXX`. If students are imported from CSV, strip `+` before saving.
