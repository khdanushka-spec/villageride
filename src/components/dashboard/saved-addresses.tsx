"use client";

import { useActionState, useState } from "react";
import { Loader2, MapPin, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressSearch } from "@/components/booking/address-search";
import { saveAddressAction, deleteAddressAction, type ActionState } from "@/actions/addresses";

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  isFavorite: boolean;
};

export function SavedAddresses({ initialAddresses }: { initialAddresses: SavedAddress[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [picked, setPicked] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    const result = await saveAddressAction(_prev, formData);
    if (result?.success) {
      setPicked(null);
      const form = document.getElementById("add-address-form") as HTMLFormElement | null;
      form?.reset();
    }
    return result;
  }, undefined);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteAddressAction(id);
    setDeletingId(null);
    if (!result?.error) setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        {addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No saved addresses yet.
          </div>
        ) : (
          addresses.map((addr) => (
            <div key={addr.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {addr.isFavorite ? <Star className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{addr.label}</p>
                <p className="text-sm text-muted-foreground">{addr.address}</p>
              </div>
              <button
                onClick={() => handleDelete(addr.id)}
                disabled={deletingId === addr.id}
                className="text-muted-foreground hover:text-destructive"
              >
                {deletingId === addr.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      <form id="add-address-form" action={formAction} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-medium">Add a new address</h3>
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input id="label" name="label" placeholder="Home, Office, ..." required />
        </div>
        <AddressSearch
          label="Address"
          placeholder="Search for an address"
          value={picked?.address ?? ""}
          onSelect={setPicked}
        />
        <input type="hidden" name="address" value={picked?.address ?? ""} />
        <input type="hidden" name="lat" value={picked?.lat ?? ""} />
        <input type="hidden" name="lng" value={picked?.lng ?? ""} />
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending || !picked} className="w-full">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save address
        </Button>
      </form>
    </div>
  );
}
