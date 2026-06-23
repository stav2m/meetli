# Meetli

Create Google Calendar events from natural language. Describe a meeting in plain text, review the parsed details, refine them in chat, and add the event to your personal or family calendar.

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
├── server/           # Express API (parse, auth, calendar)
│   ├── index.ts      # Routes and session setup
│   ├── parseEvent.ts # OpenAI event extraction
│   ├── googleAuth.ts # Google OAuth helpers
│   └── ...
├── src/              # React frontend
│   ├── components/   # Chat UI, auth button, event cards
│   ├── services/     # API client calls
│   └── ...
├── .env.example      # Environment variable template
└── vite.config.ts    # Dev proxy to backend (/parse, /auth, /calendar)
```

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
