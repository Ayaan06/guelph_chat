# Google + credentials auth with NextAuth + Prisma

Next.js App Router project wired to Google OAuth and credentials sign-in via NextAuth, persisting users/sessions/accounts with Prisma (Postgres-ready for Vercel).

## Setup

1) Install deps (already added to `package.json`, run if needed):

```bash
npm install
```

2) Environment variables (`.env`):

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require&pgbouncer=true&connection_limit=1"
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

- For Vercel Postgres, copy the `Prisma` connection string from the dashboard and append `&pgbouncer=true&connection_limit=1` for serverless.

3) Apply the Prisma schema to your database:

```bash
npx prisma migrate dev --name init
# After adding the credentials fields run:
# npx prisma migrate dev --name add_credentials_auth
```

4) Configure Google OAuth credentials (console.cloud.google.com):

- Create OAuth Client ID (Web).
- Authorized redirect URI (local): `http://localhost:3000/api/auth/callback/google`
- On Vercel: `https://your-domain.vercel.app/api/auth/callback/google`

5) Run locally:

```bash
npm run dev
```

Open `http://localhost:3000/auth` to sign in with Google or credentials. Auth state is available server-side via `getServerSession` and client-side via `SessionProvider`.

## Key files

- `app/api/auth/[...nextauth]/route.ts` – NextAuth handler using the Prisma adapter.
- `lib/auth.ts` – NextAuth options (Google + Credentials providers, session strategy, callbacks).
- `prisma/schema.prisma` – Models for users, accounts, sessions, verification tokens.
- `app/auth/page.tsx` – Auth screen with Google + credentials tabs.
- `app/page.tsx` – Public landing page with CTA to `/auth`.
- `app/login/page.tsx` – Redirects legacy `/login` to `/auth`.
