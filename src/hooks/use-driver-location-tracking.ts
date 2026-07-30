"use client";

import { useEffect, useRef, useState } from "react";
import { updateDriverLocationAction } from "@/actions/driver";

export type TrackedPosition = { lat: number; lng: number };

/**
 * Reports the driver's live position to the server for as long as `active`
 * is true — this is what makes them a moving marker on a customer's map,
 * whether they're just online and waiting, or mid-trip. Called once at the
 * top of DriverConsole (before it branches into the active-trip view) so the
 * watch survives that transition instead of restarting.
 */
export function useDriverLocationTracking(active: boolean): TrackedPosition | null {
  const [position, setPosition] = useState<TrackedPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !navigator.geolocation) {
      setPosition(null);
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(next);
        updateDriverLocationAction(next.lat, next.lng);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [active]);

  return position;
}
