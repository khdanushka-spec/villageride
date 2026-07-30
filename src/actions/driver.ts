"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcileDriverCompliance } from "@/lib/enforce-compliance";
import { DRIVER_STATUS_LABELS } from "@/lib/compliance";
import { haversineKm } from "@/lib/routing";
import type { VehicleType } from "@prisma/client";

export async function toggleOnlineAction(isOnline: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return { error: "Driver profile not found." };

  // Always allow going offline. Going online re-checks every regulatory and
  // performance requirement first, so a lapsed document or a rating/
  // cancellation-rate breach blocks it even if the driver was APPROVED the
  // last time this ran.
  if (!isOnline) {
    await prisma.driver.update({ where: { id: driver.id }, data: { isOnline: false } });
    revalidatePath("/dashboard/driver");
    return { success: true };
  }

  const reconciled = await reconcileDriverCompliance(driver.id);
  if (reconciled.status !== "APPROVED") {
    revalidatePath("/dashboard/driver");
    return {
      error:
        reconciled.blockers[0]?.message ??
        `Your account isn't eligible right now (${DRIVER_STATUS_LABELS[reconciled.status]}).`,
    };
  }

  await prisma.driver.update({ where: { id: driver.id }, data: { isOnline: true } });
  revalidatePath("/dashboard/driver");
  return { success: true };
}

export async function updateDriverLocationAction(lat: number, lng: number) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  await prisma.driver.update({
    where: { userId: session.user.id },
    data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
  });
  return { success: true };
}

export async function getAvailableTripRequests() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return [];

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: { where: { isActive: true }, take: 1 } },
  });
  if (!driver || !driver.isOnline) return [];

  // A document can lapse or a performance threshold can be crossed while a
  // driver is already online — catch it here so they stop being offered new
  // trips the moment it happens, without waiting for a scheduled sweep.
  const reconciled = await reconcileDriverCompliance(driver.id);
  if (reconciled.status !== "APPROVED") return [];

  const vehicleType = driver.vehicles[0]?.type;
  if (!vehicleType) return [];

  return prisma.trip.findMany({
    where: { status: { in: ["REQUESTED", "SEARCHING"] }, driverId: null, vehicleType },
    include: { customer: { include: { user: { select: { name: true } } } } },
    orderBy: { requestedAt: "asc" },
    take: 20,
  });
}

const NEARBY_RADIUS_KM = 15;
// Drivers stop reporting position the moment they go offline or lose
// compliance (reconcileDriverCompliance forces isOnline: false), but a stale
// lastLocationAt still guards against showing someone whose browser tab died
// without a clean disconnect.
const STALE_LOCATION_MS = 2 * 60 * 1000;

export type NearbyDriver = { lat: number; lng: number; vehicleType: VehicleType };

/**
 * Online, approved, recently-seen drivers near a point — shown as anonymous
 * car icons on the customer's booking map before they've requested a ride,
 * the same "cars nearby" view Uber/Lyft show on their home screen.
 */
export async function getNearbyOnlineDrivers(lat: number, lng: number): Promise<NearbyDriver[]> {
  const session = await auth();
  if (!session?.user) return [];

  const drivers = await prisma.driver.findMany({
    where: {
      isOnline: true,
      status: "APPROVED",
      currentLat: { not: null },
      currentLng: { not: null },
      lastLocationAt: { gte: new Date(Date.now() - STALE_LOCATION_MS) },
    },
    include: { vehicles: { where: { isActive: true }, take: 1 } },
  });

  return drivers
    .filter((d) => d.vehicles[0])
    .map((d) => ({
      lat: d.currentLat!,
      lng: d.currentLng!,
      vehicleType: d.vehicles[0].type,
      distanceKm: haversineKm({ lat, lng }, { lat: d.currentLat!, lng: d.currentLng! }),
    }))
    .filter((d) => d.distanceKm <= NEARBY_RADIUS_KM)
    .map(({ lat, lng, vehicleType }) => ({ lat, lng, vehicleType }));
}
