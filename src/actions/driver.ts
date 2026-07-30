"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcileDriverCompliance } from "@/lib/enforce-compliance";
import { DRIVER_STATUS_LABELS, EXPIRING_DOCUMENT_TYPES } from "@/lib/compliance";
import { haversineKm } from "@/lib/routing";
import { isTrustedBlobUrl } from "@/lib/storage";
import type { DocumentType, VehicleType } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

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

/**
 * Lets a driver replace one of their documents — the fix for both a
 * REJECTED document and a document that's simply expired (which, unlike a
 * rejection, doesn't otherwise give them anything to act on: it just holds
 * them offline with no path back except waiting for time to fix a licence-
 * age blocker or, for an actual document, contacting the association).
 * Resets the existing row to PENDING rather than creating a new one, so the
 * compliance engine's "find the approved one" check for this type can't
 * find a stale approved-but-expired row ahead of the fresh submission.
 */
// For these types, the compliance engine doesn't only look at the Document
// row — it separately checks an expiry field on Vehicle/Driver (set at
// registration time and otherwise never touched again). Resubmitting the
// document alone would leave that field stale, so a renewed-and-approved
// document would still show as expired. Keep both in sync.
const VEHICLE_EXPIRY_FIELD: Partial<Record<DocumentType, "insuranceExpiry" | "revenueLicenceExpiry" | "emissionTestExpiry" | "fitnessCertExpiry">> = {
  INSURANCE: "insuranceExpiry",
  REVENUE_LICENCE: "revenueLicenceExpiry",
  VEHICLE_EMISSION_TEST: "emissionTestExpiry",
  VEHICLE_FITNESS_CERTIFICATE: "fitnessCertExpiry",
};

export async function resubmitDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: { take: 1 } },
  });
  if (!driver) return { error: "Driver profile not found." };

  const type = formData.get("type") as DocumentType | null;
  const fileUrl = formData.get("fileUrl") as string | null;
  if (!type || !fileUrl || !isTrustedBlobUrl(fileUrl)) return { error: "Upload failed. Please try again." };

  const documentNumber = (formData.get("documentNumber") as string)?.trim() || undefined;
  const expiresAtRaw = formData.get("expiresAt") as string;
  if (EXPIRING_DOCUMENT_TYPES.includes(type) && !expiresAtRaw) {
    return { error: "Enter the new expiry date." };
  }
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : undefined;

  // The "held a licence for at least N years" compliance check reads
  // Driver.licenceIssuedAt directly, not the document's own expiry — a
  // renewed licence with a far-future expiry date still trips that block
  // forever unless the issue date is updated too.
  const licenceIssuedAtRaw = formData.get("licenceIssuedAt") as string;
  if (type === "DRIVER_LICENSE" && !licenceIssuedAtRaw) {
    return { error: "Enter the licence issue date." };
  }
  const licenceIssuedAt = licenceIssuedAtRaw ? new Date(licenceIssuedAtRaw) : undefined;

  const existing = await prisma.document.findFirst({ where: { driverId: driver.id, type } });

  if (existing) {
    await prisma.document.update({
      where: { id: existing.id },
      data: {
        fileUrl,
        status: "PENDING",
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
        uploadedAt: new Date(),
        ...(documentNumber ? { documentNumber } : {}),
        ...(expiresAt ? { expiresAt } : {}),
        ...(licenceIssuedAt ? { issuedAt: licenceIssuedAt } : {}),
      },
    });
  } else {
    await prisma.document.create({
      data: { driverId: driver.id, type, fileUrl, documentNumber, expiresAt, issuedAt: licenceIssuedAt },
    });
  }

  if (type === "DRIVER_LICENSE") {
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        ...(expiresAt ? { licenseExpiry: expiresAt } : {}),
        ...(licenceIssuedAt ? { licenceIssuedAt } : {}),
      },
    });
  }
  const vehicleField = VEHICLE_EXPIRY_FIELD[type];
  if (expiresAt && vehicleField && driver.vehicles[0]) {
    await prisma.vehicle.update({ where: { id: driver.vehicles[0].id }, data: { [vehicleField]: expiresAt } });
  }

  revalidatePath("/dashboard/driver/profile");
  revalidatePath("/dashboard/driver");
  return { success: "Submitted for your association to review." };
}
