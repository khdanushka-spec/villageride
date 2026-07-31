"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptTripAction } from "@/actions/trips";

type AvailableTrip = {
  id: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: string;
  distanceToPickupKm: number | null;
  estimatedFare: string;
  requestedAt: string;
};

export function AvailableRidesList({ onAccepted }: { onAccepted: (tripId: string) => void }) {
  const [trips, setTrips] = useState<AvailableTrip[] | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/driver/available-trips");
      if (!cancelled && res.ok) {
        const data = await res.json();
        setTrips(data.trips);
      }
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleAccept(tripId: string) {
    setAcceptingId(tripId);
    setError(null);
    const result = await acceptTripAction(tripId);
    setAcceptingId(null);
    if (result?.error) setError(result.error);
    else onAccepted(tripId);
  }

  if (trips === null) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking for ride requests…
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No ride requests nearby right now. New requests appear here automatically.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {trips.map((trip) => (
        <div key={trip.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">
              {trip.customerName}
              {trip.distanceToPickupKm != null && (
                <span className="ml-2 text-xs font-normal text-primary">{trip.distanceToPickupKm.toFixed(1)} km away</span>
              )}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 text-primary" /> {trip.pickupAddress}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Navigation className="h-3 w-3 text-accent" /> {trip.dropoffAddress}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">LKR {Number(trip.estimatedFare).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{Number(trip.distanceKm).toFixed(1)} km trip</p>
          </div>
          <Button size="sm" disabled={acceptingId === trip.id} onClick={() => handleAccept(trip.id)}>
            {acceptingId === trip.id && <Loader2 className="h-4 w-4 animate-spin" />}
            Accept
          </Button>
        </div>
      ))}
    </div>
  );
}
