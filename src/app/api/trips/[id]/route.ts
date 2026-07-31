import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expireStaleTrip } from "@/lib/dispatch";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      customer: { select: { userId: true } },
      driver: {
        select: {
          userId: true,
          currentLat: true,
          currentLng: true,
          ratingAvg: true,
          user: { select: { name: true, phone: true, avatarUrl: true } },
        },
      },
      vehicle: { select: { make: true, model: true, color: true, plateNumber: true, type: true } },
    },
  });

  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCustomer = trip.customer.userId === session.user.id;
  const isDriver = trip.driver?.userId === session.user.id;
  if (!isCustomer && !isDriver && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = await expireStaleTrip(trip);

  return NextResponse.json({
    id: trip.id,
    status,
    pickupAddress: trip.pickupAddress,
    dropoffAddress: trip.dropoffAddress,
    pickupLat: trip.pickupLat,
    pickupLng: trip.pickupLng,
    dropoffLat: trip.dropoffLat,
    dropoffLng: trip.dropoffLng,
    distanceKm: trip.distanceKm,
    durationMin: trip.durationMin,
    estimatedFare: trip.estimatedFare,
    finalFare: trip.finalFare,
    vehicleType: trip.vehicleType,
    paymentMethod: trip.paymentMethod,
    paymentStatus: trip.paymentStatus,
    requestedAt: trip.requestedAt,
    acceptedAt: trip.acceptedAt,
    arrivedAt: trip.arrivedAt,
    startedAt: trip.startedAt,
    completedAt: trip.completedAt,
    cancelledAt: trip.cancelledAt,
    driver: trip.driver
      ? {
          name: trip.driver.user.name,
          phone: trip.driver.user.phone,
          avatarUrl: trip.driver.user.avatarUrl,
          rating: trip.driver.ratingAvg,
          currentLat: trip.driver.currentLat,
          currentLng: trip.driver.currentLng,
        }
      : null,
    vehicle: trip.vehicle,
  });
}
