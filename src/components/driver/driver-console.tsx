"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toggleOnlineAction } from "@/actions/driver";
import { AvailableRidesList } from "@/components/driver/available-rides-list";
import { ActiveTripPanel } from "@/components/driver/active-trip-panel";

export function DriverConsole({
  initialIsOnline,
  initialActiveTripId,
}: {
  initialIsOnline: boolean;
  initialActiveTripId: string | null;
}) {
  const [isOnline, setIsOnline] = useState(initialIsOnline);
  const [activeTripId, setActiveTripId] = useState(initialActiveTripId);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (activeTripId) {
    return <ActiveTripPanel tripId={activeTripId} onDone={() => setActiveTripId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div>
          <Label htmlFor="online-toggle" className="text-base font-medium">
            {isOnline ? "You're online" : "You're offline"}
          </Label>
          <p className="text-sm text-muted-foreground">
            {isOnline ? "You'll receive nearby ride requests." : "Go online to start receiving rides."}
          </p>
        </div>
        <Switch id="online-toggle" checked={isOnline} disabled={toggling} onCheckedChange={handleToggle} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isOnline ? (
        <AvailableRidesList onAccepted={setActiveTripId} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You&apos;re currently offline.
        </div>
      )}
    </div>
  );
}
