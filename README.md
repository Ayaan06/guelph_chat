# Google login with NextAuth + Prisma

Next.js App Router project wired to Google OAuth via NextAuth, persisting users/sessions/accounts with Prisma (Postgres-ready for Vercel).

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
```

4) Configure Google OAuth credentials (console.cloud.google.com):

- Create OAuth Client ID (Web).
- Authorized redirect URI (local): `http://localhost:3000/api/auth/callback/google`
- On Vercel: `https://your-domain.vercel.app/api/auth/callback/google`

5) Run locally:

```bash
npm run dev
```

Open `http://localhost:3000/login` to sign in with Google. Auth state is available server-side via `getServerSession` and client-side via `SessionProvider`.

## Key files

- `app/api/auth/[...nextauth]/route.ts` – NextAuth handler using the Prisma adapter and Google provider.
- `lib/auth.ts` – NextAuth options (providers, session strategy, callbacks).
- `prisma/schema.prisma` – Models for users, accounts, sessions, verification tokens.
- `app/login/page.tsx` – Login screen with Google sign-in.
- `app/page.tsx` – Authenticated landing page example that redirects to `/login` when signed out.
