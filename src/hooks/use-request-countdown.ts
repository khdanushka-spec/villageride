"use client";

import { useEffect, useState } from "react";

const NO_DRIVER_TIMEOUT_MS = 5 * 60 * 1000;

/** Live "time left before this auto-cancels" for a ride/order still
 * waiting on a driver — ticks down locally every second between polls so
 * it doesn't visibly jump. Returns null once inactive or expired. */
export function useRequestCountdown(requestedAt: string | undefined, active: boolean): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active || !requestedAt) return null;

  const remainingMs = Math.max(0, NO_DRIVER_TIMEOUT_MS - (now - new Date(requestedAt).getTime()));
  if (remainingMs <= 0) return null;

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
