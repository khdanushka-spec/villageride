import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TripHistoryTable, type HistoryTrip } from "@/components/dashboard/trip-history-table";

export const dynamic = "force-dynamic";

export default async function DriverRidesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) redirect("/login");

  const trips = await prisma.trip.findMany({
    where: { driverId: driver.id },
    orderBy: { requestedAt: "desc" },
    include: { customer: { include: { user: { select: { name: true } } } } },
  });

  const rows: HistoryTrip[] = trips.map((t) => ({
    id: t.id,
    requestedAt: t.requestedAt,
    pickupAddress: t.pickupAddress,
    dropoffAddress: t.dropoffAddress,
    vehicleType: t.vehicleType,
    finalFare: t.finalFare?.toString() ?? null,
    estimatedFare: t.estimatedFare.toString(),
    status: t.status,
    counterpartName: t.customer.user.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trip history</h1>
        <p className="text-sm text-muted-foreground">Every trip you&apos;ve driven.</p>
      </div>
      <TripHistoryTable trips={rows} counterpartLabel="Customer" />
    </div>
  );
}
