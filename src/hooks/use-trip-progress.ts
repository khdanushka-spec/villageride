"use client";

import { useEffect, useState } from "react";
import type { RoadRoute } from "@/lib/routing";

type LatLng = { lat: number; lng: number };

/** Which leg of the journey the driver is currently on, if any. Shared
 * between rides (heading to pickup, then to drop-off) and deliveries
 * (heading to the vendor, then to the customer) — same two-leg shape,
 * different domain vocabulary. */
export type TripPhase = "to-pickup" | "to-dropoff" | "idle";

const POLL_MS = 7000;

/**
 * Live "how much is left" for an active trip or delivery — the route,
 * distance, and ETA from the driver's current position to wherever they're
 * headed next, re-fetched on an interval as the driver's reported position
 * moves. Returns null while idle or before a driver position is available,
 * so callers fall back to the fixed pickup->dropoff estimate.
 */
export function useTripProgress({
  phase,
  driver,
  pickup,
  dropoff,
}: {
  phase: TripPhase;
  driver: LatLng | null;
  pickup: LatLng;
  dropoff: LatLng;
}): RoadRoute | null {
  const target = phase === "to-dropoff" ? dropoff : pickup;
  const active = phase !== "idle" && !!driver;

  const [progress, setProgress] = useState<RoadRoute | null>(null);

  useEffect(() => {
    if (!active || !driver) {
      setProgress(null);
      return;
    }
    let cancelled = false;
    async function fetchProgress() {
      const params = new URLSearchParams({
        pickupLat: String(driver!.lat),
        pickupLng: String(driver!.lng),
        dropoffLat: String(target.lat),
        dropoffLng: String(target.lng),
      });
      const res = await fetch(`/api/route?${params}`);
      if (!cancelled && res.ok) setProgress(await res.json());
    }
    fetchProgress();
    const interval = setInterval(fetchProgress, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, driver?.lat, driver?.lng, target.lat, target.lng]);

  return active ? progress : null;
}
