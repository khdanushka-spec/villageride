"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { createProductAction, type ActionState } from "@/actions/vendor";
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORIES } from "@/lib/products";

export function CreateProductForm({ vendorId }: { vendorId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createProductAction, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-medium">Add a product</h3>
      <input type="hidden" name="vendorId" value={vendorId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Product name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select name="category" defaultValue="OTHER">
            <SelectTrigger id="category" className="w-full">
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price (LKR)</Label>
          <Input id="price" name="price" type="number" min={0} step="0.01" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock">Stock</Label>
          <Input id="stock" name="stock" type="number" min={0} step="1" defaultValue={0} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>

      <ImageUploadField name="imageUrl" label="Product photo (optional)" folder="products/images" />

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add product
      </Button>
    </form>
  );
}
