"use client";

import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { reviewDocumentAction } from "@/actions/association";
import { DOCUMENT_TYPE_LABELS } from "@/lib/compliance";
import type { DocumentType, DocumentStatus } from "@prisma/client";

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "destructive"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
};

type Props = {
  documentId: string;
  type: DocumentType;
  fileUrl: string;
  status: DocumentStatus;
  documentNumber: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
};

export function DocumentReviewRow({ documentId, type, fileUrl, status, documentNumber, expiresAt, rejectionReason }: Props) {
  const [pending, setPending] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setPending(true);
    setError(null);
    const result = await reviewDocumentAction(documentId, decision, reason);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setShowReject(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[type]}</p>
            <Badge variant={STATUS_VARIANT[status]}>{status.toLowerCase()}</Badge>
          </div>
          {documentNumber && <p className="text-xs text-muted-foreground">No. {documentNumber}</p>}
          {expiresAt && <p className="text-xs text-muted-foreground">Expires {expiresAt}</p>}
          {status === "REJECTED" && rejectionReason && (
            <p className="text-xs text-destructive">Rejected: {rejectionReason}</p>
          )}
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {status !== "APPROVED" && (
        <div className="flex flex-col gap-1.5 pt-1">
          {showReject ? (
            <div className="flex gap-1.5">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejection"
                className="h-8 text-xs"
              />
              <Button size="sm" variant="destructive" disabled={pending} onClick={() => decide("REJECTED")}>
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Button size="sm" disabled={pending} onClick={() => decide("APPROVED")}>
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>
                Reject
              </Button>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
