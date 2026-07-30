import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { DocumentResubmitRow } from "@/components/driver/document-resubmit-row";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import { getRequiredDocuments, resolveEligibilityRules } from "@/lib/compliance";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;
}

// For <input type="date"> defaultValue, which needs YYYY-MM-DD.
function toDateInputValue(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : null;
}

export default async function DriverProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: {
      vehicles: true,
      documents: true,
      association: { select: { name: true } },
    },
  });
  if (!user || !driver) redirect("/login");

  const vehicle = driver.vehicles[0];

  const [associationRule, globalRule] = await Promise.all([
    prisma.driverEligibilityRule.findUnique({ where: { associationId: driver.associationId } }),
    prisma.driverEligibilityRule.findFirst({ where: { associationId: null } }),
  ]);
  const rules = resolveEligibilityRules(associationRule, globalRule);
  const requiredDocumentTypes = vehicle ? getRequiredDocuments(vehicle.type, rules) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">{driver.association.name}</p>
      </div>

      <ProfileForm name={user.name} email={user.email} phone={user.phone} />
      <ChangePasswordForm />

      <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Driver status</h3>
          <Badge variant={driver.status === "APPROVED" ? "default" : "secondary"}>{driver.status.toLowerCase()}</Badge>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="h-4 w-4 fill-accent text-accent" /> {Number(driver.ratingAvg).toFixed(1)} rating ·{" "}
          {driver.totalTrips} trips
        </div>
        <p className="text-sm text-muted-foreground">License: {driver.licenseNumber}</p>
      </div>

      {vehicle && (
        <div className="max-w-md space-y-2 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-medium">Vehicle</h3>
          <p className="text-sm text-muted-foreground">{VEHICLE_TYPE_LABELS[vehicle.type]}</p>
          <p className="text-sm">
            {vehicle.color} {vehicle.make} {vehicle.model} ({vehicle.year})
          </p>
          <p className="text-sm text-muted-foreground">Plate: {vehicle.plateNumber}</p>
        </div>
      )}

      <div className="max-w-md space-y-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <h3 className="font-medium">Documents</h3>
          <p className="text-xs text-muted-foreground">
            Update or renew any document — your association reviews it again before it&apos;s approved.
          </p>
        </div>
        {requiredDocumentTypes.map((type) => {
          const doc = driver.documents.find((d) => d.type === type);
          return (
            <DocumentResubmitRow
              key={type}
              type={type}
              status={doc?.status ?? "MISSING"}
              expiresAt={fmtDate(doc?.expiresAt ?? null)}
              expiresAtValue={toDateInputValue(doc?.expiresAt)}
              licenceIssuedAtValue={type === "DRIVER_LICENSE" ? toDateInputValue(driver.licenceIssuedAt) : null}
              rejectionReason={doc?.rejectionReason ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}
