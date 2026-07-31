import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { CreateVendorForm } from "@/components/admin/create-vendor-form";
import { VendorActiveToggle } from "@/components/admin/vendor-active-toggle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage() {
  await requireSuperAdminSession();

  const [vendors, associations] = await Promise.all([
    prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      include: { association: { select: { name: true } }, _count: { select: { products: true, orders: true } } },
    }),
    prisma.association.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, district: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendors &amp; Shop</h1>
        <p className="text-sm text-muted-foreground">
          Onboard local shops for the goods marketplace — customers browse and order, your driver network delivers.
        </p>
      </div>

      <CreateVendorForm associations={associations} />

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Association</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Link href={`/dashboard/admin/vendors/${v.id}`} className="font-medium hover:underline">
                    {v.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{v.district}</p>
                </TableCell>
                <TableCell className="text-sm">{v.association.name}</TableCell>
                <TableCell className="text-sm">{v._count.products}</TableCell>
                <TableCell className="text-sm">{v._count.orders}</TableCell>
                <TableCell>
                  <Badge variant={v.isActive ? "default" : "secondary"}>{v.isActive ? "active" : "inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <VendorActiveToggle vendorId={v.id} isActive={v.isActive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {vendors.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No vendors added yet.</p>
        )}
      </div>
    </div>
  );
}
