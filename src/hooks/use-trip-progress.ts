"use client";

import { useEffect, useState } from "react";
import type { RoadRoute } from "@/lib/routing";

type LatLng = { lat: number; lng: number };

const POLL_MS = 7000;

/**
 * Live "how much is left" for an active trip — the route, distance, and ETA
 * from the driver's current position to wherever they're headed next
 * (pickup while ACCEPTED, dropoff once IN_PROGRESS), re-fetched on an
 * interval as the driver's reported position moves. Returns null outside
 * those two phases, or before a driver position is available, so callers
 * fall back to the trip's fixed pickup->dropoff estimate.
 */
export function useTripProgress({
  status,
  driver,
  pickup,
  dropoff,
}: {
  status: string;
  driver: LatLng | null;
  pickup: LatLng;
  dropoff: LatLng;
}): RoadRoute | null {
  const target = status === "IN_PROGRESS" ? dropoff : pickup;
  const active = (status === "ACCEPTED" || status === "IN_PROGRESS") && !!driver;

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
