# Google + credentials auth with NextAuth + Prisma

Next.js App Router project wired to Google OAuth and credentials sign-in via NextAuth, persisting users/sessions/accounts with Prisma (Postgres-ready for Vercel).

## Setup

1) Install deps (already added to `package.json`, run if needed):

```bash
npm install
```

2) Environment variables (`.env`):

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require"
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

- Prisma/NextAuth must use the direct Postgres host on port 5432. Do not point `DATABASE_URL` at the Supabase pooler/PgBouncer (port 6543), because Prisma requires a session connection per request.
- If you keep a separate pooler URL for other tools, store it as `DATABASE_URL_POOLER` but never feed it to Prisma.
- In production set `NEXTAUTH_URL` to your canonical domain. Current deployment: `https://gryphchat.com`.

3) Apply the Prisma schema to your database:

```bash
npx prisma migrate dev --name init
# After adding the credentials fields run:
# npx prisma migrate dev --name add_credentials_auth
```

4) Seed the course catalog (reads `full_course_offerings.json` and upserts into `Course`):

```bash
npm run seed:courses
```

5) Configure Google OAuth credentials (console.cloud.google.com):

- Create OAuth Client ID (Web).
- Authorized redirect URI (local): `http://localhost:3000/api/auth/callback/google`
- Production: `https://gryphchat.com/api/auth/callback/google`

6) Run locally:

```bash
npm run dev
```

Open `http://localhost:3000/auth` to sign in with Google or credentials. Auth state is available server-side via `getServerSession` and client-side via `SessionProvider`.

## Deploy/build notes

- `npm run build` now runs `node scripts/maybe-run-migrations.js` before `next build`.
- The script attempts `prisma migrate deploy` only when `DATABASE_URL` is reachable; otherwise it logs and continues so Vercel builds don't fail when the database is offline.
- Set `SKIP_PRISMA_MIGRATE=1` in environments where you want to skip migrations during the build, and run `npx prisma migrate deploy` manually once the database is reachable.
- Use `DB_CONNECT_TIMEOUT_MS` (milliseconds) to tweak how long the reachability probe waits before skipping.

## Key files

- `app/api/auth/[...nextauth]/route.ts` – NextAuth handler using the Prisma adapter.
- `lib/auth.ts` – NextAuth options (Google + Credentials providers, session strategy, callbacks).
- `prisma/schema.prisma` – Models for users, accounts, sessions, verification tokens.
- `app/auth/page.tsx` – Auth screen with Google + credentials tabs.
- `app/page.tsx` – Public landing page with CTA to `/auth`.
- `app/login/page.tsx` – Redirects legacy `/login` to `/auth`.
