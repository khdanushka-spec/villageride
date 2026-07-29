import { NextResponse } from "next/server";
import { estimateAllVehicleTypes } from "@/lib/fare";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pickupLat = Number(searchParams.get("pickupLat"));
  const pickupLng = Number(searchParams.get("pickupLng"));
  const dropoffLat = Number(searchParams.get("dropoffLat"));
  const dropoffLng = Number(searchParams.get("dropoffLng"));

  if ([pickupLat, pickupLng, dropoffLat, dropoffLng].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const estimates = await estimateAllVehicleTypes(
    { lat: pickupLat, lng: pickupLng },
    { lat: dropoffLat, lng: dropoffLng }
  );

  return NextResponse.json(estimates);
}
