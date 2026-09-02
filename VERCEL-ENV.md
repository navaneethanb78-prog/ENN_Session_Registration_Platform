# Vercel environment variables

Every variable below must be added in **Vercel → Settings → Environment
Variables**, ticked for **Production** and **Preview**. Copy the values from
your local `.env.local`, which is deliberately not in the repository.

| Variable | Secret? | Where the value comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | no | Firebase console → Project settings → Your apps |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | no | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | no | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | no | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | no | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | no | same |
| `FIREBASE_PROJECT_ID` | **yes** | service-account JSON → `project_id` |
| `FIREBASE_CLIENT_EMAIL` | **yes** | service-account JSON → `client_email` |
| `FIREBASE_PRIVATE_KEY` | **yes** | service-account JSON → `private_key`, pasted whole |
| `ADMIN_SESSION_SECRET` | **yes** | generate a **new** one for production (see below) |
| `ADMIN_EMAILS` | no | the administrator address(es), comma separated |
| `SMTP_HOST` | no | `smtp.gmail.com` |
| `SMTP_PORT` | no | `587` |
| `SMTP_USER` | **yes** | the sending mailbox |
| `SMTP_PASSWORD` | **yes** | Gmail **App Password**, no spaces |
| `SMTP_FROM` | no | same address as `SMTP_USER` |
| `SMTP_FROM_NAME` | no | `ENN Consultancy` |
| `ADMIN_NOTIFICATION_EMAIL` | no | optional internal copy of each registration |
| `NEXT_PUBLIC_UPI_ID` | no | the UPI ID that receives payments |
| `NEXT_PUBLIC_UPI_PAYEE_NAME` | no | `ENN Consultancy` |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | no | `Asia/Kolkata` |
| `NEXT_PUBLIC_SITE_URL` | no | your live URL — set after the first deploy, then redeploy |

## Notes that matter

**Use a different `ADMIN_SESSION_SECRET` in production.** Generate one with:

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Sharing the development secret would mean a session cookie minted locally is
accepted by the live site.

**`FIREBASE_PRIVATE_KEY`** — paste the entire key including the `BEGIN`/`END`
lines. Vercel stores the newlines escaped and the application converts them back
at runtime. Do not reformat it.

**`NEXT_PUBLIC_*` values are baked in at build time.** Changing one has no
effect until you redeploy — this catches people out with `NEXT_PUBLIC_SITE_URL`.

**Leave `ADMIN_EMAIL` and `ADMIN_PASSWORD` unset in production** if you are
using Firebase Authentication. They are the fallback sign-in for when Firebase
Auth is not configured.

## After the first deploy

1. Set `NEXT_PUBLIC_SITE_URL` to the real URL and **redeploy**.
2. Firebase console → Authentication → Settings → **Authorized domains** → add
   the Vercel domain, or administrator sign-in will fail.
3. Deploy the Firestore rules if you have not already:

       firebase deploy --only firestore:rules

4. Run the deployment checks against the live site:

       BASE_URL=https://your-app.vercel.app npm run verify

   Note this creates a real registration, so run it before announcing the site.
