"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getRequiredDocuments, resolveEligibilityRules } from "@/lib/compliance";
import { reconcileDriverCompliance } from "@/lib/enforce-compliance";
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

// ---------------------------------------------------------------------------
// Driver verification: per-document review, background check, approval
// ---------------------------------------------------------------------------

async function notifyDriver(driverId: string, type: "DRIVER_APPROVED" | "DRIVER_REJECTED" | "DOCUMENT_APPROVED" | "DOCUMENT_REJECTED" | "BACKGROUND_CHECK_CLEARED", title: string, body: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { userId: true } });
  if (!driver) return;
  await prisma.notification.create({ data: { userId: driver.userId, type, title, body } });
}

/**
 * Approves or rejects a single uploaded document. When approving the last
 * outstanding required document, the driver is advanced automatically —
 * into background check if the association requires police clearance,
 * otherwise straight to APPROVED — mirroring how Uber/Lyft-style onboarding
 * moves a driver forward the moment every check clears, rather than needing
 * a separate manual "approve" click on top of clearing every document.
 */
export async function reviewDocumentAction(
  documentId: string,
  decision: "APPROVED" | "REJECTED",
  rejectionReason?: string
): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { driver: { include: { vehicles: { take: 1 }, documents: true } } },
  });
  if (!document || document.driver.associationId !== ctx.association.id) {
    return { error: "Document not found." };
  }

  if (decision === "REJECTED" && !rejectionReason?.trim()) {
    return { error: "Provide a reason for rejecting this document." };
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: decision,
      rejectionReason: decision === "REJECTED" ? rejectionReason!.trim() : null,
      reviewedAt: new Date(),
      reviewedById: ctx.userId,
    },
  });

  await logAudit({
    actorUserId: ctx.userId,
    action: decision === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
    entityType: "Document",
    entityId: documentId,
    metadata: { driverId: document.driverId, type: document.type, reason: rejectionReason },
  });

  if (decision === "REJECTED") {
    await notifyDriver(
      document.driverId,
      "DOCUMENT_REJECTED",
      "A document needs attention",
      `Your ${document.type.replaceAll("_", " ").toLowerCase()} was rejected: ${rejectionReason!.trim()}`
    );
    revalidatePath(`/dashboard/association/drivers/${document.driverId}`);
    return { success: "Document rejected." };
  }

  // Check whether every required document is now approved.
  const vehicle = document.driver.vehicles[0];
  if (vehicle) {
    const [associationRule, globalRule] = await Promise.all([
      prisma.driverEligibilityRule.findUnique({ where: { associationId: ctx.association.id } }),
      prisma.driverEligibilityRule.findFirst({ where: { associationId: null } }),
    ]);
    const rules = resolveEligibilityRules(associationRule, globalRule);
    const required = getRequiredDocuments(vehicle.type, rules);

    const latestDocs = document.driver.documents.map((d) =>
      d.id === documentId ? { ...d, status: "APPROVED" as const } : d
    );
    const allApproved = required.every((type) => latestDocs.some((d) => d.type === type && d.status === "APPROVED"));

    if (allApproved && document.driver.status === "DOCUMENTS_UNDER_REVIEW") {
      const nextStatus = rules.requirePoliceClearance ? "BACKGROUND_CHECK" : "APPROVED";
      await prisma.driver.update({
        where: { id: document.driverId },
        data: {
          status: nextStatus,
          documentsVerifiedAt: new Date(),
          documentsVerifiedById: ctx.userId,
          ...(nextStatus === "APPROVED" ? { approvedAt: new Date(), approvedById: ctx.userId } : {}),
        },
      });
      await notifyDriver(
        document.driverId,
        nextStatus === "APPROVED" ? "DRIVER_APPROVED" : "DOCUMENT_APPROVED",
        nextStatus === "APPROVED" ? "You're approved to drive" : "Documents verified",
        nextStatus === "APPROVED"
          ? "All your documents are verified. You can go online now."
          : "All your documents are verified. Your police clearance check is next."
      );
      await logAudit({
        actorUserId: ctx.userId,
        action: "DRIVER_DOCUMENTS_VERIFIED",
        entityType: "Driver",
        entityId: document.driverId,
        metadata: { nextStatus },
      });
    } else if (document.driver.status === "COMPLIANCE_HOLD") {
      // Approving a resubmitted document can be exactly what a hold was
      // waiting on — recheck immediately rather than leaving the driver
      // stuck until they next open the app triggers the same check.
      await reconcileDriverCompliance(document.driverId);
    }
  }

  revalidatePath(`/dashboard/association/drivers/${document.driverId}`);
  revalidatePath("/dashboard/association/drivers");
  return { success: "Document approved." };
}

export async function startBackgroundCheckAction(driverId: string): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };

  const result = await prisma.driver.updateMany({
    where: { id: driverId, associationId: ctx.association.id },
    data: { backgroundCheckStatus: "IN_PROGRESS", backgroundCheckById: ctx.userId },
  });
  if (result.count === 0) return { error: "Driver not found." };

  revalidatePath(`/dashboard/association/drivers/${driverId}`);
  return { success: "Background check marked in progress." };
}

export async function clearBackgroundCheckAction(driverId: string, notes?: string): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };

  const driver = await prisma.driver.findFirst({
    where: { id: driverId, associationId: ctx.association.id },
  });
  if (!driver) return { error: "Driver not found." };

  await prisma.driver.update({
    where: { id: driverId },
    data: {
      backgroundCheckStatus: "CLEARED",
      backgroundCheckAt: new Date(),
      backgroundCheckById: ctx.userId,
      backgroundCheckNotes: notes?.trim() || null,
      ...(driver.status === "BACKGROUND_CHECK"
        ? { status: "APPROVED", approvedAt: new Date(), approvedById: ctx.userId }
        : {}),
    },
  });

  await logAudit({
    actorUserId: ctx.userId,
    action: "BACKGROUND_CHECK_CLEARED",
    entityType: "Driver",
    entityId: driverId,
  });
  await notifyDriver(
    driverId,
    "BACKGROUND_CHECK_CLEARED",
    "You're approved to drive",
    "Your police clearance check passed and your documents are verified. You can go online now."
  );

  revalidatePath(`/dashboard/association/drivers/${driverId}`);
  revalidatePath("/dashboard/association/drivers");
  return { success: "Background check cleared." };
}

export async function failBackgroundCheckAction(driverId: string, notes: string): Promise<ActionState> {
  const ctx = await requireAssociationAdmin();
  if (!ctx) return { error: "Not authorized." };
  if (!notes?.trim()) return { error: "Provide a reason." };

  const result = await prisma.driver.updateMany({
    where: { id: driverId, associationId: ctx.association.id },
    data: {
      backgroundCheckStatus: "FAILED",
      backgroundCheckAt: new Date(),
      backgroundCheckById: ctx.userId,
      backgroundCheckNotes: notes.trim(),
      status: "REJECTED",
      rejectionReason: `Background check failed: ${notes.trim()}`,
    },
  });
  if (result.count === 0) return { error: "Driver not found." };

  await logAudit({
    actorUserId: ctx.userId,
    action: "BACKGROUND_CHECK_FAILED",
    entityType: "Driver",
    entityId: driverId,
    metadata: { notes },
  });
  await notifyDriver(driverId, "DRIVER_REJECTED", "Application not approved", `Background check failed: ${notes.trim()}`);

  revalidatePath(`/dashboard/association/drivers/${driverId}`);
  revalidatePath("/dashboard/association/drivers");
  return { success: "Background check marked failed." };
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
