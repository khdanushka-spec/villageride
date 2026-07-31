"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Clock, Loader2, Navigation, Phone, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cancelOrderAction } from "@/actions/orders";
import { ORDER_STATUS_LABELS } from "@/lib/products";
import { useTripProgress } from "@/hooks/use-trip-progress";
import type { RoadRoute } from "@/lib/routing";
import type { OrderStatus } from "@prisma/client";

const LocationMap = dynamic(() => import("@/components/booking/location-map").then((m) => m.LocationMap), {
  ssr: false,
});

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
  itemsTotal: string;
  deliveryFee: string;
  totalAmount: string;
  items: { name: string; quantity: number; unitPrice: string }[];
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

const CANCELLABLE: OrderStatus[] = ["PLACED", "CONFIRMED", "READY_FOR_PICKUP", "DRIVER_ASSIGNED"];
const TERMINAL: OrderStatus[] = ["DELIVERED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_VENDOR", "NO_DRIVERS_AVAILABLE"];

export function OrderTrackingPanel({ orderId, onClosed }: { orderId: string; onClosed: () => void }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [route, setRoute] = useState<RoadRoute | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!cancelled && res.ok) setOrder(await res.json());
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  // Fixed vendor->delivery route for the map fallback, fetched once.
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

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  async function handleCancel() {
    setCancelling(true);
    const result = await cancelOrderAction(orderId, "Cancelled by customer");
    setCancelling(false);
    if (result?.error) setCancelError(result.error);
  }

  if (!order) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your order…
      </div>
    );
  }

  const isTerminal = TERMINAL.includes(order.status);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{order.vendorName}</p>
          <h3 className="text-lg font-semibold">{ORDER_STATUS_LABELS[order.status]}</h3>
        </div>
        {isTerminal && (
          <button onClick={onClosed} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
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

      {progress && (order.status === "DRIVER_ASSIGNED" || order.status === "PICKED_UP") && (
        <div className="flex items-center justify-center gap-4 rounded-xl border border-border/70 bg-secondary/40 p-2.5 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="h-4 w-4 text-primary" />
            {progress.durationMin} min {order.status === "PICKED_UP" ? "to you" : "to the shop"}
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
          {order.vendorAddress}
        </p>
        <p>
          <span className="text-muted-foreground">Deliver to: </span>
          {order.deliveryAddress}
        </p>
      </div>

      {order.driver && (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/40 p-3">
          <Avatar>
            <AvatarImage src={order.driver.avatarUrl ?? undefined} />
            <AvatarFallback>{order.driver.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{order.driver.name}</p>
            <p className="text-xs text-muted-foreground">
              {order.vehicle ? `${order.vehicle.color} ${order.vehicle.make} ${order.vehicle.model} · ${order.vehicle.plateNumber}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {Number(order.driver.rating).toFixed(1)}
          </div>
          {order.driver.phone && (
            <Button size="icon-sm" variant="outline" render={<a href={`tel:${order.driver.phone}`} />}>
              <Phone className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="space-y-1 rounded-xl border border-border/70 p-3 text-sm">
        {order.items.map((item) => (
          <div key={item.name} className="flex justify-between text-muted-foreground">
            <span>
              {item.quantity} × {item.name}
            </span>
            <span>LKR {(Number(item.unitPrice) * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between text-muted-foreground">
          <span>Delivery fee</span>
          <span>LKR {Number(order.deliveryFee).toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold">
          <span>Total</span>
          <span>LKR {Number(order.totalAmount).toLocaleString()}</span>
        </div>
      </div>

      {CANCELLABLE.includes(order.status) && (
        <>
          {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
          <Button variant="outline" className="w-full" onClick={handleCancel} disabled={cancelling}>
            {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
            Cancel order
          </Button>
        </>
      )}

      {isTerminal && (
        <Button variant="outline" className="w-full" onClick={onClosed}>
          Back to orders
        </Button>
      )}
    </div>
  );
}
