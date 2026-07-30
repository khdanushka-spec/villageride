"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcileDriverCompliance } from "@/lib/enforce-compliance";
import { DRIVER_STATUS_LABELS } from "@/lib/compliance";

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
