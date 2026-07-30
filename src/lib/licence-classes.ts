import type { LicenceClass, VehicleType } from "@prisma/client";

/**
 * Sri Lanka Department of Motor Traffic driving licence classes.
 *
 * Minimum licensing age is 18 for all classes, licences are valid for 8 years,
 * and issuance requires theory and practical tests plus medical clearance.
 */
export const LICENCE_CLASS_LABELS: Record<LicenceClass, string> = {
  A1: "A1 — Light motorcycle (up to 100cc)",
  A: "A — Motorcycle (above 100cc)",
  B1: "B1 — Motor tricycle / light van",
  B: "B — Dual purpose (up to 3,500kg, 9 seats)",
  C1: "C1 — Light lorry (3,500–17,000kg)",
  C: "C — Lorry (above 17,000kg)",
  CE: "CE — Articulated vehicle / with trailer",
  D1: "D1 — Passenger vehicle (9–33 seats)",
  D: "D — Bus (up to 33 seats)",
  DE: "DE — Heavy coach combination",
  G1: "G1 — Hand tractor",
  G: "G — Tractor / agricultural vehicle",
  J: "J — Construction and loading equipment",
};

export const LICENCE_CLASSES = Object.keys(LICENCE_CLASS_LABELS) as LicenceClass[];

/**
 * Which DMT licence classes legally permit driving each vehicle type.
 *
 * A three-wheeler is a motor tricycle, so it needs class B1 (a full B licence
 * also covers it). Larger passenger vehicles step up through D1/D, and goods
 * vehicles through C1/C.
 */
export const VEHICLE_TYPE_LICENCE_CLASSES: Record<VehicleType, LicenceClass[]> = {
  THREE_WHEELER: ["B1", "B"],
  TAXI: ["B"],
  SUV: ["B"],
  MINI_VAN: ["B1", "B"],
  VAN: ["B", "D1"],
  BUS: ["D1", "D", "DE"],
  LORRY: ["C1", "C", "CE"],
  TRUCK: ["C1", "C", "CE"],
  DELIVERY_VEHICLE: ["B", "C1", "C"],
};

/** Vehicle types that carry enough passengers to need a certificate of fitness. */
export const FITNESS_CERT_VEHICLE_TYPES: VehicleType[] = ["BUS", "VAN", "LORRY", "TRUCK"];

export function licenceClassPermits(licenceClass: LicenceClass, vehicleType: VehicleType): boolean {
  return VEHICLE_TYPE_LICENCE_CLASSES[vehicleType].includes(licenceClass);
}

export function requiresFitnessCertificate(vehicleType: VehicleType): boolean {
  return FITNESS_CERT_VEHICLE_TYPES.includes(vehicleType);
}
