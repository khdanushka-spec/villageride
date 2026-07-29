import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_HOME, roleForSegment } from "@/lib/rbac";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

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
