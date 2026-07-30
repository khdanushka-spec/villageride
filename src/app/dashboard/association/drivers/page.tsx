import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAssociationForAdmin } from "@/lib/association-admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DriverRowActions } from "@/components/association/driver-row-actions";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import { DRIVER_STATUS_LABELS, DRIVER_STATUS_VARIANT } from "@/lib/compliance";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AssociationDriversPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const reviewOnly = status === "review";
  const association = await requireAssociationForAdmin();

  const drivers = await prisma.driver.findMany({
    where: { associationId: association.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      vehicles: { take: 1 },
      documents: { select: { status: true } },
    },
    orderBy: { joinedAt: "desc" },
  });

  const needsReview = (d: (typeof drivers)[number]) =>
    d.status === "PENDING" || d.documents.some((doc) => doc.status === "PENDING");

  const reviewCount = drivers.filter(needsReview).length;

  // Whatever needs the association's attention floats to the top; the rest
  // keep their normal recency order underneath.
  const sorted = [...drivers].sort((a, b) => Number(needsReview(b)) - Number(needsReview(a)));
  const visible = reviewOnly ? sorted.filter(needsReview) : sorted;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
        <p className="text-sm text-muted-foreground">Review applications and manage your association&apos;s drivers.</p>
      </div>

      <div className="flex gap-2">
        <Link
          href="/dashboard/association/drivers"
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            !reviewOnly ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All drivers
        </Link>
        <Link
          href="/dashboard/association/drivers?status=review"
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            reviewOnly ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          Needs review{reviewCount > 0 && ` (${reviewCount})`}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((driver) => {
              const flagged = needsReview(driver);
              return (
                <TableRow key={driver.id} className={cn(flagged && "bg-primary/5")}>
                  <TableCell>
                    <Link href={`/dashboard/association/drivers/${driver.id}`} className="font-medium hover:underline">
                      {driver.user.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{driver.user.email ?? driver.user.phone}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {driver.vehicles[0] ? VEHICLE_TYPE_LABELS[driver.vehicles[0].type] : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{Number(driver.ratingAvg).toFixed(1)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={DRIVER_STATUS_VARIANT[driver.status]}>{DRIVER_STATUS_LABELS[driver.status]}</Badge>
                      {flagged && driver.status !== "PENDING" && (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          Document to review
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DriverRowActions driverId={driver.id} status={driver.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {visible.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {reviewOnly ? "Nothing waiting on you right now." : "No drivers have registered yet."}
          </p>
        )}
      </div>
    </div>
  );
}
