"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleAssociationStatusAction } from "@/actions/admin";

export function AssociationStatusToggle({ associationId, status }: { associationId: string; status: string }) {
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState(status);

  async function toggle() {
    setPending(true);
    const next = current === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const result = await toggleAssociationStatusAction(associationId, next);
    setPending(false);
    if (!result?.error) setCurrent(next);
  }

  if (current === "PENDING") return null;

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={toggle}>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {current === "ACTIVE" ? "Suspend" : "Reactivate"}
    </Button>
  );
}
