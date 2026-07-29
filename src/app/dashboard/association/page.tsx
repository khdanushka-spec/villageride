import { prisma } from "@/lib/prisma";
import { requireAssociationForAdmin } from "@/lib/association-admin";
import { Car, CircleDollarSign, Clock, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AssociationOverviewPage() {
  const association = await requireAssociationForAdmin();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalDrivers, pendingApprovals, onlineDrivers, todaysTrips, completedTrips] = await Promise.all([
    prisma.driver.count({ where: { associationId: association.id } }),
    prisma.driver.count({ where: { associationId: association.id, status: "PENDING" } }),
    prisma.driver.count({ where: { associationId: association.id, isOnline: true, status: "APPROVED" } }),
    prisma.trip.count({ where: { associationId: association.id, requestedAt: { gte: todayStart } } }),
    prisma.trip.findMany({ where: { associationId: association.id, status: "COMPLETED" }, select: { finalFare: true } }),
  ]);

  const totalRevenue = completedTrips.reduce((sum, t) => sum + Number(t.finalFare ?? 0), 0);
  const commissionEarned = totalRevenue * (Number(association.commissionPercent) / 100);

  const stats = [
    { label: "Total drivers", value: totalDrivers, icon: Users },
    { label: "Pending approvals", value: pendingApprovals, icon: Clock },
    { label: "Online now", value: onlineDrivers, icon: Car },
    { label: "Commission earned", value: `LKR ${commissionEarned.toLocaleString()}`, icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{association.name}</h1>
        <p className="text-sm text-muted-foreground">{association.district} · {todaysTrips} rides today</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
            <stat.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-semibold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
