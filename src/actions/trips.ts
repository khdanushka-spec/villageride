"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateFareForVehicleType, toDecimal } from "@/lib/fare";
import type { TripStatus, VehicleType } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

const requestTripSchema = z.object({
  pickupAddress: z.string().min(1),
  pickupLat: z.coerce.number(),
  pickupLng: z.coerce.number(),
  dropoffAddress: z.string().min(1),
  dropoffLat: z.coerce.number(),
  dropoffLng: z.coerce.number(),
  vehicleType: z.string(),
  paymentMethod: z.string(),
});

export async function requestTripAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return { error: "You must be signed in as a customer to request a ride." };
  }

  const parsed = requestTripSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please choose a pickup, destination, and vehicle type." };
  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) return { error: "Customer profile not found." };

  const existingActive = await prisma.trip.findFirst({
    where: {
      customerId: customer.id,
      status: { in: ["REQUESTED", "SEARCHING", "ACCEPTED", "DRIVER_ARRIVED", "IN_PROGRESS"] },
    },
  });
  if (existingActive) return { error: "You already have an active ride in progress." };

  const pickup = { lat: data.pickupLat, lng: data.pickupLng };
  const dropoff = { lat: data.dropoffLat, lng: data.dropoffLng };
  const estimate = await estimateFareForVehicleType(pickup, dropoff, data.vehicleType as VehicleType);
  if (!estimate) return { error: "Pricing is not configured for that vehicle type yet." };

  const trip = await prisma.trip.create({
    data: {
      customerId: customer.id,
      vehicleType: data.vehicleType as VehicleType,
      pickupAddress: data.pickupAddress,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffAddress: data.dropoffAddress,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      distanceKm: toDecimal(estimate.distanceKm),
      durationMin: estimate.durationMin,
      estimatedFare: toDecimal(estimate.fare),
      currency: estimate.currency,
      paymentMethod: data.paymentMethod as "CASH" | "WALLET",
      status: "SEARCHING",
      statusEvents: { create: { status: "SEARCHING" } },
    },
  });

  revalidatePath("/dashboard/customer");
  return { success: trip.id };
}

export async function cancelTripAction(tripId: string, reason: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const trip = await prisma.trip.findUnique({ include: { customer: true, driver: true }, where: { id: tripId } });
  if (!trip) return { error: "Trip not found." };

  const isCustomer = session.user.role === "CUSTOMER" && trip.customer.userId === session.user.id;
  const isDriver = session.user.role === "DRIVER" && trip.driver?.userId === session.user.id;
  if (!isCustomer && !isDriver) return { error: "Not authorized." };

  if (!["REQUESTED", "SEARCHING", "ACCEPTED", "DRIVER_ARRIVED"].includes(trip.status)) {
    return { error: "This trip can no longer be cancelled." };
  }

  await prisma.$transaction([
    prisma.trip.update({
      where: { id: tripId },
      data: {
        status: isCustomer ? "CANCELLED_BY_CUSTOMER" : "CANCELLED_BY_DRIVER",
        cancelledAt: new Date(),
        cancellationReason: reason || null,
      },
    }),
    prisma.tripStatusEvent.create({
      data: { tripId, status: isCustomer ? "CANCELLED_BY_CUSTOMER" : "CANCELLED_BY_DRIVER", note: reason || null },
    }),
  ]);

  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/driver");
  return { success: "Trip cancelled." };
}

export async function acceptTripAction(tripId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: { where: { isActive: true }, take: 1 } },
  });
  if (!driver || driver.status !== "APPROVED") return { error: "Your driver account is not approved yet." };
  if (!driver.isOnline) return { error: "Go online before accepting rides." };

  const vehicle = driver.vehicles[0];
  if (!vehicle) return { error: "No active vehicle on file." };

  const result = await prisma.trip.updateMany({
    where: { id: tripId, driverId: null, status: { in: ["REQUESTED", "SEARCHING"] } },
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      associationId: driver.associationId,
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  if (result.count === 0) return { error: "This ride was already accepted by another driver." };

  await prisma.tripStatusEvent.create({ data: { tripId, status: "ACCEPTED" } });

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/customer");
  return { success: "Ride accepted." };
}

async function advanceTripStatus(
  tripId: string,
  from: TripStatus[],
  to: "DRIVER_ARRIVED" | "IN_PROGRESS" | "COMPLETED",
  extra?: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return { error: "Driver profile not found." };

  const result = await prisma.trip.updateMany({
    where: { id: tripId, driverId: driver.id, status: { in: from } },
    data: { status: to, ...extra },
  });
  if (result.count === 0) return { error: "Trip is not in the expected state." };

  await prisma.tripStatusEvent.create({ data: { tripId, status: to } });
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/customer");
  return { success: "Updated." };
}

export async function markDriverArrivedAction(tripId: string) {
  return advanceTripStatus(tripId, ["ACCEPTED"], "DRIVER_ARRIVED", { arrivedAt: new Date() });
}

export async function startTripAction(tripId: string) {
  return advanceTripStatus(tripId, ["DRIVER_ARRIVED"], "IN_PROGRESS", { startedAt: new Date() });
}

export async function completeTripAction(tripId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return { error: "Driver profile not found." };

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: driver.id, status: "IN_PROGRESS" },
    include: { customer: { include: { wallet: true } } },
  });
  if (!trip) return { error: "Trip is not in progress." };

  const finalFare = trip.estimatedFare;
  const association = trip.associationId
    ? await prisma.association.findUnique({ where: { id: trip.associationId } })
    : null;
  const commissionPercent = association ? Number(association.commissionPercent) : 10;
  const driverEarning = Number(finalFare) * (1 - commissionPercent / 100);

  await prisma.$transaction(async (tx) => {
    if (trip.paymentMethod === "WALLET") {
      const wallet = trip.customer.wallet;
      if (!wallet || Number(wallet.balance) < Number(finalFare)) {
        throw new Error("INSUFFICIENT_WALLET_BALANCE");
      }
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: finalFare } } });
      await tx.transaction.create({
        data: { walletId: wallet.id, tripId, type: "DEBIT", reason: "TRIP_PAYMENT", amount: finalFare },
      });
    }

    await tx.trip.update({
      where: { id: tripId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        finalFare,
        paymentStatus: trip.paymentMethod === "CASH" ? "COMPLETED" : "COMPLETED",
      },
    });
    await tx.tripStatusEvent.create({ data: { tripId, status: "COMPLETED" } });

    const driverWallet = await tx.wallet.upsert({
      where: { driverId: driver.id },
      update: {},
      create: { ownerType: "DRIVER", driverId: driver.id, balance: 0 },
    });
    await tx.wallet.update({ where: { id: driverWallet.id }, data: { balance: { increment: driverEarning } } });
    await tx.transaction.create({
      data: {
        walletId: driverWallet.id,
        tripId,
        type: "CREDIT",
        reason: "TRIP_EARNING",
        amount: toDecimal(driverEarning),
      },
    });

    await tx.driver.update({ where: { id: driver.id }, data: { totalTrips: { increment: 1 } } });
  });

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/customer");
  return { success: "Trip completed." };
}

const rateSchema = z.object({
  tripId: z.string(),
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function rateTripAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = rateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose a star rating." };

  const trip = await prisma.trip.findUnique({
    where: { id: parsed.data.tripId },
    include: { customer: true, driver: true },
  });
  if (!trip || trip.status !== "COMPLETED") return { error: "Trip is not completed yet." };

  const isCustomer = trip.customer.userId === session.user.id;
  const isDriver = trip.driver?.userId === session.user.id;
  if (!isCustomer && !isDriver) return { error: "Not authorized." };

  const toUserId = isCustomer ? trip.driver?.userId : trip.customer.userId;
  if (!toUserId) return { error: "Nothing to rate." };

  const existing = await prisma.rating.findUnique({
    where: { tripId_fromUserId: { tripId: trip.id, fromUserId: session.user.id } },
  });
  if (existing) return { error: "You already rated this trip." };

  await prisma.rating.create({
    data: {
      tripId: trip.id,
      fromUserId: session.user.id,
      toUserId,
      stars: parsed.data.stars,
      comment: parsed.data.comment || null,
    },
  });

  if (isCustomer && trip.driverId) {
    const agg = await prisma.rating.aggregate({
      where: { toUserId },
      _avg: { stars: true },
    });
    await prisma.driver.update({
      where: { id: trip.driverId },
      data: { ratingAvg: toDecimal(agg._avg.stars ?? 5) },
    });
  }

  revalidatePath("/dashboard/customer");
  revalidatePath("/dashboard/driver");
  return { success: "Thanks for rating your trip!" };
}
