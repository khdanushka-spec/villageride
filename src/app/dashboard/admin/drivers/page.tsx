import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserActiveToggle } from "@/components/admin/user-active-toggle";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

export default async function AdminDriversPage() {
  await requireSuperAdminSession();

  const drivers = await prisma.driver.findMany({
    orderBy: { joinedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
      association: { select: { name: true } },
      vehicles: { take: 1 },
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
        <p className="text-sm text-muted-foreground">Every driver across every association.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Association</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>
                  <p className="font-medium">{driver.user.name}</p>
                  <p className="text-xs text-muted-foreground">{driver.user.email}</p>
                </TableCell>
                <TableCell className="text-sm">{driver.association.name}</TableCell>
                <TableCell className="text-sm">
                  {driver.vehicles[0] ? VEHICLE_TYPE_LABELS[driver.vehicles[0].type] : "—"}
                </TableCell>
                <TableCell className="text-sm">{Number(driver.ratingAvg).toFixed(1)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[driver.status]}>{driver.status.toLowerCase()}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UserActiveToggle userId={driver.user.id} isActive={driver.user.isActive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {drivers.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No drivers yet.</p>
        )}
      </div>
    </div>
  );
}
