import type { Role, Locale } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    locale: Locale;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      locale: Locale;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    locale: Locale;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    locale: Locale;
  }
}
