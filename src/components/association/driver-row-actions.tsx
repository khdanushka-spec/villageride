"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  approveDriverAction,
  rejectDriverAction,
  suspendDriverAction,
  reinstateDriverAction,
} from "@/actions/association";

export function DriverRowActions({ driverId, status }: { driverId: string; status: string }) {
  const [pending, setPending] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ error?: string } | undefined>) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result?.error) setError(result.error);
  }

  if (showReject) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-1">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="h-8 w-40 text-xs"
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => rejectDriverAction(driverId, reason))}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {status === "PENDING" && (
          <>
            <Button size="sm" disabled={pending} onClick={() => run(() => approveDriverAction(driverId))}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>
              Reject
            </Button>
          </>
        )}
        {status === "APPROVED" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => suspendDriverAction(driverId))}>
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Suspend
          </Button>
        )}
        {status === "SUSPENDED" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => reinstateDriverAction(driverId))}>
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Reinstate
          </Button>
        )}
        {status === "REJECTED" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => approveDriverAction(driverId))}>
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Approve anyway
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
