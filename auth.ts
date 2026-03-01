import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

// Use placeholder during Vercel build when env vars are not injected yet; runtime will use real secret.
const secret =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.VERCEL ? "build-placeholder-do-not-use-at-runtime" : undefined);
if (!secret) {
  throw new Error(
    "NEXTAUTH_SECRET (or AUTH_SECRET) is not set. Add it to .env — generate with: npx auth secret"
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret,
  trustHost: true, // Use request host for redirects so sign-in stays on cleaner-dispatch.vercel.app
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        let prisma;
        try {
          prisma = getPrisma();
          const user = await prisma.user.findUnique({
            where: { email },
          });
          if (!user || !user.password_hash) return null;
          const valid = await compare(password, user.password_hash);
          if (!valid) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.email,
            role: user.role,
          };
        } finally {
          if (prisma) await prisma.$disconnect();
        }
      },
    }),
  ],
});
