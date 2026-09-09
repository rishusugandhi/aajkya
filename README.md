# Flatmate Meal Planner

A shared meal-planning app for a household of 4 flatmates — lunch/dinner
only, Sunday is always cooking-off, tracks planned vs. actual meals,
30-day rotation memory, shared attendance, comments, and a derived
shopping list.

## Run locally

```bash
npm install
npm run build
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") npm run start
```

Or for development:

```bash
npm install
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" > .env.local
npm run dev
```

Open http://localhost:3000, sign up (first person becomes admin), then
have your 3 flatmates sign up too (capped at 4 per household).

## Deploy for free (get a real shareable link)

This app needs Node.js 22+ (for the built-in `node:sqlite` module) and a
filesystem that persists between requests — so **Vercel's default
serverless hosting won't keep your SQLite file** (its filesystem resets).
Use one of these instead, both free:

### Option A — Railway (easiest)
1. Push this folder to a new GitHub repo.
2. Go to railway.app → New Project → Deploy from GitHub repo.
3. Add an environment variable `SESSION_SECRET` (any long random string).
4. Add a Volume mounted at `/app/data` (Railway's free tier includes a
   small persistent volume) so the SQLite file survives restarts.
5. Deploy. Railway gives you a public `*.up.railway.app` URL — that's
   your shareable link.

### Option B — Fly.io
1. Install the `flyctl` CLI and run `fly launch` in this folder (it
   detects Next.js automatically).
2. Run `fly volumes create data --size 1` and mount it at `/app/data` in
   the generated `fly.toml`.
3. Set the secret: `fly secrets set SESSION_SECRET=$(openssl rand -hex 32)`
4. `fly deploy` — you'll get a `*.fly.dev` URL.

Both have generous free tiers that comfortably cover a 4-person
household app indefinitely.
