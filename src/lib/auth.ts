import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { verifyOtp } from "@/lib/otp";

const providers: Provider[] = [
  Credentials({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const email = raw?.email as string | undefined;
      const password = raw?.password as string | undefined;
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user || !user.passwordHash || !user.isActive) return null;

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return null;

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      return { id: user.id, name: user.name, email: user.email, role: user.role, locale: user.locale };
    },
  }),
  Credentials({
    id: "phone-otp",
    name: "Phone OTP",
    credentials: {
      phone: { label: "Phone", type: "text" },
      code: { label: "Code", type: "text" },
      name: { label: "Name", type: "text" },
      intent: { label: "Intent", type: "text" },
    },
    async authorize(raw) {
      const phone = raw?.phone as string | undefined;
      const code = raw?.code as string | undefined;
      const name = raw?.name as string | undefined;
      const intent = (raw?.intent as string | undefined) === "register" ? "register" : "login";
      if (!phone || !code) return null;

      const purpose = intent === "register" ? "REGISTER" : "LOGIN";
      const result = await verifyOtp(phone, purpose, code);
      if (!result.ok) return null;

      let user = await prisma.user.findUnique({ where: { phone } });

      if (!user) {
        if (intent !== "register" || !name) return null;
        user = await prisma.user.create({
          data: {
            phone,
            name,
            role: "CUSTOMER",
            phoneVerifiedAt: new Date(),
            customerProfile: { create: { wallet: { create: { ownerType: "CUSTOMER", balance: 0 } } } },
          },
        });
      } else if (!user.isActive) {
        return null;
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), phoneVerifiedAt: user.phoneVerifiedAt ?? new Date() },
        });
      }

      return { id: user.id, name: user.name, email: user.email, role: user.role, locale: user.locale };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({ allowDangerousEmailAccountLinking: true }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
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
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          const created = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? "New customer",
              avatarUrl: user.image,
              role: "CUSTOMER",
              emailVerifiedAt: new Date(),
              customerProfile: { create: { wallet: { create: { ownerType: "CUSTOMER", balance: 0 } } } },
            },
          });
          user.id = created.id;
          user.role = created.role;
          user.locale = created.locale;
        } else {
          user.id = existing.id;
          user.role = existing.role;
          user.locale = existing.locale;
        }
      }
      return true;
    },
  },
});
