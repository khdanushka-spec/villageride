import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NO_DRIVER_TIMEOUT_MS, MAX_DISPATCH_RADIUS_KM } from "@/lib/dispatch";
import { haversineKm } from "@/lib/routing";

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
    take: 50,
  });

  // Only ever show requests actually within reach, nearest first — without
  // this a driver could see (and race to accept) a pickup on the other side
  // of the map. Falls back to unfiltered/unsorted if we don't have a live
  // position for this driver yet.
  const driverPos =
    driver.currentLat != null && driver.currentLng != null ? { lat: driver.currentLat, lng: driver.currentLng } : null;

  const withDistance = trips.map((t) => ({
    trip: t,
    distanceToPickupKm: driverPos ? haversineKm(driverPos, { lat: t.pickupLat, lng: t.pickupLng }) : null,
  }));

  const nearby = driverPos
    ? withDistance
        .filter((t) => t.distanceToPickupKm! <= MAX_DISPATCH_RADIUS_KM)
        .sort((a, b) => a.distanceToPickupKm! - b.distanceToPickupKm!)
    : withDistance;

  return NextResponse.json({
    isOnline: true,
    trips: nearby.slice(0, 20).map(({ trip: t, distanceToPickupKm }) => ({
      id: t.id,
      customerName: t.customer.user.name,
      pickupAddress: t.pickupAddress,
      dropoffAddress: t.dropoffAddress,
      distanceKm: t.distanceKm,
      distanceToPickupKm,
      estimatedFare: t.estimatedFare,
      requestedAt: t.requestedAt,
    })),
  });
}
