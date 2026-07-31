import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { CreateProductForm } from "@/components/admin/create-product-form";
import { ProductRow } from "@/components/admin/product-row";
import { VendorActiveToggle } from "@/components/admin/vendor-active-toggle";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdminSession();
  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      association: { select: { name: true } },
      products: { orderBy: { createdAt: "desc" } },
      _count: { select: { orders: true } },
    },
  });
  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/admin/vendors"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to vendors
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
          <p className="text-sm text-muted-foreground">
            {vendor.addressLine} · {vendor.association.name}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={vendor.isActive ? "default" : "secondary"}>{vendor.isActive ? "active" : "inactive"}</Badge>
            <span className="text-sm text-muted-foreground">{vendor._count.orders} orders</span>
          </div>
        </div>
        <VendorActiveToggle vendorId={vendor.id} isActive={vendor.isActive} />
      </div>

      <CreateProductForm vendorId={vendor.id} />

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendor.products.map((p) => (
              <ProductRow
                key={p.id}
                product={{
                  id: p.id,
                  vendorId: vendor.id,
                  name: p.name,
                  description: p.description,
                  price: p.price.toString(),
                  category: p.category,
                  stock: p.stock,
                  isActive: p.isActive,
                  imageUrl: p.imageUrl,
                }}
              />
            ))}
          </TableBody>
        </Table>
        {vendor.products.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No products added yet.</p>
        )}
      </div>
    </div>
  );
}
