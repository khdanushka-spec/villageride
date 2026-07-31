"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toggleOnlineAction } from "@/actions/driver";
import { AvailableRidesList } from "@/components/driver/available-rides-list";
import { AvailableDeliveriesList } from "@/components/driver/available-deliveries-list";
import { ActiveTripPanel } from "@/components/driver/active-trip-panel";
import { ActiveDeliveryPanel } from "@/components/driver/active-delivery-panel";
import { useDriverLocationTracking } from "@/hooks/use-driver-location-tracking";

const LocationMap = dynamic(() => import("@/components/booking/location-map").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

export function DriverConsole({
  initialIsOnline,
  initialActiveTripId,
  initialActiveDeliveryId,
}: {
  initialIsOnline: boolean;
  initialActiveTripId: string | null;
  initialActiveDeliveryId: string | null;
}) {
  const [isOnline, setIsOnline] = useState(initialIsOnline);
  const [activeTripId, setActiveTripId] = useState(initialActiveTripId);
  const [activeDeliveryId, setActiveDeliveryId] = useState(initialActiveDeliveryId);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Called unconditionally, before the active-trip early return below, so
  // the same watch keeps reporting position across the online<->active-trip
  // transition instead of stopping and restarting.
  const position = useDriverLocationTracking(isOnline);

  async function handleToggle(checked: boolean) {
    setToggling(true);
    setIsOnline(checked);
    setError(null);
    const result = await toggleOnlineAction(checked);
    setToggling(false);
    if (result?.error) {
      setIsOnline(!checked);
      setError(result.error);
    }
  }

  // A driver only ever works one job at a time — whichever they picked up
  // first takes over the console until it's done.
  if (activeTripId) {
    return <ActiveTripPanel tripId={activeTripId} onDone={() => setActiveTripId(null)} />;
  }
  if (activeDeliveryId) {
    return <ActiveDeliveryPanel orderId={activeDeliveryId} onDone={() => setActiveDeliveryId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div>
          <Label htmlFor="online-toggle" className="text-base font-medium">
            {isOnline ? "You're online" : "You're offline"}
          </Label>
          <p className="text-sm text-muted-foreground">
            {isOnline ? "You'll receive nearby ride and delivery requests." : "Go online to start receiving requests."}
          </p>
        </div>
        <Switch id="online-toggle" checked={isOnline} disabled={toggling} onCheckedChange={handleToggle} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isOnline ? (
        <>
          <div className="h-48 overflow-hidden rounded-2xl border border-border">
            <LocationMap driver={position} className="h-full w-full" />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Ride requests</h3>
            <AvailableRidesList onAccepted={setActiveTripId} />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Delivery requests</h3>
            <AvailableDeliveriesList onAccepted={setActiveDeliveryId} />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You&apos;re currently offline.
        </div>
      )}
    </div>
  );
}
