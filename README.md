# Kindhands

Volunteer shift management for charities and events.

Organisations join the waitlist, get an email to set up their account, create shifts and share **one link**. Volunteers pick a shift with just their name and email (no account), get a confirmation and a reminder by email, and can cancel with one click. Coordinators check people in on the day and export volunteer hours for funders.

## What it does

| For organisations (dashboard) | For volunteers (public) |
|---|---|
| Waitlist → setup email → create organisation + admin account | Public sign-up page at `/o/your-org` |
| Overview: upcoming shifts, open spots, volunteers, hours this month | Book a shift with name + email, no account |
| Create, edit and delete shifts; repeat weekly | Confirmation email with a personal "view or cancel" link |
| See who's booked, add someone manually, remove someone (they're emailed) | Reminder email ~24 h before the shift |
| Check volunteers in → hours are recorded | Cancel from the email link; the spot frees up |
| Volunteers list with shifts + hours, CSV export, GDPR delete | |
| Team: invite coordinators/admins by email, roles and permissions | |
| Settings: organisation name and sign-up link | |

## Stack

| Part | Tech |
|---|---|
| Frontend | React 19, React Router 7, Vite, TypeScript, CSS Modules, Motion (animations) |
| Backend | Node 20+, Express 5, TypeScript |
| Validation | zod: **one schema shared** by frontend and backend (`shared/`) |
| Database | PostgreSQL. Locally it runs an **embedded Postgres (PGlite)**, so nothing to install |
| Email | Resend HTTPS API (or any SMTP provider via Nodemailer). Without either, emails go to a **dev mailbox** page |
| Auth | Email + password (scrypt hashing), server-side sessions in an httpOnly cookie |
| Tests | Vitest + Supertest (API, 30 tests on a real Postgres engine), React Testing Library (UI, 10 tests) |

## Run it locally

```bash
npm install
npm run dev          # API on :4000, web app on :5173
```

Then:

1. Open http://localhost:5173 and join the waitlist.
2. Open **http://localhost:5173/dev/mailbox** and click the link in the setup email.
3. Create your organisation, add a shift, and open your public sign-up page from the sidebar.
4. Sign up as a volunteer (use a private window), then check the mailbox again for the confirmation.

Data is stored in `server/.data` (delete the folder to start fresh).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + web app with hot reload |
| `npm test` | all API and UI tests |
| `npm run typecheck` | TypeScript checks for both apps |
| `npm run build` | production builds (`server/dist`, `client/dist`) |

## Architecture

```
client (React)  ──/api──▶  server (Express)
      │                       │
      └── shared/ (zod) ──────┘   routes → services → db (pg or PGlite)
                                   │          │
                                   │          └── mail (SMTP or dev outbox)
                                   └── jobs/reminders (every 5 min)
```

```
server/src
  routes/      HTTP layer: validation, auth guards, status codes
  services/    business logic (auth, waitlist, shifts, people) — no Express inside
  db/          one Db interface for real Postgres and embedded Postgres, schema
  mail/        mailer (SMTP / dev outbox) and email templates
  jobs/        reminder job
  middleware/  sessions, role checks, validation, errors
```

## Decisions worth knowing

- **No double-booking.** Booking runs in a transaction that locks the shift row (`SELECT … FOR UPDATE`), so two people can never take the last spot at the same moment. There's a test that fires two bookings at once.
- **Reminders are sent once.** The job marks bookings as reminded *before* sending, in a single `UPDATE … RETURNING`, so running it twice (or on two servers) never sends duplicates.
- **Email never breaks the main action.** A booking succeeds even if the mail server is down; failures are logged.
- **Data is separated per organisation.** Every query is scoped by `org_id`; tests check that another organisation gets a 404.
- **Roles.** Admins manage team and settings and can delete volunteer data; coordinators manage shifts and check-ins.
- **Security.** httpOnly + SameSite sessions, scrypt password hashing, rate limits on login/sign-up, honeypot fields against bots, identical replies to stop email probing, CSV export protected against spreadsheet-formula injection, `helmet` headers, invite links that expire after 14 days and work once.
- **GDPR.** Consent recorded on the waitlist, volunteers can be fully deleted, fonts self-hosted, data can be kept in the EU (choose EU regions when deploying).
- **Accessibility.** Real buttons and labels, error messages linked to fields, keyboard-friendly, inline confirmations instead of popups, reduced-motion support.

## API

| Method | Path | Who |
|---|---|---|
| `POST` | `/api/waitlist` | public |
| `GET` | `/api/auth/invites/:token` · `POST /api/auth/setup` · `POST /api/auth/accept-invite` | invite link |
| `POST` | `/api/auth/login` · `/api/auth/logout` · `GET /api/auth/me` | public |
| `GET` | `/api/public/orgs/:slug` · `POST /api/public/orgs/:slug/shifts/:id/signup` | volunteers |
| `GET` | `/api/public/signups/:token` · `POST …/cancel` | volunteer link |
| `GET` | `/api/dashboard` | team |
| `GET POST` | `/api/shifts` · `GET PUT DELETE /api/shifts/:id` | team |
| `POST DELETE` | `/api/shifts/:id/signups[/:signupId]` · `POST …/check-in` | team |
| `GET` | `/api/volunteers` · `/api/volunteers/export.csv` · `DELETE /api/volunteers/:id` (admin) | team |
| `GET` | `/api/team` · `POST /api/team/invites` (admin) · `DELETE /api/team/members/:id` (admin) | team |
| `PUT` | `/api/org` (admin) | team |

## Deploy

- **Database:** Neon or Supabase Postgres in an EU region. Set `DATABASE_URL`; tables are created on start.
- **API:** Render or Fly.io (EU region). Build `npm install && npm run build -w server`, start `npm run start -w server`. Set `NODE_ENV=production`, `APP_URL`, `CORS_ORIGINS`, `DATABASE_URL` and the `SMTP_*` settings (see `server/.env.example`).
- **Email:** set `RESEND_API_KEY`. Render's free plan blocks SMTP ports, so the HTTPS API is used instead of SMTP. Verify your sending domain so emails don't land in spam.
- **Web app:** Vercel or Netlify, root `client`, build `npm run build`, output `dist`, set `VITE_API_URL`, and add a rewrite of all paths to `/index.html` (single-page app).
- **Cookies across domains:** simplest is serving the API under the same domain (e.g. `/api` proxied to the API). If the API is on another domain, the session cookie needs `SameSite=None; Secure`.

## Roadmap

- Waitlist approval screen (today every waitlist sign-up is invited straight away)
- Password reset by email
- Edit notifications to booked volunteers when a shift's time changes
- Volunteer waitlist when a shift is full
- QR check-in for events
