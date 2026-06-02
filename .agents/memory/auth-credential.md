---
name: Auth credential field
description: Teacher login accepts email OR phone; how each is looked up in the DB.
---

The login endpoint accepts `{ phone, password }` OR `{ email, password }` in the request body. The server detects email by regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

- Phone lookup: `regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $1` — strips all non-digits before comparing.
- Email lookup: `lower(COALESCE(email, '')) = lower($1)` — case-insensitive.

`email TEXT` column was added to the `teachers` table via `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email TEXT` in the migrations string in `server/config/db.js`. The `Teacher` model also maps `email: 'email'`.

**Why:** Demo needs email login; existing teachers use phone. Both must work without breaking the other.

**How to apply:** Any new auth-related lookup should normalize phone with regexp_replace and email with lower(). The frontend Login.jsx detects which to send based on whether the credential string contains `@`.
