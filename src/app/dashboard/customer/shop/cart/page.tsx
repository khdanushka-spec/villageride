"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Package as PackageIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const vendorName = useCartStore((s) => s.vendorName);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const router = useRouter();

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Your cart is empty.
          <div className="mt-4">
            <Button render={<Link href="/dashboard/customer/shop" />}>Browse shops</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        <p className="text-sm text-muted-foreground">From {vendorName}</p>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <PackageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">LKR {item.price.toLocaleString()} each</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border px-1 py-0.5">
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => (item.quantity <= 1 ? removeItem(item.productId) : setQuantity(item.productId, item.quantity - 1))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-6 w-6"
                disabled={item.quantity >= item.stock}
                onClick={() => setQuantity(item.productId, item.quantity + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => removeItem(item.productId)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-between rounded-2xl border border-border bg-card p-4 text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-semibold">LKR {subtotal.toLocaleString()}</span>
      </div>

      <Button className="w-full" onClick={() => router.push("/dashboard/customer/shop/checkout")}>
        Proceed to checkout
      </Button>
    </div>
  );
}
