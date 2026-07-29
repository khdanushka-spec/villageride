"use client";

import dynamic from "next/dynamic";
import { useActionState, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddressSearch } from "@/components/booking/address-search";
import type { LatLng } from "@/components/booking/location-map";
import { VEHICLE_TYPE_ICONS, VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import { requestTripAction, type ActionState } from "@/actions/trips";
import type { FareEstimate } from "@/lib/fare";
import { cn } from "@/lib/utils";

const LocationMap = dynamic(() => import("@/components/booking/location-map").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

type Point = LatLng & { address: string };

export function BookRideForm({ onRequested }: { onRequested: (tripId: string) => void }) {
  const [pickup, setPickup] = useState<Point | null>(null);
  const [dropoff, setDropoff] = useState<Point | null>(null);
  const [estimates, setEstimates] = useState<FareEstimate[] | null>(null);
  const [estimatesLoading, setEstimatesLoading] = useState(false);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "WALLET">("CASH");

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    const result = await requestTripAction(_prev, formData);
    if (result?.success) onRequested(result.success);
    return result;
  }, undefined);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setEstimates(null);
      return;
    }
    setEstimatesLoading(true);
    const params = new URLSearchParams({
      pickupLat: String(pickup.lat),
      pickupLng: String(pickup.lng),
      dropoffLat: String(dropoff.lat),
      dropoffLng: String(dropoff.lng),
    });
    fetch(`/api/fare-estimate?${params}`)
      .then((r) => r.json())
      .then((data: FareEstimate[]) => {
        setEstimates(data);
        if (!vehicleType && data.length > 0) setVehicleType(data[0].vehicleType);
      })
      .finally(() => setEstimatesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff]);

  async function handleMapClick(lat: number, lng: number) {
    const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lng=${lng}`);
    const data = await res.json();
    const address = data?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (!pickup) setPickup({ lat, lng, address });
    else if (!dropoff) setDropoff({ lat, lng, address });
  }

  const selectedEstimate = estimates?.find((e) => e.vehicleType === vehicleType);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <AddressSearch
              label="Pickup location"
              placeholder="Search for a pickup point"
              value={pickup?.address ?? ""}
              onSelect={setPickup}
            />
            {pickup && (
              <button
                type="button"
                onClick={() => setPickup(null)}
                className="absolute right-2 top-7 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <AddressSearch
              label="Where to?"
              placeholder="Search for a destination"
              value={dropoff?.address ?? ""}
              onSelect={setDropoff}
            />
            {dropoff && (
              <button
                type="button"
                onClick={() => setDropoff(null)}
                className="absolute right-2 top-7 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: you can also click the map to drop a pin — pickup first, then destination.
        </p>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Choose a vehicle</p>
          {estimatesLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculating fares…
            </div>
          )}
          {!estimatesLoading && !estimates && (
            <p className="text-sm text-muted-foreground">Set a pickup and destination to see fare estimates.</p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {estimates?.map((e) => {
              const Icon = VEHICLE_TYPE_ICONS[e.vehicleType];
              const active = vehicleType === e.vehicleType;
              return (
                <button
                  key={e.vehicleType}
                  type="button"
                  onClick={() => setVehicleType(e.vehicleType)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition-colors",
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                  )}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">{VEHICLE_TYPE_LABELS[e.vehicleType]}</span>
                  <span className="text-sm font-semibold">
                    {e.currency} {e.fare.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Payment method</p>
          <div className="flex gap-2">
            {(["CASH", "WALLET"] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  paymentMethod === method ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                )}
              >
                {method === "CASH" ? "Cash" : "Wallet"}
              </button>
            ))}
          </div>
        </div>

        {selectedEstimate && (
          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Distance</span>
              <span>{selectedEstimate.distanceKm} km</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Estimated time</span>
              <span>{selectedEstimate.durationMin} min</span>
            </div>
            <div className="mt-1 flex justify-between font-semibold">
              <span>Estimated fare</span>
              <span>
                {selectedEstimate.currency} {selectedEstimate.fare.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <form action={formAction}>
          <input type="hidden" name="pickupAddress" value={pickup?.address ?? ""} />
          <input type="hidden" name="pickupLat" value={pickup?.lat ?? ""} />
          <input type="hidden" name="pickupLng" value={pickup?.lng ?? ""} />
          <input type="hidden" name="dropoffAddress" value={dropoff?.address ?? ""} />
          <input type="hidden" name="dropoffLat" value={dropoff?.lat ?? ""} />
          <input type="hidden" name="dropoffLng" value={dropoff?.lng ?? ""} />
          <input type="hidden" name="vehicleType" value={vehicleType ?? ""} />
          <input type="hidden" name="paymentMethod" value={paymentMethod} />

          {state?.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending || !pickup || !dropoff || !vehicleType}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Request ride
          </Button>
        </form>
      </div>

      <div className="h-80 overflow-hidden rounded-2xl border border-border lg:h-full lg:min-h-[420px]">
        <LocationMap pickup={pickup} dropoff={dropoff} onMapClick={handleMapClick} className="h-full w-full" />
      </div>
    </div>
  );
}
