"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { ProductCategory } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return null;
  return session.user.id;
}

const createVendorSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  addressLine: z.string().min(2),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  district: z.string().min(2),
  contactPhone: z.string().optional(),
  associationId: z.string().min(1),
});

export async function createVendorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  const parsed = createVendorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const vendor = await prisma.vendor.create({
    data: {
      name: data.name,
      description: data.description || null,
      logoUrl: data.logoUrl || null,
      addressLine: data.addressLine,
      lat: data.lat,
      lng: data.lng,
      district: data.district,
      contactPhone: data.contactPhone || null,
      associationId: data.associationId,
    },
  });

  await logAudit({
    actorUserId: actorId,
    action: "VENDOR_CREATED",
    entityType: "Vendor",
    entityId: vendor.id,
    metadata: { name: vendor.name },
  });

  revalidatePath("/dashboard/admin/vendors");
  return { success: "Vendor added." };
}

export async function toggleVendorActiveAction(vendorId: string, isActive: boolean) {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  await prisma.vendor.update({ where: { id: vendorId }, data: { isActive } });
  await logAudit({
    actorUserId: actorId,
    action: isActive ? "VENDOR_REACTIVATED" : "VENDOR_DEACTIVATED",
    entityType: "Vendor",
    entityId: vendorId,
  });

  revalidatePath("/dashboard/admin/vendors");
  revalidatePath(`/dashboard/admin/vendors/${vendorId}`);
  return { success: true };
}

const createProductSchema = z.object({
  vendorId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.coerce.number().min(0),
  category: z.string(),
  stock: z.coerce.number().int().min(0),
});

export async function createProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  const parsed = createProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const product = await prisma.product.create({
    data: {
      vendorId: data.vendorId,
      name: data.name,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      price: data.price,
      category: data.category as ProductCategory,
      stock: data.stock,
    },
  });

  await logAudit({
    actorUserId: actorId,
    action: "PRODUCT_CREATED",
    entityType: "Product",
    entityId: product.id,
    metadata: { name: product.name, vendorId: data.vendorId },
  });

  revalidatePath(`/dashboard/admin/vendors/${data.vendorId}`);
  return { success: "Product added." };
}

const updateProductSchema = z.object({
  productId: z.string().min(1),
  vendorId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  category: z.string(),
  stock: z.coerce.number().int().min(0),
});

export async function updateProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  const parsed = updateProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  await prisma.product.update({
    where: { id: data.productId },
    data: {
      name: data.name,
      description: data.description || null,
      price: data.price,
      category: data.category as ProductCategory,
      stock: data.stock,
    },
  });

  revalidatePath(`/dashboard/admin/vendors/${data.vendorId}`);
  return { success: "Product updated." };
}

export async function toggleProductActiveAction(productId: string, vendorId: string, isActive: boolean) {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  await prisma.product.update({ where: { id: productId }, data: { isActive } });
  await logAudit({
    actorUserId: actorId,
    action: isActive ? "PRODUCT_REACTIVATED" : "PRODUCT_DEACTIVATED",
    entityType: "Product",
    entityId: productId,
  });

  revalidatePath(`/dashboard/admin/vendors/${vendorId}`);
  return { success: true };
}
