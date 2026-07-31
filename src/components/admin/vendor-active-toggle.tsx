"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleVendorActiveAction } from "@/actions/vendor";

export function VendorActiveToggle({ vendorId, isActive }: { vendorId: string; isActive: boolean }) {
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(isActive);

  async function toggle() {
    setPending(true);
    const result = await toggleVendorActiveAction(vendorId, !active);
    setPending(false);
    if (!result?.error) setActive(!active);
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={toggle}>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {active ? "Deactivate" : "Activate"}
    </Button>
  );
}
