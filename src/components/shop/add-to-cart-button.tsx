"use client";

import { useState } from "react";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";

export function AddToCartButton({
  vendorId,
  vendorName,
  product,
}: {
  vendorId: string;
  vendorName: string;
  product: { id: string; name: string; price: number; imageUrl: string | null; stock: number };
}) {
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0);
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const result = addItem(vendorId, vendorName, {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      stock: product.stock,
    });
    setError(result.error ?? null);
  }

  function handleDecrement() {
    if (inCart <= 1) removeItem(product.id);
    else setQuantity(product.id, inCart - 1);
  }

  if (product.stock === 0) {
    return <span className="text-xs text-muted-foreground">Out of stock</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {inCart > 0 ? (
        <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1 py-0.5 text-primary">
          <Button size="icon-sm" variant="ghost" className="h-6 w-6" onClick={handleDecrement}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-4 text-center text-sm font-medium">{inCart}</span>
          <Button size="icon-sm" variant="ghost" className="h-6 w-6" onClick={handleAdd} disabled={inCart >= product.stock}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </span>
      ) : (
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <ShoppingCart className="h-3.5 w-3.5" />
          Add
        </Button>
      )}
      {error && <p className="max-w-40 text-right text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
