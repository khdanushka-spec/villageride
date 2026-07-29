import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TripHistoryTable, type HistoryTrip } from "@/components/dashboard/trip-history-table";

export const dynamic = "force-dynamic";

export default async function CustomerRidesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) redirect("/login");

  const trips = await prisma.trip.findMany({
    where: { customerId: customer.id },
    orderBy: { requestedAt: "desc" },
    include: { driver: { include: { user: { select: { name: true } } } } },
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
    counterpartName: t.driver?.user.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ride history</h1>
        <p className="text-sm text-muted-foreground">All your past and current rides.</p>
      </div>
      <TripHistoryTable trips={rows} counterpartLabel="Driver" />
    </div>
  );
}
