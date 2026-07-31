import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CartBar } from "@/components/shop/cart-bar";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        <p className="text-sm text-muted-foreground">Order from local shops — delivered by your village association.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v) => (
          <Link
            key={v.id}
            href={`/dashboard/customer/shop/${v.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            {v.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{v.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {v.district} · {v._count.products} item{v._count.products === 1 ? "" : "s"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {vendors.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No shops available in your area yet.
        </div>
      )}

      <CartBar />
    </div>
  );
}
