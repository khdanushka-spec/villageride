"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Clock, Loader2, Navigation, Phone, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cancelTripAction, rateTripAction } from "@/actions/trips";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import { useActionState } from "react";
import { useTripProgress } from "@/hooks/use-trip-progress";
import type { ActionState } from "@/actions/trips";
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
  distanceKm: string;
  durationMin: number;
  estimatedFare: string;
  finalFare: string | null;
  vehicleType: string;
  driver: {
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    rating: string;
    currentLat: number | null;
    currentLng: number | null;
  } | null;
  vehicle: { make: string; model: string; color: string; plateNumber: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Finding a driver…",
  SEARCHING: "Finding a nearby driver…",
  ACCEPTED: "Driver is on the way",
  DRIVER_ARRIVED: "Your driver has arrived",
  IN_PROGRESS: "Trip in progress",
  COMPLETED: "Trip completed",
  CANCELLED_BY_CUSTOMER: "You cancelled this trip",
  CANCELLED_BY_DRIVER: "Driver cancelled this trip",
  NO_DRIVERS_AVAILABLE: "No drivers were available",
};

export function TripStatusPanel({ tripId, onClosed }: { tripId: string; onClosed: () => void }) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [route, setRoute] = useState<RoadRoute | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!cancelled && res.ok) setTrip(await res.json());
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tripId]);

  // Fetch the road route once for this trip's fixed pickup/dropoff — not on
  // every 4s poll tick, since the pins don't move.
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

  const driverLocation =
    trip?.driver?.currentLat != null && trip?.driver?.currentLng != null
      ? { lat: trip.driver.currentLat, lng: trip.driver.currentLng }
      : null;

  const progress = useTripProgress({
    phase: trip?.status === "IN_PROGRESS" ? "to-dropoff" : trip?.status === "ACCEPTED" ? "to-pickup" : "idle",
    driver: driverLocation,
    pickup: { lat: trip?.pickupLat ?? 0, lng: trip?.pickupLng ?? 0 },
    dropoff: { lat: trip?.dropoffLat ?? 0, lng: trip?.dropoffLng ?? 0 },
  });

  const [cancelState, setCancelState] = useState<{ error?: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    const result = await cancelTripAction(tripId, "Cancelled by customer");
    setCancelling(false);
    if (result?.error) setCancelState({ error: result.error });
  }

  const [rateState, rateAction, ratePending] = useActionState<ActionState, FormData>(rateTripAction, undefined);
  const [stars, setStars] = useState(5);

  if (!trip) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your ride…
      </div>
    );
  }

  const isActive = ["REQUESTED", "SEARCHING", "ACCEPTED", "DRIVER_ARRIVED", "IN_PROGRESS"].includes(trip.status);
  const isTerminal = !isActive;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {VEHICLE_TYPE_LABELS[trip.vehicleType as keyof typeof VEHICLE_TYPE_LABELS]}
          </p>
          <h3 className="text-lg font-semibold">{STATUS_LABELS[trip.status] ?? trip.status}</h3>
        </div>
        {isTerminal && (
          <button onClick={onClosed} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
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
            {progress.durationMin} min {trip.status === "IN_PROGRESS" ? "to destination" : "away"}
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

      {trip.driver && (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/40 p-3">
          <Avatar>
            <AvatarImage src={trip.driver.avatarUrl ?? undefined} />
            <AvatarFallback>{trip.driver.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{trip.driver.name}</p>
            <p className="text-xs text-muted-foreground">
              {trip.vehicle ? `${trip.vehicle.color} ${trip.vehicle.make} ${trip.vehicle.model} · ${trip.vehicle.plateNumber}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {Number(trip.driver.rating).toFixed(1)}
          </div>
          {trip.driver.phone && (
            <Button size="icon-sm" variant="outline" render={<a href={`tel:${trip.driver.phone}`} />}>
              <Phone className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{trip.status === "COMPLETED" ? "Final fare" : "Estimated fare"}</span>
        <span className="font-semibold">LKR {Number(trip.finalFare ?? trip.estimatedFare).toLocaleString()}</span>
      </div>

      {isActive && (
        <>
          {cancelState?.error && <p className="text-sm text-destructive">{cancelState.error}</p>}
          <Button variant="outline" className="w-full" onClick={handleCancel} disabled={cancelling}>
            {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
            Cancel ride
          </Button>
        </>
      )}

      {trip.status === "COMPLETED" && (
        <form action={rateAction} className="space-y-2 border-t border-border pt-4">
          <input type="hidden" name="tripId" value={trip.id} />
          <input type="hidden" name="stars" value={stars} />
          <p className="text-sm font-medium">Rate your driver</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setStars(n)}>
                <Star className={`h-6 w-6 ${n <= stars ? "fill-accent text-accent" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          {rateState?.error && <p className="text-sm text-destructive">{rateState.error}</p>}
          {rateState?.success ? (
            <p className="text-sm text-success">{rateState.success}</p>
          ) : (
            <Button type="submit" size="sm" disabled={ratePending}>
              {ratePending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit rating
            </Button>
          )}
        </form>
      )}

      {(trip.status === "CANCELLED_BY_CUSTOMER" || trip.status === "CANCELLED_BY_DRIVER") && (
        <Button variant="outline" className="w-full" onClick={onClosed}>
          Book another ride
        </Button>
      )}
    </div>
  );
}
