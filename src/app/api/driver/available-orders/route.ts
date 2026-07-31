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

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver || !driver.isOnline || driver.status !== "APPROVED") {
    return NextResponse.json({ orders: [] });
  }

  const orders = await prisma.order.findMany({
    where: {
      status: "READY_FOR_PICKUP",
      driverId: null,
      // A request this old will be auto-cancelled the next time the
      // customer's own screen polls it — don't let a driver accept it in
      // that same window.
      requestedAt: { gte: new Date(Date.now() - NO_DRIVER_TIMEOUT_MS) },
    },
    include: { vendor: { select: { name: true, addressLine: true, lat: true, lng: true } } },
    orderBy: { requestedAt: "asc" },
    take: 50,
  });

  // Only ever show orders actually within reach, nearest shop first —
  // without this a driver could see (and race to accept) a pickup on the
  // other side of the map. Falls back to unfiltered/unsorted if we don't
  // have a live position for this driver yet.
  const driverPos =
    driver.currentLat != null && driver.currentLng != null ? { lat: driver.currentLat, lng: driver.currentLng } : null;

  const withDistance = orders.map((o) => ({
    order: o,
    distanceToPickupKm: driverPos ? haversineKm(driverPos, { lat: o.vendor.lat, lng: o.vendor.lng }) : null,
  }));

  const nearby = driverPos
    ? withDistance
        .filter((o) => o.distanceToPickupKm! <= MAX_DISPATCH_RADIUS_KM)
        .sort((a, b) => a.distanceToPickupKm! - b.distanceToPickupKm!)
    : withDistance;

  return NextResponse.json({
    orders: nearby.slice(0, 20).map(({ order: o, distanceToPickupKm }) => ({
      id: o.id,
      vendorName: o.vendor.name,
      vendorAddress: o.vendor.addressLine,
      deliveryAddress: o.deliveryAddress,
      distanceKm: o.distanceKm,
      distanceToPickupKm,
      deliveryFee: o.deliveryFee,
      requestedAt: o.requestedAt,
    })),
  });
}
