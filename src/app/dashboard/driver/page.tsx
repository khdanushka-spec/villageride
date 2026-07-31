import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DriverConsole } from "@/components/driver/driver-console";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, ShieldAlert, ShieldX, FileWarning, TriangleAlert } from "lucide-react";
import { reconcileDriverCompliance } from "@/lib/enforce-compliance";

export const dynamic = "force-dynamic";

export default async function DriverDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const driverRow = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driverRow) redirect("/login");

  // Catch a lapsed document or a performance breach the moment the driver
  // opens the app, rather than only at the point they try to go online.
  const reconciled = await reconcileDriverCompliance(driverRow.id);

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { association: { select: { name: true } } },
  });
  if (!driver) redirect("/login");

  if (driver.status === "PENDING" || driver.status === "DOCUMENTS_UNDER_REVIEW") {
    return (
      <div className="mx-auto max-w-lg">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Your application is under review</AlertTitle>
          <AlertDescription>
            {driver.association.name} is reviewing your documents and vehicle details. You&apos;ll be able to go
            online once every document is verified.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (driver.status === "BACKGROUND_CHECK") {
    return (
      <div className="mx-auto max-w-lg">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Police clearance check in progress</AlertTitle>
          <AlertDescription>
            Your documents are verified. {driver.association.name} is completing your background check — you&apos;ll
            be able to go online once it clears.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (driver.status === "REJECTED") {
    return (
      <div className="mx-auto max-w-lg">
        <Alert variant="destructive">
          <ShieldX className="h-4 w-4" />
          <AlertTitle>Application not approved</AlertTitle>
          <AlertDescription>
            {driver.rejectionReason || "Your association did not approve this application. Contact them for details."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (driver.status === "SUSPENDED") {
    return (
      <div className="mx-auto max-w-lg">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Account suspended</AlertTitle>
          <AlertDescription>
            Your account has been suspended by {driver.association.name}. Contact them to resolve this.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (driver.status === "DEACTIVATED") {
    return (
      <div className="mx-auto max-w-lg">
        <Alert variant="destructive">
          <ShieldX className="h-4 w-4" />
          <AlertTitle>Account deactivated</AlertTitle>
          <AlertDescription>
            {driver.deactivationReason || "Your account no longer meets the platform's driving standards."} Contact{" "}
            {driver.association.name} to review this.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (driver.status === "COMPLIANCE_HOLD") {
    return (
      <div className="mx-auto max-w-lg space-y-3">
        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>Update required before you can go online</AlertTitle>
          <AlertDescription>
            {driver.complianceHoldReason || "A required document has lapsed."} If this is a document you can renew,
            update it below — otherwise contact {driver.association.name}.
          </AlertDescription>
        </Alert>
        <Button nativeButton={false} render={<Link href="/dashboard/driver/profile" />} className="w-full">
          Update my documents
        </Button>
      </div>
    );
  }

  const [activeTrip, activeDelivery] = await Promise.all([
    prisma.trip.findFirst({
      where: { driverId: driver.id, status: { in: ["ACCEPTED", "DRIVER_ARRIVED", "IN_PROGRESS"] } },
    }),
    prisma.order.findFirst({
      where: { driverId: driver.id, status: { in: ["DRIVER_ASSIGNED", "PICKED_UP"] } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Driver dashboard</h1>
        <p className="text-sm text-muted-foreground">{driver.association.name}</p>
      </div>
      {reconciled.warnings.length > 0 && (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Renew soon to avoid being taken offline</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {reconciled.warnings.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      <DriverConsole
        initialIsOnline={driver.isOnline}
        initialActiveTripId={activeTrip?.id ?? null}
        initialActiveDeliveryId={activeDelivery?.id ?? null}
      />
    </div>
  );
}
