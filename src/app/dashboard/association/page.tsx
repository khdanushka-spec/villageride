import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAssociationForAdmin } from "@/lib/association-admin";
import { cn } from "@/lib/utils";
import { Car, CircleDollarSign, Clock, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AssociationOverviewPage() {
  const association = await requireAssociationForAdmin();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalDrivers, pendingApprovals, onlineDrivers, todaysTrips, completedTrips] = await Promise.all([
    prisma.driver.count({ where: { associationId: association.id } }),
    // Counts both brand-new applications and already-approved drivers with a
    // document resubmission awaiting review — either way, something needs
    // this association's attention right now.
    prisma.driver.count({
      where: {
        associationId: association.id,
        OR: [{ status: "PENDING" }, { documents: { some: { status: "PENDING" } } }],
      },
    }),
    prisma.driver.count({ where: { associationId: association.id, isOnline: true, status: "APPROVED" } }),
    prisma.trip.count({ where: { associationId: association.id, requestedAt: { gte: todayStart } } }),
    prisma.trip.findMany({ where: { associationId: association.id, status: "COMPLETED" }, select: { finalFare: true } }),
  ]);

  const totalRevenue = completedTrips.reduce((sum, t) => sum + Number(t.finalFare ?? 0), 0);
  const commissionEarned = totalRevenue * (Number(association.commissionPercent) / 100);

  const stats = [
    { label: "Total drivers", value: totalDrivers, icon: Users, href: "/dashboard/association/drivers" },
    {
      label: "Pending approvals",
      value: pendingApprovals,
      icon: Clock,
      href: "/dashboard/association/drivers?status=review",
      highlight: pendingApprovals > 0,
    },
    { label: "Online now", value: onlineDrivers, icon: Car, href: "/dashboard/association/drivers" },
    { label: "Commission earned", value: `LKR ${commissionEarned.toLocaleString()}`, icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{association.name}</h1>
        <p className="text-sm text-muted-foreground">{association.district} · {todaysTrips} rides today</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const card = (
            <div
              className={cn(
                "relative rounded-2xl border p-5 transition-colors",
                stat.highlight
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card",
                stat.href && "hover:border-primary/40"
              )}
            >
              {stat.highlight && (
                <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
              )}
              <stat.icon className={cn("h-5 w-5", stat.highlight ? "text-primary" : "text-primary")} />
              <p className="mt-3 text-2xl font-semibold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">
                {stat.label}
                {stat.highlight && <span className="ml-1 font-medium text-primary">· needs review</span>}
              </p>
            </div>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
