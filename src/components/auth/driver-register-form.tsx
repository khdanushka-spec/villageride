"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registerDriverAction, type ActionState } from "@/actions/auth";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { VEHICLE_TYPE_LABELS, VEHICLE_TYPES } from "@/lib/vehicle-types";

type Association = { id: string; name: string; district: string };

export function DriverRegisterForm({ associations }: { associations: Association[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerDriverAction, undefined);
  useActionRedirect(state?.redirectTo);

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Association &amp; license
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="associationId">Village taxi association</Label>
            <Select name="associationId" required>
              <SelectTrigger id="associationId" className="w-full">
                <SelectValue placeholder={associations.length ? "Select your association" : "No associations yet"} />
              </SelectTrigger>
              <SelectContent>
                {associations.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {a.district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Driving license number</Label>
            <Input id="licenseNumber" name="licenseNumber" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseExpiry">License expiry</Label>
            <Input id="licenseExpiry" name="licenseExpiry" type="date" required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle type</Label>
            <Select name="vehicleType" required>
              <SelectTrigger id="vehicleType" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {VEHICLE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plateNumber">Plate number</Label>
            <Input id="plateNumber" name="plateNumber" placeholder="WP CAB-1234" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input id="make" name="make" placeholder="Toyota" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" placeholder="Prius" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input id="year" name="year" type="number" min={1980} max={new Date().getFullYear() + 1} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" placeholder="White" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Passenger capacity</Label>
            <Input id="capacity" name="capacity" type="number" min={1} max={60} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceExpiry">Insurance expiry</Label>
            <Input id="insuranceExpiry" name="insuranceExpiry" type="date" required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documents</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="licensePhoto">Driving license photo</Label>
            <Input id="licensePhoto" name="licensePhoto" type="file" accept="image/*,.pdf" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nicPhoto">National ID photo</Label>
            <Input id="nicPhoto" name="nicPhoto" type="file" accept="image/*,.pdf" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleRegPhoto">Vehicle registration (CR book)</Label>
            <Input id="vehicleRegPhoto" name="vehicleRegPhoto" type="file" accept="image/*,.pdf" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurancePhoto">Insurance certificate</Label>
            <Input id="insurancePhoto" name="insurancePhoto" type="file" accept="image/*,.pdf" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profilePhoto">Profile photo</Label>
            <Input id="profilePhoto" name="profilePhoto" type="file" accept="image/*" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehiclePhotos">Vehicle photos (up to 4)</Label>
            <Input id="vehiclePhotos" name="vehiclePhotos" type="file" accept="image/*" multiple />
          </div>
        </div>
      </section>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit for association approval
      </Button>
    </form>
  );
}
