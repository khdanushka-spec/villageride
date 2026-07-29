"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction, type ActionState } from "@/actions/profile";

export function ProfileForm({
  name,
  email,
  phone,
}: {
  name: string;
  email: string | null;
  phone: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateProfileAction, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email ?? "Not set"} disabled />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input value={phone ?? "Not set"} disabled />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}
