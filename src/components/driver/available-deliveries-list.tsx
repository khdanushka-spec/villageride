"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptOrderAction } from "@/actions/orders";

type AvailableOrder = {
  id: string;
  vendorName: string;
  vendorAddress: string;
  deliveryAddress: string;
  distanceKm: string | null;
  deliveryFee: string;
  requestedAt: string;
};

export function AvailableDeliveriesList({ onAccepted }: { onAccepted: (orderId: string) => void }) {
  const [orders, setOrders] = useState<AvailableOrder[] | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/driver/available-orders");
      if (!cancelled && res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleAccept(orderId: string) {
    setAcceptingId(orderId);
    setError(null);
    const result = await acceptOrderAction(orderId);
    setAcceptingId(null);
    if (result?.error) setError(result.error);
    else onAccepted(orderId);
  }

  if (orders === null) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking for delivery requests…
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No delivery requests nearby right now. New requests appear here automatically.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {orders.map((order) => (
        <div key={order.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{order.vendorName}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 text-primary" /> {order.vendorAddress}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Navigation className="h-3 w-3 text-accent" /> {order.deliveryAddress}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">LKR {Number(order.deliveryFee).toLocaleString()}</p>
            {order.distanceKm && <p className="text-xs text-muted-foreground">{Number(order.distanceKm).toFixed(1)} km</p>}
          </div>
          <Button size="sm" disabled={acceptingId === order.id} onClick={() => handleAccept(order.id)}>
            {acceptingId === order.id && <Loader2 className="h-4 w-4 animate-spin" />}
            Accept
          </Button>
        </div>
      ))}
    </div>
  );
}
