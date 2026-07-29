import { prisma } from "@/lib/prisma";
import { requireAssociationForAdmin } from "@/lib/association-admin";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AssociationReportsPage() {
  const association = await requireAssociationForAdmin();

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const trips = await prisma.trip.findMany({
    where: { associationId: association.id, requestedAt: { gte: since } },
    select: { requestedAt: true, status: true },
  });

  const daily: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const count = trips.filter((t) => t.requestedAt >= day && t.requestedAt < next).length;
    daily.push({ date: day.toLocaleDateString("en-LK", { weekday: "short" }), amount: count });
  }

  const [totalDrivers, totalCustomerTrips, totalCompleted] = await Promise.all([
    prisma.driver.count({ where: { associationId: association.id } }),
    prisma.trip.count({ where: { associationId: association.id } }),
    prisma.trip.count({ where: { associationId: association.id, status: "COMPLETED" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Trip volume over the last 7 days.</p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href="/api/association/reports/trips.csv" download />}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total drivers", totalDrivers],
          ["Total rides", totalCustomerTrips],
          ["Completed rides", totalCompleted],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-medium">Rides per day</h3>
        <EarningsChart data={daily} label="Rides" currencyPrefix="" />
      </div>
    </div>
  );
}
