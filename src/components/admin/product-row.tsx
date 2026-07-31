"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProductAction, toggleProductActiveAction } from "@/actions/vendor";
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORIES } from "@/lib/products";
import type { ProductCategory } from "@prisma/client";

type Product = {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  price: string;
  category: ProductCategory;
  stock: number;
  isActive: boolean;
  imageUrl: string | null;
};

export function ProductRow({ product }: { product: Product }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(product);

  async function handleEditSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await updateProductAction(undefined, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setCurrent({
      ...current,
      name: String(formData.get("name")),
      description: String(formData.get("description") || "") || null,
      price: String(formData.get("price")),
      category: formData.get("category") as ProductCategory,
      stock: Number(formData.get("stock")),
    });
    setEditing(false);
  }

  async function handleToggleActive() {
    setPending(true);
    const result = await toggleProductActiveAction(current.id, current.vendorId, !current.isActive);
    setPending(false);
    if (!result?.error) setCurrent({ ...current, isActive: !current.isActive });
  }

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={6}>
          <form action={handleEditSubmit} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-5">
            <input type="hidden" name="productId" value={current.id} />
            <input type="hidden" name="vendorId" value={current.vendorId} />
            <Input name="name" defaultValue={current.name} required className="sm:col-span-2" />
            <Select name="category" defaultValue={current.category}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {PRODUCT_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="price" type="number" min={0} step="0.01" defaultValue={current.price} required />
            <Input name="stock" type="number" min={0} step="1" defaultValue={current.stock} required />
            <Input
              name="description"
              defaultValue={current.description ?? ""}
              placeholder="Description"
              className="sm:col-span-3"
            />
            {error && <p className="text-xs text-destructive sm:col-span-5">{error}</p>}
            <div className="flex gap-1.5 sm:col-span-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          {current.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.imageUrl} alt="" className="h-8 w-8 rounded-lg border border-border object-cover" />
          )}
          <div>
            <p className="font-medium">{current.name}</p>
            {current.description && <p className="text-xs text-muted-foreground">{current.description}</p>}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm">{PRODUCT_CATEGORY_LABELS[current.category]}</TableCell>
      <TableCell className="text-sm">LKR {Number(current.price).toLocaleString()}</TableCell>
      <TableCell className="text-sm">{current.stock}</TableCell>
      <TableCell>
        <Badge variant={current.isActive ? "default" : "secondary"}>{current.isActive ? "active" : "inactive"}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={handleToggleActive}>
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {current.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
