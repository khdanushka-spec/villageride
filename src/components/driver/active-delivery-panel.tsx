"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Clock, ExternalLink, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelOrderAction, markPickedUpAction, markDeliveredAction } from "@/actions/orders";
import { useTripProgress } from "@/hooks/use-trip-progress";
import type { RoadRoute } from "@/lib/routing";
import type { OrderStatus } from "@prisma/client";

const LocationMap = dynamic(() => import("@/components/booking/location-map").then((m) => m.LocationMap), {
  ssr: false,
});

function googleMapsDirectionsUrl(destination: { lat: number; lng: number }): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

type OrderData = {
  id: string;
  status: OrderStatus;
  vendorName: string;
  vendorAddress: string;
  vendorLat: number;
  vendorLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryFee: string;
  items: { name: string; quantity: number }[];
  driver: { currentLat: number | null; currentLng: number | null } | null;
};

export function ActiveDeliveryPanel({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!cancelled && res.ok) setOrder(await res.json());
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    const params = new URLSearchParams({
      pickupLat: String(order.vendorLat),
      pickupLng: String(order.vendorLng),
      dropoffLat: String(order.deliveryLat),
      dropoffLng: String(order.deliveryLng),
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
  }, [order?.vendorLat, order?.vendorLng, order?.deliveryLat, order?.deliveryLng]);

  const driverLocation =
    order?.driver?.currentLat != null && order?.driver?.currentLng != null
      ? { lat: order.driver.currentLat, lng: order.driver.currentLng }
      : null;

  const progress = useTripProgress({
    phase: order?.status === "PICKED_UP" ? "to-dropoff" : order?.status === "DRIVER_ASSIGNED" ? "to-pickup" : "idle",
    driver: driverLocation,
    pickup: { lat: order?.vendorLat ?? 0, lng: order?.vendorLng ?? 0 },
    dropoff: { lat: order?.deliveryLat ?? 0, lng: order?.deliveryLng ?? 0 },
  });

  async function run(action: () => Promise<{ error?: string } | undefined>) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result?.error) setError(result.error);
  }

  if (!order) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading delivery…
      </div>
    );
  }

  if (["DELIVERED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_VENDOR"].includes(order.status)) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5 text-center">
        <p className="font-medium">{order.status === "DELIVERED" ? "Delivery completed" : "Order cancelled"}</p>
        <Button onClick={onDone}>Back to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{order.vendorName}</p>
        <h3 className="text-lg font-semibold">
          {order.status === "DRIVER_ASSIGNED" && "Head to the shop"}
          {order.status === "PICKED_UP" && "Deliver to customer"}
        </h3>
      </div>

      <div className="h-56 overflow-hidden rounded-xl border border-border">
        <LocationMap
          pickup={{ lat: order.vendorLat, lng: order.vendorLng }}
          dropoff={{ lat: order.deliveryLat, lng: order.deliveryLng }}
          driver={driverLocation}
          routeGeometry={progress?.geometry ?? route?.geometry}
          fitKey={order.status === "PICKED_UP" ? "dropoff" : "pickup"}
          className="h-full w-full"
        />
      </div>

      {progress && (
        <div className="flex items-center justify-center gap-4 rounded-xl border border-border/70 bg-secondary/40 p-2.5 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="h-4 w-4 text-primary" />
            {progress.durationMin} min
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Navigation className="h-4 w-4" />
            {progress.distanceKm.toFixed(1)} km
          </span>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        render={
          <a
            href={googleMapsDirectionsUrl(
              order.status === "PICKED_UP"
                ? { lat: order.deliveryLat, lng: order.deliveryLng }
                : { lat: order.vendorLat, lng: order.vendorLng }
            )}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        <ExternalLink className="h-4 w-4" />
        Navigate with Google Maps
      </Button>

      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Pickup: </span>
          {order.vendorAddress}
        </p>
        <p>
          <span className="text-muted-foreground">Deliver to: </span>
          {order.deliveryAddress}
        </p>
      </div>

      <div className="space-y-1 rounded-xl border border-border/70 p-3 text-sm text-muted-foreground">
        {order.items.map((item) => (
          <p key={item.name}>
            {item.quantity} × {item.name}
          </p>
        ))}
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Delivery fee (your earning is a share of this)</span>
        <span className="font-semibold">LKR {Number(order.deliveryFee).toLocaleString()}</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        {order.status === "DRIVER_ASSIGNED" && (
          <Button className="flex-1" disabled={pending} onClick={() => run(() => markPickedUpAction(orderId))}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Picked up from shop
          </Button>
        )}
        {order.status === "PICKED_UP" && (
          <Button className="flex-1" disabled={pending} onClick={() => run(() => markDeliveredAction(orderId))}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Mark delivered
          </Button>
        )}
        {order.status === "DRIVER_ASSIGNED" && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => cancelOrderAction(orderId, "Cancelled by driver"))}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
