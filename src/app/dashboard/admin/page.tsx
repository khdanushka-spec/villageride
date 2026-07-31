import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { Building2, Car, CircleDollarSign, Clock, Users, Wifi, WifiOff } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminOverviewPage() {
  await requireSuperAdminSession();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalDrivers,
    totalCustomers,
    totalAssociations,
    todaysTrips,
    pendingApprovals,
    onlineDrivers,
    offlineDrivers,
    completedTrips,
  ] = await Promise.all([
    prisma.driver.count(),
    prisma.customer.count(),
    prisma.association.count(),
    prisma.trip.count({ where: { requestedAt: { gte: todayStart } } }),
    prisma.driver.count({ where: { status: "PENDING" } }),
    prisma.driver.count({ where: { isOnline: true, status: "APPROVED" } }),
    prisma.driver.count({ where: { isOnline: false, status: "APPROVED" } }),
    prisma.trip.findMany({ where: { status: "COMPLETED" }, select: { finalFare: true, completedAt: true } }),
  ]);

  const totalRevenue = completedTrips.reduce((sum, t) => sum + Number(t.finalFare ?? 0), 0);

  const daily: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const amount = completedTrips
      .filter((t) => t.completedAt && t.completedAt >= day && t.completedAt < next)
      .reduce((sum, t) => sum + Number(t.finalFare ?? 0), 0);
    daily.push({ date: day.toLocaleDateString("en-LK", { weekday: "short" }), amount });
  }

  const stats = [
    { label: "Total drivers", value: totalDrivers, icon: Car },
    { label: "Total customers", value: totalCustomers, icon: Users },
    { label: "Associations", value: totalAssociations, icon: Building2 },
    { label: "Today's trips", value: todaysTrips, icon: Clock },
    { label: "Pending approvals", value: pendingApprovals, icon: Clock },
    { label: "Online drivers", value: onlineDrivers, icon: Wifi },
    { label: "Offline drivers", value: offlineDrivers, icon: WifiOff },
    { label: "Total revenue", value: `LKR ${totalRevenue.toLocaleString()}`, icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
        <p className="text-sm text-muted-foreground">Across every association on V Rides.</p>
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

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-medium">Revenue — last 7 days</h3>
        <EarningsChart data={daily} label="Revenue" />
      </div>
    </div>
  );
}
