import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config shared with middleware. Must never import Prisma,
 * bcrypt, or anything using node:crypto — middleware runs on the Edge
 * runtime by default and only needs to read/refresh the JWT, not talk to
 * the database.
 */
export const authConfig = {
  providers: [],
  trustHost: true,
  // Without this pinned explicitly, the Node (Server Actions) and Edge
  // (middleware) runtimes disagreed on whether the connection counted as
  // "secure," so one set `authjs.session-token` and the other only ever
  // looked for `__Secure-authjs.session-token` — every sign-in appeared to
  // immediately bounce back to /login.
  useSecureCookies: !!process.env.VERCEL,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.locale = user.locale;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.locale = token.locale;
      return session;
    },
  },
} satisfies NextAuthConfig;
