"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  startBackgroundCheckAction,
  clearBackgroundCheckAction,
  failBackgroundCheckAction,
} from "@/actions/association";
import type { BackgroundCheckStatus } from "@prisma/client";

const STATUS_VARIANT: Record<BackgroundCheckStatus, "default" | "secondary" | "destructive" | "outline"> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "secondary",
  CLEARED: "default",
  FAILED: "destructive",
};

export function BackgroundCheckPanel({
  driverId,
  status,
  notes,
}: {
  driverId: string;
  status: BackgroundCheckStatus;
  notes: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [showFail, setShowFail] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ error?: string } | undefined>) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result?.error) setError(result.error);
    else setShowFail(false);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Police clearance / background check</h3>
        <Badge variant={STATUS_VARIANT[status]}>{status.replaceAll("_", " ").toLowerCase()}</Badge>
      </div>
      {notes && <p className="text-sm text-muted-foreground">{notes}</p>}

      {status !== "CLEARED" && (
        <div className="flex flex-col gap-2">
          {showFail ? (
            <div className="flex gap-1.5">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for failing the check"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => run(() => failBackgroundCheckAction(driverId, reason))}
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm fail
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFail(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {status === "NOT_STARTED" && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => startBackgroundCheckAction(driverId))}>
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Mark in progress
                </Button>
              )}
              <Button size="sm" disabled={pending} onClick={() => run(() => clearBackgroundCheckAction(driverId))}>
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Clear
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowFail(true)}>
                Fail
              </Button>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
