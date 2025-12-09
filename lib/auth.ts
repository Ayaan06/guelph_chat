import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

export type AppSession = {
  expires: string;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username?: string | null;
  };
};

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        username: { label: "Username", type: "text" },
        name: { label: "Name", type: "text" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "hidden" },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const action = credentials.action === "signup" ? "signup" : "login";
        const email = credentials.email?.toLowerCase().trim();
        const username = credentials.username?.trim();
        const name = credentials.name?.trim() || null;
        const password = credentials.password;

        if (!password) {
          throw new Error("Password is required");
        }

        if (action === "signup") {
          if (!email || !username) {
            throw new Error("Username, email, and password are required.");
          }

          const existing = await prisma.user.findFirst({
            where: {
              OR: [{ email }, { username }],
            },
          });

          if (existing) {
            throw new Error(
              "Account already exists, please log in or use Google.",
            );
          }

          const passwordHash = await bcrypt.hash(password, 10);

          const newUser = await prisma.user.create({
            data: {
              email,
              username,
              name,
              passwordHash,
            },
          });

          return newUser;
        }

        if (!email && !username) {
          throw new Error("Email or username is required to log in.");
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              ...(email ? [{ email }] : []),
              ...(username ? [{ username }] : []),
            ],
          },
        });

        if (!user?.passwordHash) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return user;
      },
    }),
  ],
  session: {
    strategy: "database" as const,
  },
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const dbUser = user as {
        id: string;
        username?: string | null;
        email?: string | null;
      };

      if (account?.provider === "google" && !dbUser.username) {
        const emailLocal = (dbUser.email ?? profile?.email ?? "")
          .split("@")[0]
          .replace(/[^a-zA-Z0-9_.]/g, "")
          .slice(0, 24);
        const base = emailLocal || "user";
        let candidate = base;
        let suffix = 0;

        // Ensure uniqueness without hammering the DB.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const existing = await prisma.user.findUnique({
            where: { username: candidate },
            select: { id: true },
          });
          if (!existing) break;
          suffix += 1;
          candidate = `${base}${suffix}`;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { username: candidate },
        });
        dbUser.username = candidate;
      }
      return true;
    },
    session: async ({
      session,
      user,
    }: {
      session: AppSession;
      user: {
        id: string;
        username?: string | null;
        name?: string | null;
        email?: string | null;
      };
    }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.username = user.username ?? null;
        session.user.name = user.name ?? session.user.name ?? null;
        session.user.email = user.email ?? session.user.email ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
