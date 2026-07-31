"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressSearch } from "@/components/booking/address-search";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { createVendorAction, type ActionState } from "@/actions/vendor";
import type { LatLng } from "@/components/booking/location-map";

const LocationMap = dynamic(() => import("@/components/booking/location-map").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

export function CreateVendorForm({ associations }: { associations: { id: string; name: string; district: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createVendorAction, undefined);
  const [location, setLocation] = useState<(LatLng & { address: string }) | null>(null);
  const [district, setDistrict] = useState("");

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-medium">Add a new vendor</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Shop name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="associationId">Fulfilled by association</Label>
          <Select name="associationId" required>
            <SelectTrigger id="associationId" className="w-full">
              <SelectValue placeholder="Choose an association" />
            </SelectTrigger>
            <SelectContent>
              {associations.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.district})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="What this shop sells" />
      </div>

      <AddressSearch
        label="Shop address"
        placeholder="Search for the shop's address"
        value={location?.address ?? ""}
        onSelect={(result) => setLocation(result)}
      />
      <input type="hidden" name="addressLine" value={location?.address ?? ""} />
      <input type="hidden" name="lat" value={location?.lat ?? ""} />
      <input type="hidden" name="lng" value={location?.lng ?? ""} />

      {location && (
        <div className="h-40 overflow-hidden rounded-xl border border-border">
          <LocationMap pickup={location} className="h-full w-full" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="district">District</Label>
          <Input
            id="district"
            name="district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPhone">Contact phone</Label>
          <Input id="contactPhone" name="contactPhone" type="tel" />
        </div>
      </div>

      <ImageUploadField name="logoUrl" label="Shop logo (optional)" folder="vendors/logos" />

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}
      <Button type="submit" disabled={pending || !location}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add vendor
      </Button>
    </form>
  );
}
