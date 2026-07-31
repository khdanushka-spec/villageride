import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package as PackageIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { CartBar } from "@/components/shop/cart-bar";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/products";
import type { ProductCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function VendorShopPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId, isActive: true },
    include: { products: { where: { isActive: true }, orderBy: { name: "asc" } } },
  });
  if (!vendor) notFound();

  const byCategory = new Map<ProductCategory, typeof vendor.products>();
  for (const p of vendor.products) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }

  return (
    <div className="space-y-6 pb-20">
      <Link
        href="/dashboard/customer/shop"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to shops
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
        <p className="text-sm text-muted-foreground">{vendor.addressLine}</p>
        {vendor.description && <p className="mt-1 text-sm text-muted-foreground">{vendor.description}</p>}
      </div>

      {vendor.products.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          This shop hasn&apos;t listed anything yet.
        </div>
      )}

      {[...byCategory.entries()].map(([category, products]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {PRODUCT_CATEGORY_LABELS[category]}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <PackageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-sm font-semibold">LKR {Number(p.price).toLocaleString()}</p>
                </div>
                <AddToCartButton
                  vendorId={vendor.id}
                  vendorName={vendor.name}
                  product={{ id: p.id, name: p.name, price: Number(p.price), imageUrl: p.imageUrl, stock: p.stock }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <CartBar />
    </div>
  );
}
