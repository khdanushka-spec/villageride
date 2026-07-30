import { NextResponse } from "next/server";
import { getRoadRoute } from "@/lib/routing";

/** Proxies road-route lookups so the map can draw the real path a driver takes, not a straight line. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pickupLat = Number(searchParams.get("pickupLat"));
  const pickupLng = Number(searchParams.get("pickupLng"));
  const dropoffLat = Number(searchParams.get("dropoffLat"));
  const dropoffLng = Number(searchParams.get("dropoffLng"));

  if ([pickupLat, pickupLng, dropoffLat, dropoffLng].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const route = await getRoadRoute(
    { lat: pickupLat, lng: pickupLng },
    { lat: dropoffLat, lng: dropoffLng }
  );

  return NextResponse.json(route);
}
