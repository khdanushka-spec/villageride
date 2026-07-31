import { prisma } from "@/lib/prisma";

/**
 * How long a ride or delivery request waits for a driver before it's
 * auto-cancelled. There's no background job runner in this app (see
 * enforce-compliance.ts) — like everything else here, expiry is checked
 * opportunistically at the point something reads the request's status, not
 * on a schedule. In practice that means the customer's own polling of their
 * active trip/order is what actually triggers the transition.
 */
export const NO_DRIVER_TIMEOUT_MS = 5 * 60 * 1000;

export function msRemainingBeforeExpiry(requestedAt: Date): number {
  return Math.max(0, NO_DRIVER_TIMEOUT_MS - (Date.now() - requestedAt.getTime()));
}

/** Flips a trip still waiting for a driver to NO_DRIVERS_AVAILABLE once the
 * timeout has passed. Returns the trip's current status (updated if it just
 * expired). Guarded by a status-matched updateMany so concurrent pollers
 * can't double-fire the transition. */
export async function expireStaleTrip(trip: { id: string; status: string; requestedAt: Date }): Promise<string> {
  if (!["REQUESTED", "SEARCHING"].includes(trip.status)) return trip.status;
  if (msRemainingBeforeExpiry(trip.requestedAt) > 0) return trip.status;

  const result = await prisma.trip.updateMany({
    where: { id: trip.id, status: { in: ["REQUESTED", "SEARCHING"] } },
    data: {
      status: "NO_DRIVERS_AVAILABLE",
      cancelledAt: new Date(),
      cancellationReason: "No driver accepted within 5 minutes.",
    },
  });
  if (result.count > 0) {
    await prisma.tripStatusEvent.create({ data: { tripId: trip.id, status: "NO_DRIVERS_AVAILABLE" } });
  }
  return "NO_DRIVERS_AVAILABLE";
}

/** Same idea for a delivery order still waiting for a driver to accept it.
 * Also restocks the reserved items, guarded inside the same transaction as
 * the status flip so a race between concurrent pollers can't double-restock. */
export async function expireStaleOrder(order: {
  id: string;
  status: string;
  driverId: string | null;
  requestedAt: Date;
}): Promise<string> {
  if (order.status !== "READY_FOR_PICKUP" || order.driverId) return order.status;
  if (msRemainingBeforeExpiry(order.requestedAt) > 0) return order.status;

  const expired = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: order.id, status: "READY_FOR_PICKUP", driverId: null },
      data: {
        status: "NO_DRIVERS_AVAILABLE",
        cancelledAt: new Date(),
        cancellationReason: "No driver accepted within 5 minutes.",
      },
    });
    if (result.count === 0) return false;

    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    return true;
  });

  return expired ? "NO_DRIVERS_AVAILABLE" : order.status;
}
