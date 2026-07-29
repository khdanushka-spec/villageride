import { Prisma, type VehicleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const EARTH_RADIUS_KM = 6371;
const AVERAGE_SPEED_KMH = 28; // conservative average for mixed urban/rural Sri Lankan roads

/**
 * Straight-line (haversine) distance between two points. This is an
 * approximation used in place of a routing API (Google Maps/OSRM), which
 * would give real road distance — swapping one in later only touches this
 * function and estimateTrip below.
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

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
 * specific association accepts the trip. */
export async function estimateAllVehicleTypes(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
): Promise<FareEstimate[]> {
  const distanceKm = haversineKm(pickup, dropoff);
  const durationMin = Math.max(5, Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60));

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
