import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireSuperAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");
  return session.user;
}
