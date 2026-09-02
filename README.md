# ENN Consultancy — Session Registration Platform

A production-ready registration and seat-management system for ENN Consultancy
awareness and training sessions.

It is not a form. Sessions have a real lifecycle, seats are allocated through an
atomic database transaction that cannot overbook, completed sessions close
themselves without administrator action, and every rule the browser enforces for
usability is enforced again on the server, which is the only authority.

---

## Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Session lifecycle](#session-lifecycle)
- [Seat allocation and overbooking](#seat-allocation-and-overbooking)
- [Running locally](#running-locally)
- [Firebase setup](#firebase-setup)
- [Environment variables](#environment-variables)
- [Deploying to Vercel](#deploying-to-vercel)
- [Testing](#testing)
- [Project structure](#project-structure)

---

## What it does

**For registrants**

- A four-step registration flow: about you, contact details, choose a session, review.
- Phone numbers validated and normalised to E.164, with Indian mobile numbers
  accepted with or without the country code.
- A WhatsApp question that reveals an additional number field only when needed.
- Email validation stricter than `type="email"` — `abc@gmail` and `abc@.com` are rejected.
- A session picker combining a keyboard-navigable month calendar with detailed
  session cards showing live seat availability.
- Completed and cancelled sessions appear muted, struck through and unselectable,
  and explain themselves when clicked.
- A review step with per-section edit links, then a confirmation screen with a
  registration reference, calendar download and printable confirmation.

**For administrators**

- Password-protected dashboard with capacity and registration statistics.
- Create, edit, cancel and delete sessions, with a live preview rendered by the
  exact component registrants see.
- Registration records with search across name, company, email, phone and
  reference, filters by session and status, and CSV export.

---

## Architecture

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript in strict mode |
| Styling | Tailwind CSS v4, with design tokens defined in `globals.css` |
| Backend | Next.js route handlers |
| Validation | Zod schemas shared by client and server |
| Database | Firebase Firestore via the Admin SDK |
| Auth | Firebase Authentication, or environment credentials |
| Hosting | Vercel |

### The storage port

All persistence sits behind one interface, `SessionStore`
(`src/lib/db/types.ts`), with two implementations:

- **`firestore.ts`** — the production adapter. Real `runTransaction` calls, real
  atomic seat allocation. Used automatically whenever the three `FIREBASE_*`
  Admin variables are present.
- **`local.ts`** — a server-side, file-backed development store guarded by a
  serialised mutex with atomic temp-file-and-rename writes. It exists so the
  application is completely functional — and its concurrency behaviour genuinely
  testable — before a Firebase project has been provisioned.

Both adapters call the same guard functions in `src/lib/db/guard.ts`, so the
validation, duplicate detection, seat-claim and status-transition rules are
defined exactly once. No business logic branches on which database is active.

The local store is a development convenience, not a shortcut: it is server-side,
never `localStorage`, and the admin dashboard shows a banner whenever it is in use.

---

## Session lifecycle

Status is derived, in one place — `computeSessionView()` in
`src/lib/sessions/status.ts` — and used identically by the UI, the API and the
seat-allocation transaction.

```
1. Explicitly cancelled by an administrator  -> CANCELLED
2. End time has passed                       -> COMPLETED
3. Seats exhausted                           -> FULL
4. Inactive, or registration deadline passed -> UPCOMING
5. Otherwise                                 -> OPEN
```

Only `OPEN` accepts registrations.

Because `COMPLETED` is computed from the clock, a session closes itself the
moment its end time passes — no administrator action, no scheduled job. The
stored `status` field still exists so an administrator can force `CANCELLED`.

### Timezones

Sessions are authored as a wall-clock date and time plus an IANA timezone
(`Asia/Kolkata` by default, configurable per session). Those are converted once
to absolute UTC instants (`startAt`, `endAt`) for storage and comparison, and
always formatted back in the session's own timezone for display.

The browser's local timezone is never used to decide whether a session has
completed. A visitor in London sees an Indian session close at the correct
Indian time.

---

## Seat allocation and overbooking

The frontend's view of availability is a hint. It is never trusted.

Every registration runs inside a single database transaction that:

1. Re-reads the session document.
2. Re-validates status, timing and capacity against the current clock.
3. Checks a deterministic `(sessionId + email)` key for a duplicate.
4. Increments `registeredCount` and flips `status` to `FULL` at capacity.
5. Allocates the next registration reference from a counter.
6. Writes the registration.

In Firestore this is `runTransaction`. When two clients contend for the final
seat, Firestore aborts and retries the loser, which then re-reads a full session
and fails cleanly with `SESSION_FULL`. The duplicate key uses `tx.create()`,
which fails if the document already exists, closing the double-submit race.

The experience of losing that race is handled deliberately: the wizard refreshes
availability, clears the selection, returns to the session step, and shows
*"Unfortunately, this session just became full. Please choose another available
session."*

Verified behaviour: 12 simultaneous HTTP registrations for 3 remaining seats
produced exactly 3 confirmations and 9 clean rejections, with a final count of
25/25 — never 26.

---

## Running locally

Requires Node.js 20 or newer.

```bash
npm install
npm run seed
npm run dev
```

Open <http://localhost:3000>.

`npm run seed` loads realistic demo data — sessions with plenty of seats, one
nearly full, one completely full, two already completed and one cancelled — so
the entire experience is visible immediately, with no Firebase project required.

**Administrator access in development**

Without Firebase Authentication configured, the app accepts:

- Email: `admin@ennconsultancy.local`
- Password: `enn-admin-dev`

at <http://localhost:3000/admin>. These are refused in production.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run seed` | Load demo data into the active store (see warning below) |
| `npm run import:transition` | Import the completed ISO 9001:2026 transition session |
| `npm run test` | Run the test suite |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | HTTP checks against a running deployment |

> Do not run `npm run build` while `npm run dev` is running — both write to
> `.next`, and the dev server's chunk graph will be corrupted. If that happens,
> stop the dev server, delete `.next`, and restart.

> **`npm run seed` is destructive.** It deletes every session, registration and
> counter before writing demo data. Once the `FIREBASE_*` admin variables are
> configured it refuses to run without an explicit `npm run seed -- --force`,
> so it cannot wipe live registrations by accident.

All scripts load `.env.local` through `scripts/load-env.ts`, so they read and
write the same database the running application does. Without that, a script
would silently fall back to the local file store while the app used Firestore.

### Replacing the logo

The mark is a single file at `public/enn-logo.svg`, referenced by every
component through `LogoMark`. To use different artwork, replace that file —
nothing else needs changing. To use a raster original instead, drop it in as
`public/enn-logo.png` and change the `src` in
`src/components/brand/Logo.tsx`. `public/icon.svg` is the browser-tab icon and
is a copy of the same mark.

---

## Firebase setup

1. **Create a project** at <https://console.firebase.google.com>.

2. **Create a Firestore database.** Build → Firestore Database → Create
   database. Choose a location near your users, for example `asia-south1`.
   Start in production mode; the rules in this repository replace the defaults.

3. **Register a web app.** Project settings → General → Your apps → Web. Copy
   the config values into the `NEXT_PUBLIC_FIREBASE_*` variables.

4. **Create a service account.** Project settings → Service accounts → Generate
   new private key. From the downloaded JSON copy `project_id`, `client_email`
   and `private_key` into `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and
   `FIREBASE_PRIVATE_KEY`.

   Never commit that file. It is already covered by `.gitignore`.

5. **Enable Authentication.** Build → Authentication → Sign-in method → enable
   Email/Password. Add your administrator under Users, and list that address in
   `ADMIN_EMAILS`. Alternatively grant a custom claim:

   ```js
   await getAuth().setCustomUserClaims(uid, { admin: true });
   ```

6. **Deploy the security rules.**

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```

   `.firebaserc` already names the project, so `firebase use --add` is not
   needed. A Firestore database created in production mode already denies all
   client access; deploying puts that posture in version control rather than
   leaving it to a console default.

7. **Seed production data** (optional). With the Admin variables set in your
   shell, `npm run seed` writes to Firestore instead of the local store. It
   clears the collections first, so never run it against live data.

### What the rules enforce

`firestore.rules` denies all browser writes and all browser access to
registration data. Seat allocation happens exclusively in server-side code using
the Admin SDK, which bypasses rules by design. A malicious client therefore
cannot modify seat counts, raise capacity, forge a session, or read anyone's
registration.

### Indexes

**None are required.** Firestore needs a composite index whenever a query
filters on one field and sorts by another, and that index has to finish building
before the query works at all — a deployment dependency that breaks the admin
pages on a fresh project.

The one query that would have needed it (a session's registrations, newest
first) instead filters in Firestore and sorts in application code. The result
set is bounded by the session's seat capacity, so the cost is negligible and the
app runs against a brand-new Firestore project with no index build step.

`firestore.indexes.json` is therefore deliberately empty.

---

## Environment variables

The full annotated list is in [`.env.example`](.env.example). Copy it to
`.env.local` for development, and add the same keys to the Vercel project.

**Public — safe in the browser** (`NEXT_PUBLIC_` prefixed, bundled client-side):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` … `_APP_ID` | Firebase web config, for admin sign-in |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | Default timezone for new sessions |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO and Open Graph |

**Secret — server only.** Never `NEXT_PUBLIC_` prefixed, so Next.js will not
bundle them for the browser. In Vercel these are encrypted at rest:

| Variable | Purpose |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Admin SDK project |
| `FIREBASE_CLIENT_EMAIL` | Service account identity |
| `FIREBASE_PRIVATE_KEY` | Service account key (quoted; escaped newlines are restored at runtime) |
| `ADMIN_SESSION_SECRET` | Signs the admin session cookie — **required in production** |
| `ADMIN_EMAILS` | Comma-separated administrator addresses |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Fallback sign-in when Firebase Auth is not used |

Setting the three `FIREBASE_*` Admin variables is what switches the application
from the local development store to Firestore.

`ADMIN_SESSION_SECRET` is mandatory in production: without it the application
refuses to issue administrator sessions rather than falling back to a weak key.

---

## Deploying to Vercel

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, **Add New → Project**, and import it. The framework is detected
   automatically; no build settings need changing.
3. Under **Settings → Environment Variables**, add every variable from
   `.env.example` that applies, for Production and Preview.
   - Paste `FIREBASE_PRIVATE_KEY` complete with its `BEGIN`/`END` lines. Vercel
     stores the newlines escaped; the application restores them at runtime.
   - Generate `ADMIN_SESSION_SECRET` with
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. **Deploy.**
5. Set `NEXT_PUBLIC_SITE_URL` to the final deployment URL and redeploy, so the
   SEO metadata is correct.
6. Add the Vercel domain to Firebase → Authentication → Settings → Authorized
   domains.

### Production verification checklist

- [ ] The home page lists sessions with correct seat counts.
- [ ] `/register` completes end to end and issues a reference.
- [ ] The registration appears in Firestore under `registrations`.
- [ ] `registeredCount` on the session increased by exactly one.
- [ ] Registering the same email twice for one session is refused.
- [ ] A full session shows *Session Full* and cannot be selected.
- [ ] A session whose end time has passed shows *Completed* with no admin action.
- [ ] `/admin` redirects to the login page when signed out.
- [ ] `/api/admin/registrations` returns 401 when signed out.
- [ ] Administrator sign-in works, and create/edit/cancel all work.
- [ ] CSV export downloads.
- [ ] The admin dashboard shows **no** local-store banner, confirming Firestore.
- [ ] The layout is correct on a phone, with no horizontal scrolling.
- [ ] Keyboard-only navigation reaches every control, including the calendar.

---

## Testing

```bash
npm run test
```

The suites in `tests/` cover validation, phone and email normalisation, the
status engine, timezone conversion, the capacity countdown, duplicate protection
and concurrent seat contention against a real store.

The live HTTP surface can be verified against any running deployment:

```bash
npm run verify                                   # against localhost:3000
BASE_URL=https://your-app.vercel.app npm run verify
```

It checks page responses, session listing, a real registration, every rejection
path (invalid email, invalid phone, missing WhatsApp number, full, completed,
cancelled and unknown sessions), and that no registrant data or raw database
detail is exposed. Supplying `ADMIN_EMAIL` and `ADMIN_PASSWORD` adds the
administrator sign-in, read and sign-out checks.

Because it creates real registrations, run it against a preview deployment or
straight after seeding.

---

## Project structure

```
src/
  app/
    page.tsx                  Landing page
    register/                 Registration wizard and success page
    admin/
      login/                  Public sign-in
      (dashboard)/            Auth-gated: overview, sessions, registrations
    api/
      sessions/               Public session listing
      register/               Registration endpoint (the authority)
      admin/                  Auth-gated admin endpoints
  components/
    brand/  ui/  sessions/  registration/  admin/
  lib/
    config.ts                 Business constants in one place
    time.ts                   Timezone-correct conversion and formatting
    phone.ts  email.ts        Normalisation and validation
    errors.ts                 Domain errors mapped to safe user messages
    validation/schemas.ts     Zod schemas shared by client and server
    sessions/
      status.ts               The status engine
      service.ts              Public service layer
      admin-service.ts        Admin service layer
      dto.ts                  Client-safe projection
    db/
      types.ts                The SessionStore port
      guard.ts                Shared transaction rules
      firestore.ts            Production adapter
      local.ts                Development adapter
      seed.ts                 Demo data
    auth/admin.ts             Administrator authentication
    firebase/                 Admin SDK and client SDK bootstrap
tests/                        Vitest suites
scripts/seed.ts               Seeding entry point
firestore.rules               Security rules
firestore.indexes.json        Required composite index
```
