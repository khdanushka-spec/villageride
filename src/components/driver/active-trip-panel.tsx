"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Clock, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cancelTripAction,
  markDriverArrivedAction,
  startTripAction,
  completeTripAction,
} from "@/actions/trips";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import { useTripProgress } from "@/hooks/use-trip-progress";
import type { RoadRoute } from "@/lib/routing";

const LocationMap = dynamic(() => import("@/components/booking/location-map").then((m) => m.LocationMap), {
  ssr: false,
});

type TripData = {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estimatedFare: string;
  finalFare: string | null;
  vehicleType: string;
  driver: { currentLat: number | null; currentLng: number | null } | null;
};

export function ActiveTripPanel({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!cancelled && res.ok) setTrip(await res.json());
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tripId]);

  // Fetch the road route once for this trip's fixed pickup/dropoff — not on
  // every poll tick, since the pins don't move.
  useEffect(() => {
    if (!trip) return;
    let cancelled = false;
    const params = new URLSearchParams({
      pickupLat: String(trip.pickupLat),
      pickupLng: String(trip.pickupLng),
      dropoffLat: String(trip.dropoffLat),
      dropoffLng: String(trip.dropoffLng),
    });
    fetch(`/api/route?${params}`)
      .then((r) => r.json())
      .then((data: RoadRoute) => {
        if (!cancelled) setRoute(data);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.pickupLat, trip?.pickupLng, trip?.dropoffLat, trip?.dropoffLng]);

  // Live location reporting is handled by DriverConsole (useDriverLocationTracking),
  // which keeps running across the online<->active-trip transition instead of
  // this panel starting its own separate watch on mount.

  const driverLocation =
    trip?.driver?.currentLat != null && trip?.driver?.currentLng != null
      ? { lat: trip.driver.currentLat, lng: trip.driver.currentLng }
      : null;

  const progress = useTripProgress({
    status: trip?.status ?? "",
    driver: driverLocation,
    pickup: { lat: trip?.pickupLat ?? 0, lng: trip?.pickupLng ?? 0 },
    dropoff: { lat: trip?.dropoffLat ?? 0, lng: trip?.dropoffLng ?? 0 },
  });

  async function run(action: () => Promise<{ error?: string } | undefined>) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result?.error) setError(result.error);
  }

  if (!trip) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading trip…
      </div>
    );
  }

  if (["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_DRIVER"].includes(trip.status)) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5 text-center">
        <p className="font-medium">
          {trip.status === "COMPLETED" ? "Trip completed" : "Trip cancelled"}
        </p>
        <Button onClick={onDone}>Back to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {VEHICLE_TYPE_LABELS[trip.vehicleType as keyof typeof VEHICLE_TYPE_LABELS]}
        </p>
        <h3 className="text-lg font-semibold">
          {trip.status === "ACCEPTED" && "Head to pickup"}
          {trip.status === "DRIVER_ARRIVED" && "Waiting for customer"}
          {trip.status === "IN_PROGRESS" && "Trip in progress"}
        </h3>
      </div>

      <div className="h-56 overflow-hidden rounded-xl border border-border">
        <LocationMap
          pickup={{ lat: trip.pickupLat, lng: trip.pickupLng }}
          dropoff={{ lat: trip.dropoffLat, lng: trip.dropoffLng }}
          driver={driverLocation}
          routeGeometry={progress?.geometry ?? route?.geometry}
          fitKey={trip.status === "IN_PROGRESS" ? "dropoff" : "pickup"}
          className="h-full w-full"
        />
      </div>

      {progress && (trip.status === "ACCEPTED" || trip.status === "IN_PROGRESS") && (
        <div className="flex items-center justify-center gap-4 rounded-xl border border-border/70 bg-secondary/40 p-2.5 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="h-4 w-4 text-primary" />
            {progress.durationMin} min {trip.status === "IN_PROGRESS" ? "to destination" : "to pickup"}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Navigation className="h-4 w-4" />
            {progress.distanceKm.toFixed(1)} km
          </span>
        </div>
      )}

      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Pickup: </span>
          {trip.pickupAddress}
        </p>
        <p>
          <span className="text-muted-foreground">Drop-off: </span>
          {trip.dropoffAddress}
        </p>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Fare</span>
        <span className="font-semibold">LKR {Number(trip.estimatedFare).toLocaleString()}</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        {trip.status === "ACCEPTED" && (
          <Button className="flex-1" disabled={pending} onClick={() => run(() => markDriverArrivedAction(tripId))}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            I&apos;ve arrived
          </Button>
        )}
        {trip.status === "DRIVER_ARRIVED" && (
          <Button className="flex-1" disabled={pending} onClick={() => run(() => startTripAction(tripId))}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Start trip
          </Button>
        )}
        {trip.status === "IN_PROGRESS" && (
          <Button className="flex-1" disabled={pending} onClick={() => run(() => completeTripAction(tripId))}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Complete trip
          </Button>
        )}
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => cancelTripAction(tripId, "Cancelled by driver"))}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
