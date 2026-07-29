import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toCsvValue(value: unknown): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ASSOCIATION_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const association = await prisma.association.findFirst({
    where: { admins: { some: { id: session.user.id } } },
  });
  if (!association) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const trips = await prisma.trip.findMany({
    where: { associationId: association.id },
    orderBy: { requestedAt: "desc" },
    include: {
      customer: { include: { user: { select: { name: true } } } },
      driver: { include: { user: { select: { name: true } } } },
    },
  });

  const header = ["Date", "Customer", "Driver", "Vehicle Type", "Distance (km)", "Fare", "Status"];
  const rows = trips.map((t) => [
    t.requestedAt.toISOString(),
    t.customer.user.name,
    t.driver?.user.name ?? "",
    t.vehicleType,
    t.distanceKm.toString(),
    (t.finalFare ?? t.estimatedFare).toString(),
    t.status,
  ]);

  const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${association.slug}-trips.csv"`,
    },
  });
}
