import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toCsvValue(value: unknown): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trips = await prisma.trip.findMany({
    orderBy: { requestedAt: "desc" },
    take: 5000,
    include: {
      customer: { include: { user: { select: { name: true } } } },
      driver: { include: { user: { select: { name: true } } } },
      association: { select: { name: true } },
    },
  });

  const header = ["Date", "Association", "Customer", "Driver", "Vehicle Type", "Distance (km)", "Fare", "Status"];
  const rows = trips.map((t) => [
    t.requestedAt.toISOString(),
    t.association?.name ?? "",
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
      "Content-Disposition": `attachment; filename="villageride-trips.csv"`,
    },
  });
}
