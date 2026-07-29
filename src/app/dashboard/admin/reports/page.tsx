import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { VehicleType } from "@prisma/client";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireSuperAdminSession();

  const [byVehicleType, byAssociation] = await Promise.all([
    prisma.trip.groupBy({ by: ["vehicleType"], _count: { _all: true } }),
    prisma.trip.groupBy({ by: ["associationId"], _count: { _all: true } }),
  ]);

  const associations = await prisma.association.findMany({
    where: { id: { in: byAssociation.map((r) => r.associationId).filter((id): id is string => !!id) } },
    select: { id: true, name: true },
  });
  const associationNames = new Map(associations.map((a) => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Platform-wide trip breakdowns.</p>
        </div>
        <Button variant="outline" nativeButton={false} render={<a href="/api/admin/reports/trips.csv" download />}>
          <Download className="h-4 w-4" />
          Export all trips (CSV)
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 font-medium">By vehicle type</h3>
          <div className="space-y-2">
            {byVehicleType.map((row) => (
              <div key={row.vehicleType} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{VEHICLE_TYPE_LABELS[row.vehicleType as VehicleType]}</span>
                <span className="font-medium">{row._count._all}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 font-medium">By association</h3>
          <div className="space-y-2">
            {byAssociation.map((row) => (
              <div key={row.associationId ?? "none"} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {row.associationId ? associationNames.get(row.associationId) : "Unassigned"}
                </span>
                <span className="font-medium">{row._count._all}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
