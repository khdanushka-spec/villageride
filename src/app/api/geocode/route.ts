import { NextResponse } from "next/server";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "VillageRideSriLanka/1.0 (contact: hello@villageride.lk)";

/**
 * Proxies OpenStreetMap Nominatim so requests carry a proper User-Agent
 * (required by Nominatim's usage policy) and stay server-side rather than
 * hitting the API directly from the browser.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  let url: URL;
  if (mode === "reverse") {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }
    url = new URL(`${NOMINATIM_BASE}/reverse`);
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("format", "jsonv2");
  } else {
    const q = searchParams.get("q");
    if (!q) {
      return NextResponse.json({ error: "q is required" }, { status: 400 });
    }
    url = new URL(`${NOMINATIM_BASE}/search`);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "lk");
    url.searchParams.set("limit", "6");
  }

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Geocoding lookup failed" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
