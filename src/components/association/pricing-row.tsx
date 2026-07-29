"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePricingRuleAction, type ActionState } from "@/actions/association";
import { VEHICLE_TYPE_ICONS, VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import type { VehicleType } from "@prisma/client";

export function PricingRow({
  vehicleType,
  baseFare,
  perKmRate,
  perMinuteRate,
  minimumFare,
  action = savePricingRuleAction,
}: {
  vehicleType: VehicleType;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  action?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const Icon = VEHICLE_TYPE_ICONS[vehicleType];

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-6 sm:items-end">
      <input type="hidden" name="vehicleType" value={vehicleType} />
      <div className="flex items-center gap-2 sm:col-span-1">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{VEHICLE_TYPE_LABELS[vehicleType]}</span>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Base fare</Label>
        <Input name="baseFare" type="number" min={0} step="0.01" defaultValue={baseFare} className="h-8" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Per km</Label>
        <Input name="perKmRate" type="number" min={0} step="0.01" defaultValue={perKmRate} className="h-8" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Per minute</Label>
        <Input name="perMinuteRate" type="number" min={0} step="0.01" defaultValue={perMinuteRate} className="h-8" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Minimum fare</Label>
        <Input name="minimumFare" type="number" min={0} step="0.01" defaultValue={minimumFare} className="h-8" />
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending} className="w-full">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </Button>
        {state?.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
        {state?.success && <p className="mt-1 text-xs text-success">Saved</p>}
      </div>
    </form>
  );
}
