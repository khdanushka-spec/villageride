import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import type { VehicleType } from "@prisma/client";

export type HistoryTrip = {
  id: string;
  requestedAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType: VehicleType;
  finalFare: string | null;
  estimatedFare: string;
  status: string;
  counterpartName: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETED: "default",
  CANCELLED_BY_CUSTOMER: "destructive",
  CANCELLED_BY_DRIVER: "destructive",
};

export function TripHistoryTable({ trips, counterpartLabel }: { trips: HistoryTrip[]; counterpartLabel: string }) {
  if (trips.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No rides yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>{counterpartLabel}</TableHead>
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
              <TableCell className="max-w-64 text-sm">
                <p className="truncate">{trip.pickupAddress}</p>
                <p className="truncate text-muted-foreground">→ {trip.dropoffAddress}</p>
              </TableCell>
              <TableCell className="text-sm">{VEHICLE_TYPE_LABELS[trip.vehicleType]}</TableCell>
              <TableCell className="text-sm">{trip.counterpartName ?? "—"}</TableCell>
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
    </div>
  );
}
