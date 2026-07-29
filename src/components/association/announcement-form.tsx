"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createAnnouncementAction, type ActionState } from "@/actions/association";

export function AnnouncementForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAnnouncementAction, undefined);

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" rows={3} required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Post announcement
      </Button>
    </form>
  );
}
