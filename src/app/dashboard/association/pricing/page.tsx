import { prisma } from "@/lib/prisma";
import { requireAssociationForAdmin } from "@/lib/association-admin";
import { PricingRow } from "@/components/association/pricing-row";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";

export const dynamic = "force-dynamic";

export default async function AssociationPricingPage() {
  const association = await requireAssociationForAdmin();

  const [ownRules, globalRules] = await Promise.all([
    prisma.pricingRule.findMany({ where: { associationId: association.id } }),
    prisma.pricingRule.findMany({ where: { associationId: null } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Set your own rates per vehicle type. Unset types fall back to the platform default shown below.
        </p>
      </div>

      <div className="space-y-3">
        {VEHICLE_TYPES.map((type) => {
          const own = ownRules.find((r) => r.vehicleType === type);
          const fallback = globalRules.find((r) => r.vehicleType === type);
          const rule = own ?? fallback;
          if (!rule) return null;
          return (
            <PricingRow
              key={type}
              vehicleType={type}
              baseFare={Number(rule.baseFare)}
              perKmRate={Number(rule.perKmRate)}
              perMinuteRate={Number(rule.perMinuteRate)}
              minimumFare={Number(rule.minimumFare)}
            />
          );
        })}
      </div>
    </div>
  );
}
