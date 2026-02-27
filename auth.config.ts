import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    authorized({ auth: session, request }) {
      const nextUrl = request.nextUrl;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnSignup = nextUrl.pathname === "/signup";
      if (isOnDashboard) {
        return !!session?.user;
      }
      if ((isOnLogin || isOnSignup) && session?.user) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
