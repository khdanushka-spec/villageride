"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { resubmitDocumentAction } from "@/actions/driver";
import { DOCUMENT_TYPE_LABELS, EXPIRING_DOCUMENT_TYPES } from "@/lib/compliance";
import type { DocumentType, DocumentStatus } from "@prisma/client";

const FOLDER_BY_TYPE: Partial<Record<DocumentType, string>> = {
  DRIVER_LICENSE: "documents/license",
  NATIONAL_ID: "documents/nic",
  VEHICLE_REGISTRATION: "documents/vehicle-registration",
  INSURANCE: "documents/insurance",
  REVENUE_LICENCE: "documents/revenue-licence",
  VEHICLE_EMISSION_TEST: "documents/emission-test",
  POLICE_CLEARANCE: "documents/police-clearance",
  GRAMA_NILADHARI_CERTIFICATE: "documents/grama-niladhari",
  MEDICAL_CERTIFICATE: "documents/medical",
  VEHICLE_FITNESS_CERTIFICATE: "documents/fitness",
};

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "destructive"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
};

type Status = DocumentStatus | "MISSING";

export function DocumentResubmitRow({
  type,
  status,
  expiresAt,
  rejectionReason,
}: {
  type: DocumentType;
  status: Status;
  expiresAt: string | null;
  rejectionReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const needsExpiry = EXPIRING_DOCUMENT_TYPES.includes(type);
  const needsIssueDate = type === "DRIVER_LICENSE";

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      setPending(false);
      setError("Choose a file.");
      return;
    }

    try {
      const folder = FOLDER_BY_TYPE[type] ?? "documents/other";
      const blob = await upload(`${folder}/${crypto.randomUUID()}${extensionOf(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/driver-documents/upload",
      });

      const payload = new FormData();
      payload.set("type", type);
      payload.set("fileUrl", blob.url);
      const expiresAtValue = formData.get("expiresAt") as string;
      if (expiresAtValue) payload.set("expiresAt", expiresAtValue);
      const licenceIssuedAtValue = formData.get("licenceIssuedAt") as string;
      if (licenceIssuedAtValue) payload.set("licenceIssuedAt", licenceIssuedAtValue);

      const result = await resubmitDocumentAction(undefined, payload);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[type]}</p>
          {expiresAt && <p className="text-xs text-muted-foreground">Expires {expiresAt}</p>}
          {status === "REJECTED" && rejectionReason && (
            <p className="text-xs text-destructive">Rejected: {rejectionReason}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={status === "MISSING" ? "destructive" : STATUS_VARIANT[status]}>
            {status === "MISSING" ? "missing" : status.toLowerCase()}
          </Badge>
          {!open && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOpen(true);
                setSuccess(false);
              }}
            >
              {status === "APPROVED" ? "Renew" : "Update"}
            </Button>
          )}
        </div>
      </div>

      {success && <p className="text-xs text-success">Submitted for your association to review.</p>}

      {open && (
        <form action={handleSubmit} className="space-y-2 border-t border-border pt-2">
          <Input name="file" type="file" accept="image/*,.pdf" required />
          {needsIssueDate && (
            <div className="space-y-1">
              <Label htmlFor={`issued-${type}`} className="text-xs">
                Licence issue date
              </Label>
              <Input id={`issued-${type}`} name="licenceIssuedAt" type="date" required />
            </div>
          )}
          {needsExpiry && (
            <div className="space-y-1">
              <Label htmlFor={`expiry-${type}`} className="text-xs">
                New expiry date
              </Label>
              <Input id={`expiry-${type}`} name="expiresAt" type="date" required />
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-1.5">
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submit
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
