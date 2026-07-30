import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  let navBadges: Record<string, number> | undefined;
  if (session.user.role === "ASSOCIATION_ADMIN") {
    const association = await prisma.association.findFirst({
      where: { admins: { some: { id: session.user.id } } },
    });
    if (association) {
      const pendingCount = await prisma.driver.count({
        where: {
          associationId: association.id,
          OR: [{ status: "PENDING" }, { documents: { some: { status: "PENDING" } } }],
        },
      });
      if (pendingCount > 0) navBadges = { "/dashboard/association/drivers": pendingCount };
    }
  }

  return (
    <DashboardShell
      role={session.user.role}
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? null,
        avatarUrl: session.user.image ?? null,
        roleLabel: ROLE_LABELS[session.user.role],
      }}
      navBadges={navBadges}
    >
      {children}
    </DashboardShell>
  );
}
