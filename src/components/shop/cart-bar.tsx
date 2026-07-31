"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";

export function CartBar() {
  const items = useCartStore((s) => s.items);
  const vendorName = useCartStore((s) => s.vendorName);

  if (items.length === 0) return null;

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <Link
      href="/dashboard/customer/shop/cart"
      className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] sm:inset-x-auto sm:right-6"
    >
      <span className="flex items-center gap-2 font-medium">
        <ShoppingCart className="h-4 w-4" />
        {count} item{count === 1 ? "" : "s"} · {vendorName}
      </span>
      <span className="font-semibold">LKR {subtotal.toLocaleString()}</span>
    </Link>
  );
}
