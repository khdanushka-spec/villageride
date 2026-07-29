import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ASSOCIATION_ADMIN: "Association Admin",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <DashboardShell
      role={session.user.role}
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? null,
        avatarUrl: session.user.image ?? null,
        roleLabel: ROLE_LABELS[session.user.role],
      }}
    >
      {children}
    </DashboardShell>
  );
}
