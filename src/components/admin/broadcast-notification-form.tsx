"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { broadcastNotificationAction, type ActionState } from "@/actions/admin";

export function BroadcastNotificationForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(broadcastNotificationAction, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" rows={4} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="audience">Send to</Label>
        <Select name="audience" defaultValue="ALL">
          <SelectTrigger id="audience" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Everyone</SelectItem>
            <SelectItem value="CUSTOMER">Customers</SelectItem>
            <SelectItem value="DRIVER">Drivers</SelectItem>
            <SelectItem value="ASSOCIATION_ADMIN">Association admins</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Send notification
      </Button>
    </form>
  );
}
