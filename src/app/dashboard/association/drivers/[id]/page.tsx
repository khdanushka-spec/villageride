import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAssociationForAdmin } from "@/lib/association-admin";
import { Badge } from "@/components/ui/badge";
import { DriverRowActions } from "@/components/association/driver-row-actions";
import { DocumentReviewRow } from "@/components/association/document-review-row";
import { BackgroundCheckPanel } from "@/components/association/background-check-panel";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import { LICENCE_CLASS_LABELS } from "@/lib/licence-classes";
import {
  DRIVER_STATUS_LABELS,
  DRIVER_STATUS_VARIANT,
  evaluateDriverCompliance,
  getRequiredDocuments,
  resolveEligibilityRules,
} from "@/lib/compliance";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;
}

export default async function DriverReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const association = await requireAssociationForAdmin();

  const driver = await prisma.driver.findFirst({
    where: { id, associationId: association.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      vehicles: { take: 1 },
      documents: { orderBy: { type: "asc" } },
    },
  });
  if (!driver) notFound();

  const [associationRule, globalRule] = await Promise.all([
    prisma.driverEligibilityRule.findUnique({ where: { associationId: association.id } }),
    prisma.driverEligibilityRule.findFirst({ where: { associationId: null } }),
  ]);
  const rules = resolveEligibilityRules(associationRule, globalRule);
  const vehicle = driver.vehicles[0] ?? null;
  const required = vehicle ? getRequiredDocuments(vehicle.type, rules) : [];
  const compliance = evaluateDriverCompliance(driver, vehicle, driver.documents, rules);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/association/drivers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to drivers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{driver.user.name}</h1>
          <p className="text-sm text-muted-foreground">{driver.user.email ?? driver.user.phone}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={DRIVER_STATUS_VARIANT[driver.status]}>{DRIVER_STATUS_LABELS[driver.status]}</Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {Number(driver.ratingAvg).toFixed(1)} ·{" "}
              {driver.totalTrips} trips
            </span>
          </div>
        </div>
        <DriverRowActions driverId={driver.id} status={driver.status} />
      </div>

      {!compliance.eligible && driver.status === "APPROVED" && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">This driver has outstanding compliance issues</p>
          <ul className="mt-1 list-inside list-disc text-sm text-destructive/90">
            {compliance.blockers.map((b) => (
              <li key={b.code}>{b.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-medium">Identity</h3>
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">NIC</dt>
            <dd>{driver.nicNumber ?? "—"}</dd>
            <dt className="text-muted-foreground">Date of birth</dt>
            <dd>{fmtDate(driver.dateOfBirth) ?? "—"}</dd>
            <dt className="text-muted-foreground">Address</dt>
            <dd>{driver.addressLine ?? "—"}</dd>
            <dt className="text-muted-foreground">City / district</dt>
            <dd>
              {driver.city ?? "—"}, {driver.district ?? "—"}
            </dd>
            <dt className="text-muted-foreground">GN division</dt>
            <dd>{driver.gnDivision ?? "—"}</dd>
          </dl>
        </div>

        <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-medium">Licence &amp; vehicle</h3>
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Licence number</dt>
            <dd>{driver.licenseNumber}</dd>
            <dt className="text-muted-foreground">Licence class</dt>
            <dd>{driver.licenceClass ? LICENCE_CLASS_LABELS[driver.licenceClass] : "—"}</dd>
            <dt className="text-muted-foreground">Licence expiry</dt>
            <dd>{fmtDate(driver.licenseExpiry)}</dd>
            <dt className="text-muted-foreground">Vehicle</dt>
            <dd>{vehicle ? `${VEHICLE_TYPE_LABELS[vehicle.type]} — ${vehicle.plateNumber}` : "—"}</dd>
            <dt className="text-muted-foreground">Revenue licence</dt>
            <dd>
              {vehicle?.revenueLicenceNo ?? "—"} ({fmtDate(vehicle?.revenueLicenceExpiry ?? null) ?? "—"})
            </dd>
            <dt className="text-muted-foreground">Emission test</dt>
            <dd>{vehicle?.emissionTestExempt ? "Exempt" : fmtDate(vehicle?.emissionTestExpiry ?? null) ?? "—"}</dd>
          </dl>
        </div>
      </div>

      <BackgroundCheckPanel
        driverId={driver.id}
        status={driver.backgroundCheckStatus}
        notes={driver.backgroundCheckNotes}
      />

      <div className="space-y-3">
        <h3 className="font-medium">Documents</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {driver.documents.map((doc) => (
            <DocumentReviewRow
              key={doc.id}
              documentId={doc.id}
              type={doc.type}
              fileUrl={doc.fileUrl}
              status={doc.status}
              documentNumber={doc.documentNumber}
              expiresAt={fmtDate(doc.expiresAt)}
              rejectionReason={doc.rejectionReason}
            />
          ))}
        </div>
        {required.some((type) => !driver.documents.some((d) => d.type === type)) && (
          <p className="text-sm text-muted-foreground">
            Missing:{" "}
            {required
              .filter((type) => !driver.documents.some((d) => d.type === type))
              .join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
