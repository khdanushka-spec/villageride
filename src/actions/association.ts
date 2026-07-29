"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { VehicleType } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

async function requireAssociationAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ASSOCIATION_ADMIN") return null;

  const association = await prisma.association.findFirst({
    where: { admins: { some: { id: session.user.id } } },
  });
  if (!association) return null;
  return { association, userId: session.user.id };
}

export async function approveDriverAction(driverId: string): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };

  const result = await prisma.driver.updateMany({
    where: { id: driverId, associationId: ctx.association.id },
    data: { status: "APPROVED", approvedAt: new Date(), rejectionReason: null },
  });
  if (result.count === 0) return { error: "Driver not found." };

  await logAudit({ actorUserId: ctx.userId, action: "DRIVER_APPROVED", entityType: "Driver", entityId: driverId });
  revalidatePath("/dashboard/association/drivers");
  return { success: "Driver approved." };
}

export async function rejectDriverAction(driverId: string, reason: string): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };

  const result = await prisma.driver.updateMany({
    where: { id: driverId, associationId: ctx.association.id },
    data: { status: "REJECTED", rejectionReason: reason || "Not approved by association." },
  });
  if (result.count === 0) return { error: "Driver not found." };

  await logAudit({
    actorUserId: ctx.userId,
    action: "DRIVER_REJECTED",
    entityType: "Driver",
    entityId: driverId,
    metadata: { reason },
  });
  revalidatePath("/dashboard/association/drivers");
  return { success: "Driver rejected." };
}

export async function suspendDriverAction(driverId: string): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };

  const result = await prisma.driver.updateMany({
    where: { id: driverId, associationId: ctx.association.id },
    data: { status: "SUSPENDED", isOnline: false },
  });
  if (result.count === 0) return { error: "Driver not found." };

  await logAudit({ actorUserId: ctx.userId, action: "DRIVER_SUSPENDED", entityType: "Driver", entityId: driverId });
  revalidatePath("/dashboard/association/drivers");
  return { success: "Driver suspended." };
}

export async function reinstateDriverAction(driverId: string): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };

  const result = await prisma.driver.updateMany({
    where: { id: driverId, associationId: ctx.association.id },
    data: { status: "APPROVED" },
  });
  if (result.count === 0) return { error: "Driver not found." };

  await logAudit({ actorUserId: ctx.userId, action: "DRIVER_REINSTATED", entityType: "Driver", entityId: driverId });
  revalidatePath("/dashboard/association/drivers");
  return { success: "Driver reinstated." };
}

const pricingSchema = z.object({
  vehicleType: z.string(),
  baseFare: z.coerce.number().min(0),
  perKmRate: z.coerce.number().min(0),
  perMinuteRate: z.coerce.number().min(0),
  minimumFare: z.coerce.number().min(0),
});

export async function savePricingRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };

  const parsed = pricingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter valid numbers for all rates." };
  const { vehicleType, ...rates } = parsed.data;

  const existing = await prisma.pricingRule.findFirst({
    where: { associationId: ctx.association.id, vehicleType: vehicleType as VehicleType },
  });
  if (existing) {
    await prisma.pricingRule.update({ where: { id: existing.id }, data: rates });
  } else {
    await prisma.pricingRule.create({
      data: { associationId: ctx.association.id, vehicleType: vehicleType as VehicleType, ...rates },
    });
  }

  revalidatePath("/dashboard/association/pricing");
  return { success: "Pricing updated." };
}

const announcementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

export async function createAnnouncementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };

  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a title and message." };

  await prisma.announcement.create({
    data: { associationId: ctx.association.id, title: parsed.data.title, body: parsed.data.body },
  });

  revalidatePath("/dashboard/association/announcements");
  return { success: "Announcement posted." };
}
