import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserActiveToggle } from "@/components/admin/user-active-toggle";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requireSuperAdminSession();

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
      _count: { select: { trips: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">Everyone who has booked a ride on VillageRide.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Rides</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.user.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.user.email ?? c.user.phone}</TableCell>
                <TableCell className="text-sm">{c._count.trips}</TableCell>
                <TableCell>
                  <Badge variant={c.user.isActive ? "default" : "destructive"}>
                    {c.user.isActive ? "active" : "deactivated"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UserActiveToggle userId={c.user.id} isActive={c.user.isActive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {customers.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No customers yet.</p>
        )}
      </div>
    </div>
  );
}
