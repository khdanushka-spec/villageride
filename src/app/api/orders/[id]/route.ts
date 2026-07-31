import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { userId: true } },
      vendor: { select: { name: true, addressLine: true, lat: true, lng: true, contactPhone: true } },
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
      items: { select: { name: true, quantity: true, unitPrice: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCustomer = order.customer.userId === session.user.id;
  const isDriver = order.driver?.userId === session.user.id;
  if (!isCustomer && !isDriver && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    vendorName: order.vendor.name,
    vendorAddress: order.vendor.addressLine,
    vendorLat: order.vendor.lat,
    vendorLng: order.vendor.lng,
    deliveryAddress: order.deliveryAddress,
    deliveryLat: order.deliveryLat,
    deliveryLng: order.deliveryLng,
    itemsTotal: order.itemsTotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items,
    requestedAt: order.requestedAt,
    driverAssignedAt: order.driverAssignedAt,
    pickedUpAt: order.pickedUpAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    driver: order.driver
      ? {
          name: order.driver.user.name,
          phone: order.driver.user.phone,
          avatarUrl: order.driver.user.avatarUrl,
          rating: order.driver.ratingAvg,
          currentLat: order.driver.currentLat,
          currentLng: order.driver.currentLng,
        }
      : null,
    vehicle: order.vehicle,
  });
}
