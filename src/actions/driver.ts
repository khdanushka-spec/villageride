"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function toggleOnlineAction(isOnline: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return { error: "Driver profile not found." };
  if (driver.status !== "APPROVED") return { error: "Your account is not approved yet." };

  await prisma.driver.update({ where: { id: driver.id }, data: { isOnline } });
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
  if (!driver || !driver.isOnline || driver.status !== "APPROVED") return [];

  const vehicleType = driver.vehicles[0]?.type;
  if (!vehicleType) return [];

  return prisma.trip.findMany({
    where: { status: { in: ["REQUESTED", "SEARCHING"] }, driverId: null, vehicleType },
    include: { customer: { include: { user: { select: { name: true } } } } },
    orderBy: { requestedAt: "asc" },
    take: 20,
  });
}
