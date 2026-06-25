# Meetli

Create Google Calendar events from natural language. Describe a meeting in plain text, review the parsed details, refine them in chat, and add the event to your personal or family calendar.

<img width="854" height="480" alt="clideo_editor_6ecb43974c2a4f1e994efc3a275d73c9" src="https://github.com/user-attachments/assets/d83fbba2-a369-40f6-9868-d6e4a814d5df" />
<img width="876" height="811" alt="צילום מסך 2026-06-25 ב-9 42 55" src="https://github.com/user-attachments/assets/13349685-a9ce-44d8-92e3-a0f5b62732d1" />
<img width="626" height="928" alt="צילום מסך 2026-06-25 ב-10 48 31" src="https://github.com/user-attachments/assets/0a5bc849-65db-4ec1-a6ba-d3c49f9653d8" />


## Features

- **Natural-language parsing** — OpenAI extracts title, date, time, duration, and target calendar from your message.
- **Conversational edits** — Follow up with short corrections (“make it 30 minutes”, “move to Friday”) without retyping everything.
- **Google Calendar integration** — Sign in with Google OAuth and create events with one click.
- **Personal & family calendars** — Routes events to your primary calendar or a shared family calendar when you ask for it.
- **Timezone-aware** — Uses the browser timezone when parsing dates and times.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Material UI
- **Backend:** Express, express-session
- **APIs:** OpenAI (event parsing), Google Calendar API (OAuth + event creation)

## Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A [Google Cloud project](https://console.cloud.google.com/) with:
  - **Google Calendar API** enabled
  - **OAuth 2.0 Client ID** (Web application type)

## Google Cloud setup

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** (application type: **Web application**).
3. Add an **Authorized redirect URI**:
   ```
   http://localhost:3001/auth/google/callback
   ```
   For production, add your deployed backend callback URL as well.
4. Enable the **Google Calendar API** for the project ([API Library](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)).
5. Copy the **Client ID** and **Client secret** into your `.env` file.

If the app is in Google’s “testing” mode, add your Google account under **OAuth consent screen → Test users**.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `OPENAI_MODEL` | *(optional)* Model for parsing (default: `gpt-4o-mini`) |
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Must match the redirect URI in Google Cloud (`http://localhost:3001/auth/google/callback` for local dev) |
| `SESSION_SECRET` | Random string for encrypting session cookies (use a long value in production) |
| `FRONTEND_URL` | Frontend origin for CORS and OAuth redirects (default: `http://localhost:5173`) |
| `PORT` | *(optional)* Backend port (default: `3001`) |
| `BACKEND_URL` | Public URL of the API (required for WhatsApp Google sign-in links) |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API access token from Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from Meta WhatsApp setup |
| `WHATSAPP_VERIFY_TOKEN` | Random string you choose for webhook verification |
| `WHATSAPP_APP_SECRET` | *(optional)* Meta app secret for webhook signature validation |

Never commit `.env` — it is gitignored. Only `.env.example` belongs in the repo.

### 3. Run the app

Start the API server and Vite dev server together:

```bash
npm run dev:all
```

Or run them separately:

```bash
npm run dev:server   # Express API on http://localhost:3001
npm run dev          # Vite frontend on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173), sign in with Google, and describe an event.

### Example prompts

- “Team standup tomorrow at 9am for 15 minutes”
- “Dentist next Tuesday at 3pm, 1 hour, on my personal calendar”
- “Soccer practice Saturday 10am for 90 minutes on the family calendar”
- After an event is shown: “change it to 4pm” or “make it 45 minutes”

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Run frontend and backend concurrently |
| `npm run dev` | Vite dev server only |
| `npm run dev:server` | Express API with hot reload |
| `npm run build` | Typecheck and build frontend to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run start:server` | Run API without watch mode |

## Project structure

```
meetli/
├── server/           # Express API (parse, auth, calendar, WhatsApp)
│   ├── index.ts      # Routes and session setup
│   ├── parseEvent.ts # OpenAI event extraction
│   ├── googleAuth.ts # Google OAuth helpers
│   ├── whatsapp/     # WhatsApp webhook and message handling
│   └── ...
├── src/              # React frontend
│   ├── components/   # Chat UI, auth button, event cards
│   ├── services/     # API client calls
│   └── ...
├── .env.example      # Environment variable template
└── vite.config.ts    # Dev proxy to backend (/parse, /auth, /calendar)
```

## WhatsApp bot

Meetli can run as a WhatsApp bot using the [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api). Users message the bot in natural language, review the parsed event, sign in with Google via a link, and add events to their calendar.

### Meta app setup

1. In [Meta for Developers](https://developers.facebook.com/), open your app and add the **WhatsApp** product.
2. Under **WhatsApp → API Setup**, copy:
   - **Temporary access token** (or create a permanent System User token for production)
   - **Phone number ID**
3. Under **App settings → Basic**, copy the **App secret** (optional but recommended).
4. Set webhook URL to your public backend:
   ```
   https://YOUR_PUBLIC_URL/webhooks/whatsapp
   ```
   Subscribe to the **messages** field.
5. Set **Verify token** to the same value as `WHATSAPP_VERIFY_TOKEN` in `.env`.
6. Add `BACKEND_URL=https://YOUR_PUBLIC_URL` so Google sign-in links work in chat.

**Local development:** Meta cannot reach `localhost`. Use [ngrok](https://ngrok.com/) (or similar) to expose port 3001, then set `BACKEND_URL` to the ngrok HTTPS URL.

### WhatsApp conversation flow

```
You: Team standup tomorrow at 9am for 15 minutes
Bot: Here's what I understood: … [Add to calendar]
You: (tap Add, or reply "add")
Bot: ✅ Added to your calendar! View: https://...
```

- Reply with corrections ("make it 4pm") to refine the event.
- Reply `new` to start over.
- First-time users get a Google sign-in link before events can be added.

### WhatsApp API routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/webhooks/whatsapp` | Meta webhook verification |
| `POST` | `/webhooks/whatsapp` | Incoming WhatsApp messages |
| `GET` | `/auth/google/whatsapp?waId=…` | Google OAuth for a WhatsApp user |

User tokens and chat state are stored in `data/whatsapp-users.json` (gitignored).

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/google` | Start Google OAuth flow |
| `GET` | `/auth/google/callback` | OAuth callback (handled by backend) |
| `GET` | `/auth/status` | Check if user is signed in |
| `POST` | `/auth/logout` | End session |
| `POST` | `/parse` | Parse natural language into event fields |
| `POST` | `/calendar/events` | Create event in Google Calendar (requires auth) |

In development, the Vite dev server proxies these paths to `localhost:3001`.

## Production notes

- Set `NODE_ENV=production` so session cookies use the `secure` flag.
- Use a strong, unique `SESSION_SECRET`.
- Update `FRONTEND_URL`, `GOOGLE_REDIRECT_URI`, and Google Cloud authorized origins/redirect URIs for your deployed URLs.
- Serve the built frontend (`dist/`) and run the Express server, or deploy frontend and backend separately with matching CORS/proxy configuration.
