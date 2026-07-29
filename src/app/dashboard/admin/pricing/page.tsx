import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";
import { PricingRow } from "@/components/association/pricing-row";
import { saveGlobalPricingRuleAction } from "@/actions/admin";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  await requireSuperAdminSession();

  const rules = await prisma.pricingRule.findMany({ where: { associationId: null } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing &amp; commissions</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide default rates. Associations can override these for their own drivers.
        </p>
      </div>

      <div className="space-y-3">
        {VEHICLE_TYPES.map((type) => {
          const rule = rules.find((r) => r.vehicleType === type);
          if (!rule) return null;
          return (
            <PricingRow
              key={type}
              vehicleType={type}
              baseFare={Number(rule.baseFare)}
              perKmRate={Number(rule.perKmRate)}
              perMinuteRate={Number(rule.perMinuteRate)}
              minimumFare={Number(rule.minimumFare)}
              action={saveGlobalPricingRuleAction}
            />
          );
        })}
      </div>
    </div>
  );
}
