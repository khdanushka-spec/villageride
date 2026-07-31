import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    where: { status: "READY_FOR_PICKUP", driverId: null },
    include: { vendor: { select: { name: true, addressLine: true } } },
    orderBy: { requestedAt: "asc" },
    take: 20,
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      vendorName: o.vendor.name,
      vendorAddress: o.vendor.addressLine,
      deliveryAddress: o.deliveryAddress,
      distanceKm: o.distanceKm,
      deliveryFee: o.deliveryFee,
      requestedAt: o.requestedAt,
    })),
  });
}
