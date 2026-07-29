import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DriverConsole } from "@/components/driver/driver-console";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, ShieldAlert, ShieldX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DriverDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { association: { select: { name: true } } },
  });
  if (!driver) redirect("/login");

  if (driver.status === "PENDING") {
    return (
      <div className="mx-auto max-w-lg">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Your application is under review</AlertTitle>
          <AlertDescription>
            {driver.association.name} is reviewing your documents and vehicle details. You&apos;ll be able to go
            online once you&apos;re approved.
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

  const activeTrip = await prisma.trip.findFirst({
    where: { driverId: driver.id, status: { in: ["ACCEPTED", "DRIVER_ARRIVED", "IN_PROGRESS"] } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Driver dashboard</h1>
        <p className="text-sm text-muted-foreground">{driver.association.name}</p>
      </div>
      <DriverConsole initialIsOnline={driver.isOnline} initialActiveTripId={activeTrip?.id ?? null} />
    </div>
  );
}
