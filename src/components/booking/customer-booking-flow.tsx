"use client";

import { useState } from "react";
import { BookRideForm } from "@/components/booking/book-ride-form";
import { TripStatusPanel } from "@/components/booking/trip-status-panel";

export function CustomerBookingFlow({ initialActiveTripId }: { initialActiveTripId: string | null }) {
  const [tripId, setTripId] = useState<string | null>(initialActiveTripId);

  if (tripId) {
    return (
      <div className="mx-auto max-w-md">
        <TripStatusPanel tripId={tripId} onClosed={() => setTripId(null)} />
      </div>
    );
  }

  return <BookRideForm onRequested={setTripId} />;
}
