# Deploying to Hostinger Business (Node.js hosting)

One Node process serves both the API and the built React app from the same origin — no separate static host or CORS setup needed. See [`../backend/src/app.js`](../backend/src/app.js): in production it serves `frontend/dist` as static files and falls back to `index.html` for client-side routes, with `/api/*` untouched.

## 1. Create the database

hPanel → **Databases → MySQL Databases** → create a database and a user, and note the host, database name, username, and password (Hostinger's MySQL host for Business plans is usually `localhost` from the Node app's perspective, but confirm what hPanel shows you — it isn't always `127.0.0.1`).

## 2. Create the Node.js app

hPanel → **Advanced → Node.js** → create an application:

- **Node.js version**: 20 LTS or newer.
- **Application root**: the folder you'll upload/clone the repo into (the repo root, containing `package.json`, `backend/`, `frontend/`, `packages/`).
- **Application startup file**: `backend/src/index.js`
- **Application URL**: your domain or subdomain.

Hostinger's Node.js app manager runs `npm install` from the application root and manages the process for you — this project's root `package.json` is an npm workspaces manager (`frontend`, `backend`, `packages/shared`), so a single `npm install` at the root installs and links all three.

## 3. Get the code onto the server

Either use hPanel's Git integration to deploy from your repository, or upload the files via SFTP/File Manager, into the application root you set above.

## 4. Set environment variables

In the Node.js app's **Environment variables** panel (do not commit a `.env` file with real secrets — `.env` is gitignored and must be created directly on the server, or supplied entirely through this panel):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` | from step 1 |
| `USE_MEMORY_STORE` | `false` (or unset) |
| `CLIENT_ORIGIN` | `https://yourdomain.com` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | generate real random values — e.g. `openssl rand -hex 32` — never reuse the local-dev placeholders |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | your Hostinger mailbox — see `.env.example` and hPanel → Emails → Mailboxes → Connect apps & devices for the exact host/port for your plan |

Leave `PORT` and `HOST` unset — Hostinger's Node.js app manager assigns and injects the real port itself, and (only in production) the app now lets real platform environment variables take priority over anything in a `.env` file that happens to be sitting on the server, specifically so this can't be clobbered.

## 5. Install, build, migrate

Via the app's **Run npm install** button (or its built-in terminal):

```bash
npm install
npm run build        # builds frontend/dist, which the API serves in production
npm run db:migrate    # creates/updates tables — safe to re-run, only applies new migrations
```

## 6. Start the app

Use the Node.js app manager's start/restart control. It runs the startup file you configured (`backend/src/index.js`) with the environment variables from step 4.

Confirm it's up:

```
GET https://yourdomain.com/health   → {"status":"ok",...}
GET https://yourdomain.com/         → the app's login page
```

## Redeploying after a code change

```bash
git pull   # or re-upload changed files
npm install
npm run build
npm run db:migrate
```

Then restart the app from hPanel. `npm run build` must run again any time frontend code changes — the API serves whatever is currently in `frontend/dist`, it doesn't rebuild on its own.

## SSL

Hostinger issues and renews a free SSL certificate for the domain automatically; no action needed beyond having the domain pointed at Hostinger.

## What NOT to do

- Don't commit `.env` or real secrets — `.gitignore` already excludes `.env`.
- Don't set `USE_MEMORY_STORE=true` in production — it's a local-dev-only fallback (data resets on every restart), and the app refuses to fall back to it silently in production if MySQL is unreachable at boot (see `backend/src/store/index.js`) rather than serving on fake data.
- Don't reuse the `local-dev-*` JWT secrets from `.env.example` — generate real ones.
