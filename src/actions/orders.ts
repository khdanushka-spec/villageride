"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateFareForVehicleType, toDecimal } from "@/lib/fare";
import { reconcileDriverCompliance } from "@/lib/enforce-compliance";
import { ACTIVE_ORDER_STATUSES } from "@/lib/products";
import type { OrderStatus } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

const cartItemSchema = z.object({ productId: z.string(), quantity: z.coerce.number().int().min(1) });

const placeOrderSchema = z.object({
  vendorId: z.string().min(1),
  items: z.string().min(1), // JSON-encoded CartItem[]
  deliveryAddress: z.string().min(1),
  deliveryLat: z.coerce.number(),
  deliveryLng: z.coerce.number(),
  paymentMethod: z.string(),
  notes: z.string().optional(),
});

/**
 * Delivery fee is priced the same way a ride would be — the existing
 * per-km/per-minute pricing engine, standing in for a three-wheeler making
 * the vendor->customer run — rather than inventing a second pricing model
 * for a first version of goods delivery.
 */
export async function placeOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return { error: "You must be signed in as a customer to place an order." };
  }

  const parsed = placeOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Missing delivery details." };
  const data = parsed.data;

  let cartItems: { productId: string; quantity: number }[];
  try {
    cartItems = z.array(cartItemSchema).min(1).parse(JSON.parse(data.items));
  } catch {
    return { error: "Your cart is empty." };
  }

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) return { error: "Customer profile not found." };

  const existingActive = await prisma.order.findFirst({
    where: { customerId: customer.id, status: { in: ACTIVE_ORDER_STATUSES } },
  });
  if (existingActive) return { error: "You already have an active order in progress." };

  const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
  if (!vendor || !vendor.isActive) return { error: "This shop isn't available right now." };

  const products = await prisma.product.findMany({
    where: { id: { in: cartItems.map((i) => i.productId) }, vendorId: vendor.id },
  });

  let itemsTotal = 0;
  const orderItemsData: { productId: string; name: string; quantity: number; unitPrice: ReturnType<typeof toDecimal> }[] = [];
  for (const item of cartItems) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || !product.isActive) return { error: "One of the items in your cart is no longer available." };
    if (product.stock < item.quantity) return { error: `Only ${product.stock} of "${product.name}" left in stock.` };
    itemsTotal += Number(product.price) * item.quantity;
    orderItemsData.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice: toDecimal(Number(product.price)),
    });
  }

  const estimate = await estimateFareForVehicleType(
    { lat: vendor.lat, lng: vendor.lng },
    { lat: data.deliveryLat, lng: data.deliveryLng },
    "THREE_WHEELER"
  );
  const deliveryFee = estimate?.fare ?? 0;

  const order = await prisma.$transaction(async (tx) => {
    for (const item of cartItems) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) throw new Error("STOCK_CHANGED");
    }

    // No vendor dashboard yet to confirm the order — auto-confirm and mark
    // ready for a driver immediately. When vendor self-service ships, this
    // becomes the initial PLACED status instead, awaiting a real confirm.
    return tx.order.create({
      data: {
        customerId: customer.id,
        vendorId: vendor.id,
        deliveryAddress: data.deliveryAddress,
        deliveryLat: data.deliveryLat,
        deliveryLng: data.deliveryLng,
        distanceKm: estimate ? toDecimal(estimate.distanceKm) : null,
        durationMin: estimate?.durationMin ?? null,
        itemsTotal: toDecimal(itemsTotal),
        deliveryFee: toDecimal(deliveryFee),
        totalAmount: toDecimal(itemsTotal + deliveryFee),
        paymentMethod: data.paymentMethod as "CASH" | "WALLET",
        notes: data.notes || null,
        status: "READY_FOR_PICKUP",
        confirmedAt: new Date(),
        items: { create: orderItemsData },
      },
    });
  }).catch((err) => {
    if (err instanceof Error && err.message === "STOCK_CHANGED") return null;
    throw err;
  });

  if (!order) return { error: "Stock changed while you were checking out — please review your cart." };

  revalidatePath("/dashboard/customer/shop");
  revalidatePath("/dashboard/customer/orders");
  return { success: order.id };
}

export async function cancelOrderAction(orderId: string, reason: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, driver: true } });
  if (!order) return { error: "Order not found." };

  const isCustomer = session.user.role === "CUSTOMER" && order.customer.userId === session.user.id;
  const isDriver = session.user.role === "DRIVER" && order.driver?.userId === session.user.id;
  if (!isCustomer && !isDriver) return { error: "Not authorized." };

  if (!["PLACED", "CONFIRMED", "READY_FOR_PICKUP", "DRIVER_ASSIGNED"].includes(order.status)) {
    return { error: "This order can no longer be cancelled." };
  }

  const restock = order.status !== "PLACED" && order.status !== "CONFIRMED";
  const items = restock ? await prisma.orderItem.findMany({ where: { orderId } }) : [];

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: isCustomer ? "CANCELLED_BY_CUSTOMER" : "CANCELLED_BY_VENDOR",
        cancelledAt: new Date(),
        cancellationReason: reason || null,
      },
    }),
    ...items.map((item) =>
      prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
    ),
  ]);

  revalidatePath("/dashboard/customer/orders");
  revalidatePath("/dashboard/driver");
  return { success: "Order cancelled." };
}

export async function acceptOrderAction(orderId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: { where: { isActive: true }, take: 1 } },
  });
  if (!driver) return { error: "Driver profile not found." };
  if (!driver.isOnline) return { error: "Go online before accepting deliveries." };

  const reconciled = await reconcileDriverCompliance(driver.id);
  if (reconciled.status !== "APPROVED") {
    return { error: reconciled.blockers[0]?.message ?? "Your account isn't eligible to accept deliveries right now." };
  }

  const vehicle = driver.vehicles[0];
  if (!vehicle) return { error: "No active vehicle on file." };

  const result = await prisma.order.updateMany({
    where: { id: orderId, driverId: null, status: "READY_FOR_PICKUP" },
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      associationId: driver.associationId,
      status: "DRIVER_ASSIGNED",
      driverAssignedAt: new Date(),
    },
  });
  if (result.count === 0) return { error: "This order was already accepted by another driver." };

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/customer/orders");
  return { success: "Delivery accepted." };
}

async function advanceOrderStatus(
  orderId: string,
  from: OrderStatus[],
  to: "PICKED_UP" | "DELIVERED",
  extra?: Record<string, unknown>
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return { error: "Driver profile not found." };

  const result = await prisma.order.updateMany({
    where: { id: orderId, driverId: driver.id, status: { in: from } },
    data: { status: to, ...extra },
  });
  if (result.count === 0) return { error: "Order is not in the expected state." };

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/customer/orders");
  return { success: "Updated." };
}

export async function markPickedUpAction(orderId: string) {
  return advanceOrderStatus(orderId, ["DRIVER_ASSIGNED"], "PICKED_UP", { pickedUpAt: new Date() });
}

export async function markDeliveredAction(orderId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return { error: "Not authorized." };

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return { error: "Driver profile not found." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, driverId: driver.id, status: "PICKED_UP" },
    include: { customer: { include: { wallet: true } } },
  });
  if (!order) return { error: "Order is not out for delivery." };

  const association = order.associationId
    ? await prisma.association.findUnique({ where: { id: order.associationId } })
    : null;
  const commissionPercent = association ? Number(association.commissionPercent) : 10;
  const driverEarning = Number(order.deliveryFee) * (1 - commissionPercent / 100);

  await prisma.$transaction(async (tx) => {
    if (order.paymentMethod === "WALLET") {
      const wallet = order.customer.wallet;
      if (!wallet || Number(wallet.balance) < Number(order.totalAmount)) {
        throw new Error("INSUFFICIENT_WALLET_BALANCE");
      }
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: order.totalAmount } } });
      await tx.transaction.create({
        data: { walletId: wallet.id, orderId, type: "DEBIT", reason: "DELIVERY_PAYMENT", amount: order.totalAmount },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        paymentStatus: "COMPLETED",
      },
    });

    const driverWallet = await tx.wallet.upsert({
      where: { driverId: driver.id },
      update: {},
      create: { ownerType: "DRIVER", driverId: driver.id, balance: 0 },
    });
    await tx.wallet.update({ where: { id: driverWallet.id }, data: { balance: { increment: driverEarning } } });
    await tx.transaction.create({
      data: {
        walletId: driverWallet.id,
        orderId,
        type: "CREDIT",
        reason: "DELIVERY_EARNING",
        amount: toDecimal(driverEarning),
      },
    });

    await tx.driver.update({ where: { id: driver.id }, data: { totalTrips: { increment: 1 } } });
  });

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/customer/orders");
  return { success: "Delivered." };
}
