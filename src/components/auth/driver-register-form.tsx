"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registerDriverAction, type ActionState } from "@/actions/auth";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { VEHICLE_TYPE_LABELS, VEHICLE_TYPES } from "@/lib/vehicle-types";
import { LICENCE_CLASS_LABELS, LICENCE_CLASSES, requiresFitnessCertificate } from "@/lib/licence-classes";
import { SRI_LANKA_DISTRICTS } from "@/lib/districts";
import type { VehicleType } from "@prisma/client";

type Association = { id: string; name: string; district: string };

export function DriverRegisterForm({ associations }: { associations: Association[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerDriverAction, undefined);
  useActionRedirect(state?.redirectTo);

  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [emissionExempt, setEmissionExempt] = useState(false);
  const needsFitnessCert = vehicleType ? requiresFitnessCertificate(vehicleType) : false;

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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identity</h2>
        <p className="text-sm text-muted-foreground">
          Required for the police clearance and Grama Niladhari checks your association runs before approving you.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nicNumber">NIC number</Label>
            <Input id="nicNumber" name="nicNumber" placeholder="200012345678 or 991234567V" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="addressLine">Address</Label>
            <Input id="addressLine" name="addressLine" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City / town</Label>
            <Input id="city" name="city" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Select name="district" required>
              <SelectTrigger id="district" className="w-full">
                <SelectValue placeholder="Select your district" />
              </SelectTrigger>
              <SelectContent>
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="gnDivision">Grama Niladhari division</Label>
            <Input id="gnDivision" name="gnDivision" placeholder="e.g. 517 - Kohuwala" required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Association &amp; driving licence
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
            <Label htmlFor="licenseNumber">Driving licence number</Label>
            <Input id="licenseNumber" name="licenseNumber" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenceClass">Licence class</Label>
            <Select name="licenceClass" required>
              <SelectTrigger id="licenceClass" className="w-full">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {LICENCE_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {LICENCE_CLASS_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenceIssuedAt">Licence issue date</Label>
            <Input id="licenceIssuedAt" name="licenceIssuedAt" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseExpiry">Licence expiry</Label>
            <Input id="licenseExpiry" name="licenseExpiry" type="date" required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle type</Label>
            <Select name="vehicleType" required onValueChange={(v) => setVehicleType(v as VehicleType)}>
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
            <Label htmlFor="color">Colour</Label>
            <Input id="color" name="color" placeholder="White" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Passenger capacity</Label>
            <Input id="capacity" name="capacity" type="number" min={1} max={60} required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Insurance</h2>
        <p className="text-sm text-muted-foreground">Valid insurance is required — at minimum third-party liability.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="insurerName">Insurance company</Label>
            <Input id="insurerName" name="insurerName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurancePolicyNo">Policy number</Label>
            <Input id="insurancePolicyNo" name="insurancePolicyNo" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="insuranceExpiry">Insurance expiry</Label>
            <Input id="insuranceExpiry" name="insuranceExpiry" type="date" required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Revenue licence &amp; emission test
        </h2>
        <p className="text-sm text-muted-foreground">
          The annual revenue licence requires a valid insurance certificate and a Vehicle Emission Test (VET)
          certificate to be issued.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="revenueLicenceNo">Revenue licence number</Label>
            <Input id="revenueLicenceNo" name="revenueLicenceNo" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="revenueLicenceExpiry">Revenue licence expiry</Label>
            <Input id="revenueLicenceExpiry" name="revenueLicenceExpiry" type="date" required />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="emissionTestExempt"
            name="emissionTestExempt"
            checked={emissionExempt}
            onCheckedChange={(c) => setEmissionExempt(c === true)}
          />
          <Label htmlFor="emissionTestExempt" className="font-normal">
            My vehicle is exempt from the emission test (brand new in its first year, or registered before 1976)
          </Label>
        </div>
        {!emissionExempt && (
          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="emissionTestExpiry">Emission test certificate expiry</Label>
            <Input id="emissionTestExpiry" name="emissionTestExpiry" type="date" required={!emissionExempt} />
          </div>
        )}
      </section>

      {needsFitnessCert && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Certificate of fitness
          </h2>
          <p className="text-sm text-muted-foreground">
            Required for {VEHICLE_TYPE_LABELS[vehicleType as VehicleType]}s.
          </p>
          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="fitnessCertExpiry">Certificate expiry</Label>
            <Input id="fitnessCertExpiry" name="fitnessCertExpiry" type="date" required={needsFitnessCert} />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Police clearance &amp; medical
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="policeClearanceNo">Police clearance certificate number</Label>
            <Input id="policeClearanceNo" name="policeClearanceNo" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policeClearanceIssuedAt">Issued on</Label>
            <Input id="policeClearanceIssuedAt" name="policeClearanceIssuedAt" type="date" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="medicalCertExpiry">Medical certificate expiry</Label>
            <Input id="medicalCertExpiry" name="medicalCertExpiry" type="date" required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documents</h2>
        <p className="text-sm text-muted-foreground">Photos or scans — your association verifies each one.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="licensePhoto">Driving licence photo</Label>
            <Input id="licensePhoto" name="licensePhoto" type="file" accept="image/*,.pdf" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nicPhoto">NIC photo</Label>
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
            <Label htmlFor="revenueLicencePhoto">Revenue licence</Label>
            <Input id="revenueLicencePhoto" name="revenueLicencePhoto" type="file" accept="image/*,.pdf" required />
          </div>
          {!emissionExempt && (
            <div className="space-y-2">
              <Label htmlFor="emissionTestPhoto">Emission test certificate</Label>
              <Input id="emissionTestPhoto" name="emissionTestPhoto" type="file" accept="image/*,.pdf" required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="policeClearancePhoto">Police clearance certificate</Label>
            <Input id="policeClearancePhoto" name="policeClearancePhoto" type="file" accept="image/*,.pdf" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gramaNiladhariPhoto">Grama Niladhari certificate</Label>
            <Input id="gramaNiladhariPhoto" name="gramaNiladhariPhoto" type="file" accept="image/*,.pdf" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medicalCertPhoto">Medical certificate</Label>
            <Input id="medicalCertPhoto" name="medicalCertPhoto" type="file" accept="image/*,.pdf" required />
          </div>
          {needsFitnessCert && (
            <div className="space-y-2">
              <Label htmlFor="fitnessCertPhoto">Certificate of fitness</Label>
              <Input id="fitnessCertPhoto" name="fitnessCertPhoto" type="file" accept="image/*,.pdf" required />
            </div>
          )}
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
