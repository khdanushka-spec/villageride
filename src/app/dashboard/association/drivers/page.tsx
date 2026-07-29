import { prisma } from "@/lib/prisma";
import { requireAssociationForAdmin } from "@/lib/association-admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DriverRowActions } from "@/components/association/driver-row-actions";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

export default async function AssociationDriversPage() {
  const association = await requireAssociationForAdmin();

  const drivers = await prisma.driver.findMany({
    where: { associationId: association.id },
    include: { user: { select: { name: true, email: true, phone: true } }, vehicles: { take: 1 } },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
        <p className="text-sm text-muted-foreground">Review applications and manage your association&apos;s drivers.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>
                  <p className="font-medium">{driver.user.name}</p>
                  <p className="text-xs text-muted-foreground">{driver.user.email ?? driver.user.phone}</p>
                </TableCell>
                <TableCell className="text-sm">
                  {driver.vehicles[0] ? VEHICLE_TYPE_LABELS[driver.vehicles[0].type] : "—"}
                </TableCell>
                <TableCell className="text-sm">{Number(driver.ratingAvg).toFixed(1)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[driver.status]}>{driver.status.toLowerCase()}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DriverRowActions driverId={driver.id} status={driver.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {drivers.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No drivers have registered yet.</p>
        )}
      </div>
    </div>
  );
}
