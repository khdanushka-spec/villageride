import { Prisma, type VehicleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRoadRoute, type RoadRoute } from "@/lib/routing";

export type FareEstimate = {
  vehicleType: VehicleType;
  distanceKm: number;
  durationMin: number;
  fare: number;
  currency: string;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  surgeMultiplier: number;
};

async function ratesForAssociation(associationId: string | null) {
  return prisma.pricingRule.findMany({
    where: { associationId, isActive: true },
  });
}

/** Global default rates (associationId: null) — used until a driver from a
 * specific association accepts the trip. Accepts an already-fetched route so
 * callers that also need the road geometry (e.g. the fare-estimate API,
 * which returns it to the map) don't pay for a second OSRM round trip. */
export async function estimateAllVehicleTypes(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
  precomputedRoute?: RoadRoute
): Promise<FareEstimate[]> {
  const { distanceKm, durationMin } = precomputedRoute ?? (await getRoadRoute(pickup, dropoff));

  const rules = await ratesForAssociation(null);

  return rules
    .map((rule) => {
      const raw =
        Number(rule.baseFare) +
        Number(rule.perKmRate) * distanceKm +
        Number(rule.perMinuteRate) * durationMin;
      const surged = raw * Number(rule.surgeMultiplier);
      const fare = Math.max(surged, Number(rule.minimumFare));

      return {
        vehicleType: rule.vehicleType,
        distanceKm: Math.round(distanceKm * 100) / 100,
        durationMin,
        fare: Math.round(fare),
        currency: rule.currency,
        baseFare: Number(rule.baseFare),
        perKmRate: Number(rule.perKmRate),
        perMinuteRate: Number(rule.perMinuteRate),
        surgeMultiplier: Number(rule.surgeMultiplier),
      };
    })
    .sort((a, b) => a.fare - b.fare);
}

export async function estimateFareForVehicleType(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
  vehicleType: VehicleType
): Promise<FareEstimate | null> {
  const all = await estimateAllVehicleTypes(pickup, dropoff);
  return all.find((e) => e.vehicleType === vehicleType) ?? null;
}

export function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}
