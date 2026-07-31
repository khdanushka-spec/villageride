import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NO_DRIVER_TIMEOUT_MS } from "@/lib/dispatch";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: { where: { isActive: true }, take: 1 } },
  });

  if (!driver || !driver.isOnline || driver.status !== "APPROVED") {
    return NextResponse.json({ trips: [], isOnline: driver?.isOnline ?? false });
  }

  const vehicleType = driver.vehicles[0]?.type;
  if (!vehicleType) return NextResponse.json({ trips: [], isOnline: true });

  const trips = await prisma.trip.findMany({
    where: {
      status: { in: ["REQUESTED", "SEARCHING"] },
      driverId: null,
      vehicleType,
      // A request this old will be auto-cancelled the next time the
      // customer's own screen polls it — don't let a driver accept it in
      // that same window.
      requestedAt: { gte: new Date(Date.now() - NO_DRIVER_TIMEOUT_MS) },
    },
    include: { customer: { include: { user: { select: { name: true } } } } },
    orderBy: { requestedAt: "asc" },
    take: 20,
  });

  return NextResponse.json({
    isOnline: true,
    trips: trips.map((t) => ({
      id: t.id,
      customerName: t.customer.user.name,
      pickupAddress: t.pickupAddress,
      dropoffAddress: t.dropoffAddress,
      distanceKm: t.distanceKm,
      estimatedFare: t.estimatedFare,
      requestedAt: t.requestedAt,
    })),
  });
}
