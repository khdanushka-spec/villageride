const OSRM_BASE = "https://router.project-osrm.org";
const EARTH_RADIUS_KM = 6371;
const AVERAGE_SPEED_KMH = 28; // conservative average for mixed urban/rural Sri Lankan roads
const OSRM_TIMEOUT_MS = 5000;

/** Straight-line (haversine) distance between two points, in km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export type RoadRoute = {
  distanceKm: number;
  durationMin: number;
  /** [lat, lng] pairs tracing the actual road path, ready for a Leaflet Polyline. */
  geometry: [number, number][];
  /** "osrm" when real road routing succeeded; "straight-line" when it fell back. */
  source: "osrm" | "straight-line";
};

/**
 * Real road distance/duration/path via OSRM's public routing server — no API
 * key needed, but it's an unauthenticated, best-effort demo endpoint (same
 * usage-policy tradeoff this app already accepts for Nominatim geocoding),
 * so any failure — network error, timeout, rate limit, no route found —
 * falls back to a straight-line estimate rather than breaking fare
 * estimation or the map.
 */
export async function getRoadRoute(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
): Promise<RoadRoute> {
  try {
    const url = new URL(
      `${OSRM_BASE}/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`
    );
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");

    const res = await fetch(url, { signal: AbortSignal.timeout(OSRM_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`OSRM responded ${res.status}`);

    const data = await res.json();
    const route = data?.routes?.[0];
    const coordinates = route?.geometry?.coordinates;
    if (!route || !Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error("No usable route returned");
    }

    return {
      distanceKm: route.distance / 1000,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      geometry: coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
      source: "osrm",
    };
  } catch {
    const distanceKm = haversineKm(pickup, dropoff);
    return {
      distanceKm,
      durationMin: Math.max(5, Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60)),
      geometry: [
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng],
      ],
      source: "straight-line",
    };
  }
}
