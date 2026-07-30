"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cancelTripAction,
  markDriverArrivedAction,
  startTripAction,
  completeTripAction,
} from "@/actions/trips";
import { updateDriverLocationAction } from "@/actions/driver";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
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
};

export function ActiveTripPanel({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

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

  // Share live location with the customer while the trip is active.
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        updateDriverLocationAction(pos.coords.latitude, pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

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
          routeGeometry={route?.geometry}
          className="h-full w-full"
        />
      </div>

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
