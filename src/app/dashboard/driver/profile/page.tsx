import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

const DOC_LABELS: Record<string, string> = {
  DRIVER_LICENSE: "Driving license",
  NATIONAL_ID: "National ID",
  VEHICLE_REGISTRATION: "Vehicle registration",
  INSURANCE: "Insurance",
  VEHICLE_PHOTO: "Vehicle photo",
  PROFILE_PHOTO: "Profile photo",
};

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">{driver.association.name}</p>
      </div>

      <ProfileForm name={user.name} email={user.email} phone={user.phone} />

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

      <div className="max-w-md space-y-2 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-medium">Documents</h3>
        {driver.documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between text-sm">
            <span>{DOC_LABELS[doc.type] ?? doc.type}</span>
            <Badge variant={doc.status === "APPROVED" ? "default" : doc.status === "REJECTED" ? "destructive" : "secondary"}>
              {doc.status.toLowerCase()}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
