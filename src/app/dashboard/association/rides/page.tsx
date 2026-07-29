import { prisma } from "@/lib/prisma";
import { requireAssociationForAdmin } from "@/lib/association-admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETED: "default",
  CANCELLED_BY_CUSTOMER: "destructive",
  CANCELLED_BY_DRIVER: "destructive",
};

export default async function AssociationRidesPage() {
  const association = await requireAssociationForAdmin();

  const trips = await prisma.trip.findMany({
    where: { associationId: association.id },
    orderBy: { requestedAt: "desc" },
    take: 100,
    include: {
      customer: { include: { user: { select: { name: true } } } },
      driver: { include: { user: { select: { name: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rides</h1>
        <p className="text-sm text-muted-foreground">Every ride handled by your association&apos;s drivers.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Fare</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map((trip) => (
              <TableRow key={trip.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(trip.requestedAt)}
                </TableCell>
                <TableCell className="text-sm">{trip.customer.user.name}</TableCell>
                <TableCell className="text-sm">{trip.driver?.user.name ?? "—"}</TableCell>
                <TableCell className="text-sm">{VEHICLE_TYPE_LABELS[trip.vehicleType]}</TableCell>
                <TableCell className="text-sm font-medium">
                  LKR {Number(trip.finalFare ?? trip.estimatedFare).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[trip.status] ?? "secondary"}>
                    {trip.status.replaceAll("_", " ").toLowerCase()}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {trips.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No rides yet.</p>
        )}
      </div>
    </div>
  );
}
