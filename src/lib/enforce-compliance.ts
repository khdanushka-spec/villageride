import { prisma } from "@/lib/prisma";
import { evaluateDriverCompliance, resolveEligibilityRules, type ComplianceBlocker } from "@/lib/compliance";
import type { DriverStatus } from "@prisma/client";

const PERFORMANCE_CODES = new Set(["RATING_BELOW_MINIMUM", "CANCELLATION_RATE_HIGH"]);

/**
 * Re-evaluates a driver against every regulatory and performance requirement
 * and applies the resulting status transition, if any:
 *
 * - A performance blocker (rating or cancellation rate) DEACTIVATES the
 *   driver. This never auto-clears — like Uber/Lyft, a performance
 *   deactivation is a policy decision an association must manually reverse
 *   (reinstateDriverAction), not something that silently resolves the moment
 *   a rolling average happens to tick back up.
 * - Any other blocker (expired document, lapsed insurance, etc.) puts the
 *   driver on COMPLIANCE_HOLD, which — unlike a performance deactivation —
 *   is mechanical and self-heals: the next time this function runs and finds
 *   no blockers, it puts the driver straight back to APPROVED.
 * - Going online, browsing for trip requests, and accepting a trip all call
 *   this first, so a document that lapses mid-shift (or a rating/cancellation
 *   rate that crosses the line right after a completed trip) is caught at the
 *   next point of use rather than requiring a scheduled sweep — this app has
 *   no background job runner, so enforcement is opportunistic by design.
 */
export async function reconcileDriverCompliance(
  driverId: string
): Promise<{ status: DriverStatus; changed: boolean; blockers: ComplianceBlocker[]; warnings: ComplianceBlocker[] }> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { vehicles: { take: 1 }, documents: true },
  });
  if (!driver) return { status: "REJECTED", changed: false, blockers: [], warnings: [] };

  // Only ever act on drivers who have already cleared onboarding. Applications
  // still in progress, rejections, and manual suspensions are handled by the
  // association's own actions, not this automatic pass.
  if (driver.status === "DEACTIVATED") {
    return { status: "DEACTIVATED", changed: false, blockers: [], warnings: [] };
  }
  if (!["APPROVED", "COMPLIANCE_HOLD"].includes(driver.status)) {
    return { status: driver.status, changed: false, blockers: [], warnings: [] };
  }

  const [associationRule, globalRule] = await Promise.all([
    prisma.driverEligibilityRule.findUnique({ where: { associationId: driver.associationId } }),
    prisma.driverEligibilityRule.findFirst({ where: { associationId: null } }),
  ]);
  const rules = resolveEligibilityRules(associationRule, globalRule);
  const vehicle = driver.vehicles[0] ?? null;
  const result = evaluateDriverCompliance(driver, vehicle, driver.documents, rules);

  const performanceBlockers = result.blockers.filter((b) => PERFORMANCE_CODES.has(b.code));
  const otherBlockers = result.blockers.filter((b) => !PERFORMANCE_CODES.has(b.code));

  if (performanceBlockers.length > 0) {
    const reason = performanceBlockers.map((b) => b.message).join(" ");
    await prisma.driver.update({
      where: { id: driverId },
      data: { status: "DEACTIVATED", isOnline: false, deactivatedAt: new Date(), deactivationReason: reason },
    });
    await prisma.notification.create({
      data: {
        userId: driver.userId,
        type: "PERFORMANCE_WARNING",
        title: "Your account has been deactivated",
        body: `${reason} Contact your association to review this.`,
      },
    });
    return { status: "DEACTIVATED", changed: true, blockers: result.blockers, warnings: [] };
  }

  if (otherBlockers.length > 0) {
    const reason = otherBlockers.map((b) => b.message).join(" ");

    if (driver.status !== "COMPLIANCE_HOLD") {
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: "COMPLIANCE_HOLD", isOnline: false, complianceHoldAt: new Date(), complianceHoldReason: reason },
      });
      await prisma.notification.create({
        data: { userId: driver.userId, type: "COMPLIANCE_HOLD", title: "You're on hold", body: reason },
      });
      return { status: "COMPLIANCE_HOLD", changed: true, blockers: otherBlockers, warnings: result.warnings };
    }

    // Already on hold — the specific blocker can change over time (a licence
    // issue gets fixed but a document is still pending review, say), so keep
    // the stored reason in sync rather than leaving it frozen at whatever it
    // said when the driver first went on hold.
    if (reason !== driver.complianceHoldReason) {
      await prisma.driver.update({ where: { id: driverId }, data: { complianceHoldReason: reason } });
      return { status: "COMPLIANCE_HOLD", changed: true, blockers: otherBlockers, warnings: result.warnings };
    }
    return { status: "COMPLIANCE_HOLD", changed: false, blockers: otherBlockers, warnings: result.warnings };
  }

  if (driver.status === "COMPLIANCE_HOLD") {
    await prisma.driver.update({
      where: { id: driverId },
      data: { status: "APPROVED", complianceHoldAt: null, complianceHoldReason: null },
    });
    await prisma.notification.create({
      data: {
        userId: driver.userId,
        type: "SYSTEM",
        title: "You're clear to drive again",
        body: "All outstanding compliance issues are resolved. You can go online now.",
      },
    });
    return { status: "APPROVED", changed: true, blockers: [], warnings: result.warnings };
  }

  return { status: "APPROVED", changed: false, blockers: [], warnings: result.warnings };
}
