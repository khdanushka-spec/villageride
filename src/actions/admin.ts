"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import type { Role, VehicleType } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return null;
  return session.user.id;
}

const createAssociationSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only."),
  district: z.string().min(2),
  commissionPercent: z.coerce.number().min(0).max(100),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function createAssociationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  const parsed = createAssociationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const existingSlug = await prisma.association.findUnique({ where: { slug: data.slug } });
  if (existingSlug) return { error: "That slug is already in use." };

  const existingEmail = await prisma.user.findUnique({ where: { email: data.adminEmail.toLowerCase() } });
  if (existingEmail) return { error: "An account with this admin email already exists." };

  const association = await prisma.association.create({
    data: {
      name: data.name,
      slug: data.slug,
      district: data.district,
      commissionPercent: data.commissionPercent,
      status: "ACTIVE",
      admins: {
        create: {
          name: data.adminName,
          email: data.adminEmail.toLowerCase(),
          role: "ASSOCIATION_ADMIN",
          passwordHash: await hashPassword(data.adminPassword),
        },
      },
    },
  });

  await logAudit({
    actorUserId: actorId,
    action: "ASSOCIATION_CREATED",
    entityType: "Association",
    entityId: association.id,
    metadata: { name: association.name },
  });

  revalidatePath("/dashboard/admin/associations");
  return { success: "Association created." };
}

export async function toggleAssociationStatusAction(associationId: string, status: "ACTIVE" | "SUSPENDED") {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  await prisma.association.update({ where: { id: associationId }, data: { status } });
  await logAudit({
    actorUserId: actorId,
    action: status === "ACTIVE" ? "ASSOCIATION_REACTIVATED" : "ASSOCIATION_SUSPENDED",
    entityType: "Association",
    entityId: associationId,
  });

  revalidatePath("/dashboard/admin/associations");
  return { success: true };
}

export async function toggleUserActiveAction(userId: string, isActive: boolean) {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  await logAudit({
    actorUserId: actorId,
    action: isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/dashboard/admin/drivers");
  revalidatePath("/dashboard/admin/customers");
  return { success: true };
}

const pricingSchema = z.object({
  vehicleType: z.string(),
  baseFare: z.coerce.number().min(0),
  perKmRate: z.coerce.number().min(0),
  perMinuteRate: z.coerce.number().min(0),
  minimumFare: z.coerce.number().min(0),
});

export async function saveGlobalPricingRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  const parsed = pricingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter valid numbers for all rates." };
  const { vehicleType, ...rates } = parsed.data;

  const existing = await prisma.pricingRule.findFirst({
    where: { associationId: null, vehicleType: vehicleType as VehicleType },
  });
  if (existing) {
    await prisma.pricingRule.update({ where: { id: existing.id }, data: rates });
  } else {
    await prisma.pricingRule.create({ data: { associationId: null, vehicleType: vehicleType as VehicleType, ...rates } });
  }

  await logAudit({
    actorUserId: actorId,
    action: "GLOBAL_PRICING_UPDATED",
    entityType: "PricingRule",
    metadata: { vehicleType },
  });

  revalidatePath("/dashboard/admin/pricing");
  return { success: "Pricing updated." };
}

const notificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(["ALL", "CUSTOMER", "DRIVER", "ASSOCIATION_ADMIN"]),
});

export async function broadcastNotificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actorId = await requireSuperAdmin();
  if (!actorId) return { error: "Not authorized." };

  const parsed = notificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a title and message." };

  const where = parsed.data.audience === "ALL" ? {} : { role: parsed.data.audience as Role };
  const users = await prisma.user.findMany({ where, select: { id: true } });

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "SYSTEM" as const,
      title: parsed.data.title,
      body: parsed.data.body,
    })),
  });

  await logAudit({
    actorUserId: actorId,
    action: "NOTIFICATION_BROADCAST",
    entityType: "Notification",
    metadata: { audience: parsed.data.audience, recipients: users.length },
  });

  revalidatePath("/dashboard/admin/notifications");
  return { success: `Sent to ${users.length} user(s).` };
}
