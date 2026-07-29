import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config shared with middleware. Must never import Prisma,
 * bcrypt, or anything using node:crypto — middleware runs on the Edge
 * runtime by default and only needs to read/refresh the JWT, not talk to
 * the database.
 */
export const authConfig = {
  providers: [],
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
