import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { CreateAssociationForm } from "@/components/admin/create-association-form";
import { AssociationStatusToggle } from "@/components/admin/association-status-toggle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  PENDING: "secondary",
  SUSPENDED: "destructive",
};

export default async function AdminAssociationsPage() {
  await requireSuperAdminSession();

  const associations = await prisma.association.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { drivers: true, trips: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Associations</h1>
        <p className="text-sm text-muted-foreground">Onboard village taxi associations and their admins.</p>
      </div>

      <CreateAssociationForm />

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Association</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Drivers</TableHead>
              <TableHead>Trips</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {associations.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-sm">{a.district}</TableCell>
                <TableCell className="text-sm">{a._count.drivers}</TableCell>
                <TableCell className="text-sm">{a._count.trips}</TableCell>
                <TableCell className="text-sm">{Number(a.commissionPercent)}%</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[a.status]}>{a.status.toLowerCase()}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AssociationStatusToggle associationId={a.id} status={a.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
