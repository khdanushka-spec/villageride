"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAssociationAction, type ActionState } from "@/actions/admin";

export function CreateAssociationForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAssociationAction, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-medium">Add a new association</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Association name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">URL slug</Label>
          <Input id="slug" name="slug" placeholder="matara-taxi" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="district">District</Label>
          <Input id="district" name="district" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commissionPercent">Commission %</Label>
          <Input id="commissionPercent" name="commissionPercent" type="number" min={0} max={100} defaultValue={10} required />
        </div>
      </div>

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="adminName">Admin name</Label>
          <Input id="adminName" name="adminName" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminEmail">Admin email</Label>
          <Input id="adminEmail" name="adminEmail" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminPassword">Admin password</Label>
          <Input id="adminPassword" name="adminPassword" type="password" minLength={8} required />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Create association
      </Button>
    </form>
  );
}
