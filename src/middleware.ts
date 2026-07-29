import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { ROLE_HOME, roleForSegment } from "@/lib/rbac";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  console.log(
    "[middleware-debug]",
    JSON.stringify({
      pathname,
      hasSession: !!session?.user,
      cookieHeader: req.headers.get("cookie"),
      cookieNames: req.cookies.getAll().map((c) => c.name),
    })
  );

  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const segment = pathname.split("/")[2] ?? "";
  const requiredRole = roleForSegment(segment);

  if (requiredRole && session.user.role !== requiredRole) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.user.role], req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
