"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, LocateFixed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressSearch } from "@/components/booking/address-search";
import { useCartStore } from "@/lib/cart-store";
import { placeOrderAction, type ActionState } from "@/actions/orders";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/components/booking/location-map";

const LocationMap = dynamic(() => import("@/components/booking/location-map").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const vendorId = useCartStore((s) => s.vendorId);
  const vendorName = useCartStore((s) => s.vendorName);
  const clear = useCartStore((s) => s.clear);

  const [location, setLocation] = useState<(LatLng & { address: string }) | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "WALLET">("CASH");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    const result = await placeOrderAction(_prev, formData);
    if (result?.success) {
      clear();
      router.push("/dashboard/customer/orders");
    }
    return result;
  }, undefined);

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lng=${lng}`);
    const data = await res.json();
    return data?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocateError("Your browser doesn't support live location.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const address = await reverseGeocode(lat, lng);
          setLocation({ lat, lng, address });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Location access was denied. Search for your address instead."
            : "Couldn't get your live location. Search for your address instead."
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Your cart is empty.
      </div>
    );
  }

  const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium">From {vendorName}</p>
        {items.map((i) => (
          <div key={i.productId} className="flex justify-between text-sm text-muted-foreground">
            <span>
              {i.quantity} × {i.name}
            </span>
            <span>LKR {(i.price * i.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>Items total</span>
          <span>LKR {itemsTotal.toLocaleString()}</span>
        </div>
        <p className="text-xs text-muted-foreground">Delivery fee is calculated after you set your delivery address.</p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="vendorId" value={vendorId ?? ""} />
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity })))}
        />
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
        <input type="hidden" name="deliveryAddress" value={location?.address ?? ""} />
        <input type="hidden" name="deliveryLat" value={location?.lat ?? ""} />
        <input type="hidden" name="deliveryLng" value={location?.lng ?? ""} />

        <div className="relative">
          <AddressSearch
            label="Delivery address"
            placeholder="Search for your delivery address"
            value={location?.address ?? ""}
            onSelect={setLocation}
          />
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            title="Use my current location"
            className="absolute right-2 top-7 text-muted-foreground hover:text-primary disabled:opacity-50"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          </button>
        </div>
        {locateError && <p className="text-xs text-destructive">{locateError}</p>}

        {location && (
          <div className="h-40 overflow-hidden rounded-xl border border-border">
            <LocationMap pickup={location} className="h-full w-full" />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Payment method</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("CASH")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
                paymentMethod === "CASH" ? "border-primary bg-primary/10 text-primary" : "border-border"
              )}
            >
              <Banknote className="h-4 w-4" /> Cash on delivery
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("WALLET")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
                paymentMethod === "WALLET" ? "border-primary bg-primary/10 text-primary" : "border-border"
              )}
            >
              <CreditCard className="h-4 w-4" /> Wallet
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Delivery notes (optional)</Label>
          <Input id="notes" name="notes" placeholder="e.g. leave at the gate" />
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending || !location}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Place order
        </Button>
      </form>
    </div>
  );
}
