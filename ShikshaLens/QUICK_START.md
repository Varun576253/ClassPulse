# ClassPulse Quick Start

## 1. Install

```bash
git clone https://github.com/sricharanreddycheruku/Studentgap.git
cd Studentgap
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Fill these values in `.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, for example Neon |
| `PG_SSL` | Use `true` for Neon or other hosted PostgreSQL with SSL |
| `GEMINI_API_KEY` | AI question generation and analysis |
| `GREENAPI_INSTANCE_ID` | Real WhatsApp sending and reply webhooks |
| `GREENAPI_API_TOKEN` | Green API token |
| `TWILIO_ACCOUNT_SID` | Real SMS password reset codes |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_SMS_FROM` | Twilio SMS phone number in E.164 format |
| `API_PORT` | Backend port, default `3000` |

## 3. Run

```bash
npm run dev
```

Open `http://localhost:5000`.

Register a teacher account with a mobile number and password, then add students from the roster.

## 4. Real WhatsApp replies

Real incoming replies need a public backend URL. For local development:

```bash
npx ngrok http 3000
```

In Green API, set the webhook URL to:

```text
https://your-ngrok-url/api/webhook/whatsapp
```

Enable the `incomingMessageReceived` notification. When students reply in WhatsApp, their responses appear on the session results page live.

The backend also accepts Green API posts at `/`, `/webhook`, `/webhook/whatsapp`, and `/api/webhook` so an ngrok base URL still works during demos. The full `/api/webhook/whatsapp` URL is the preferred setting.

To replay a local Green API-style reply against your running server:

```bash
npm run replay:webhook -- 919876543210 "A B C"
```

To replay the "message sent from phone" webhook shape:

```bash
npm run replay:webhook -- --phone-sent 919876543210 "A B C"
```

## 5. Seed demo data

```bash
node server/seed.js
```

Seeded teacher accounts use this password:

```text
ClassPulse@123
```

## Useful Pages

| URL | What it does |
|---|---|
| `/login` | Login, register, or reset password by SMS |
| `/` | Dashboard with sessions, charts, risks, and insights |
| `/sessions/new` | Start an AI or custom diagnostic session |
| `/roster` | Add, edit, and remove students |
| `/whatsapp` | Check Green API, webhook, AI, database, and SMS setup |
