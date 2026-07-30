import type {
  DocumentType,
  Driver,
  DriverEligibilityRule,
  DriverStatus,
  Document,
  Vehicle,
  VehicleType,
} from "@prisma/client";

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  PENDING: "Pending",
  DOCUMENTS_UNDER_REVIEW: "Documents under review",
  BACKGROUND_CHECK: "Background check",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  DEACTIVATED: "Deactivated",
  COMPLIANCE_HOLD: "Compliance hold",
};

export const DRIVER_STATUS_VARIANT: Record<DriverStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  DOCUMENTS_UNDER_REVIEW: "secondary",
  BACKGROUND_CHECK: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
  DEACTIVATED: "destructive",
  COMPLIANCE_HOLD: "outline",
};
import { licenceClassPermits, requiresFitnessCertificate } from "@/lib/licence-classes";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DRIVER_LICENSE: "Driving licence",
  NATIONAL_ID: "National Identity Card (NIC)",
  VEHICLE_REGISTRATION: "Vehicle registration (CR book)",
  INSURANCE: "Insurance certificate",
  REVENUE_LICENCE: "Revenue licence",
  VEHICLE_EMISSION_TEST: "Vehicle Emission Test certificate",
  POLICE_CLEARANCE: "Police clearance certificate",
  GRAMA_NILADHARI_CERTIFICATE: "Grama Niladhari certificate",
  MEDICAL_CERTIFICATE: "Medical certificate",
  VEHICLE_FITNESS_CERTIFICATE: "Certificate of fitness",
  VEHICLE_PHOTO: "Vehicle photo",
  PROFILE_PHOTO: "Profile photo",
};

/** Which authority issues each document, shown to drivers during onboarding. */
export const DOCUMENT_ISSUING_AUTHORITY: Partial<Record<DocumentType, string>> = {
  DRIVER_LICENSE: "Department of Motor Traffic",
  NATIONAL_ID: "Department for Registration of Persons",
  VEHICLE_REGISTRATION: "Department of Motor Traffic",
  REVENUE_LICENCE: "Provincial Council / Divisional Secretariat",
  VEHICLE_EMISSION_TEST: "Accredited emission testing centre",
  POLICE_CLEARANCE: "Sri Lanka Police",
  GRAMA_NILADHARI_CERTIFICATE: "Grama Niladhari of your division",
  MEDICAL_CERTIFICATE: "Registered medical practitioner",
  VEHICLE_FITNESS_CERTIFICATE: "Department of Motor Traffic",
};

/** Documents that carry an expiry date and so need ongoing re-verification. */
export const EXPIRING_DOCUMENT_TYPES: DocumentType[] = [
  "DRIVER_LICENSE",
  "INSURANCE",
  "REVENUE_LICENCE",
  "VEHICLE_EMISSION_TEST",
  "MEDICAL_CERTIFICATE",
  "VEHICLE_FITNESS_CERTIFICATE",
  "POLICE_CLEARANCE",
];

export const DEFAULT_ELIGIBILITY: Pick<
  DriverEligibilityRule,
  | "minDriverAge"
  | "minLicenceYears"
  | "maxVehicleAgeYears"
  | "requirePoliceClearance"
  | "requireGramaNiladhari"
  | "requireMedicalCert"
  | "requireRevenueLicence"
  | "requireEmissionTest"
  | "ratingGracePeriod"
  | "expiryWarningDays"
> = {
  minDriverAge: 18,
  minLicenceYears: 1,
  maxVehicleAgeYears: 20,
  requirePoliceClearance: true,
  requireGramaNiladhari: true,
  requireMedicalCert: true,
  requireRevenueLicence: true,
  requireEmissionTest: true,
  ratingGracePeriod: 20,
  expiryWarningDays: 30,
};

type EligibilityConfig = Pick<
  DriverEligibilityRule,
  keyof typeof DEFAULT_ELIGIBILITY | "minRating" | "maxCancellationRate"
>;

/**
 * The set of documents a driver must supply, given the vehicle they intend to
 * drive and the association's configured requirements.
 */
export function getRequiredDocuments(
  vehicleType: VehicleType,
  rules: Pick<
    EligibilityConfig,
    "requirePoliceClearance" | "requireGramaNiladhari" | "requireMedicalCert" | "requireRevenueLicence" | "requireEmissionTest"
  >
): DocumentType[] {
  const required: DocumentType[] = [
    "NATIONAL_ID",
    "DRIVER_LICENSE",
    "VEHICLE_REGISTRATION",
    "INSURANCE",
  ];

  if (rules.requireRevenueLicence) required.push("REVENUE_LICENCE");
  if (rules.requireEmissionTest) required.push("VEHICLE_EMISSION_TEST");
  if (rules.requirePoliceClearance) required.push("POLICE_CLEARANCE");
  if (rules.requireGramaNiladhari) required.push("GRAMA_NILADHARI_CERTIFICATE");
  if (rules.requireMedicalCert) required.push("MEDICAL_CERTIFICATE");
  if (requiresFitnessCertificate(vehicleType)) required.push("VEHICLE_FITNESS_CERTIFICATE");

  return required;
}

export type BlockerSeverity = "BLOCKING" | "WARNING";

export type ComplianceBlocker = {
  code: string;
  severity: BlockerSeverity;
  message: string;
};

export type ComplianceResult = {
  /** True only when nothing blocking is outstanding — safe to go online. */
  eligible: boolean;
  blockers: ComplianceBlocker[];
  warnings: ComplianceBlocker[];
};

function yearsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function isExpired(date: Date | null | undefined, now: Date): boolean {
  return !!date && date.getTime() < now.getTime();
}

function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

type DriverForCompliance = Pick<
  Driver,
  | "status"
  | "dateOfBirth"
  | "licenceClass"
  | "licenceIssuedAt"
  | "licenseExpiry"
  | "backgroundCheckStatus"
  | "ratingAvg"
  | "ratingCount"
  | "totalTrips"
  | "cancelledTrips"
  | "offeredTrips"
>;

/**
 * Evaluates every regulatory and platform requirement for a driver.
 *
 * Blocking items must be cleared before the driver can go online or be offered
 * a trip; warnings surface things about to lapse (for example a revenue licence
 * expiring inside the warning window) so they can be renewed in time.
 */
export function evaluateDriverCompliance(
  driver: DriverForCompliance,
  vehicle: Pick<
    Vehicle,
    | "type"
    | "year"
    | "insuranceExpiry"
    | "revenueLicenceExpiry"
    | "emissionTestExpiry"
    | "emissionTestExempt"
    | "fitnessCertExpiry"
  > | null,
  documents: Pick<Document, "type" | "status" | "expiresAt">[],
  rules: EligibilityConfig,
  now: Date = new Date()
): ComplianceResult {
  const blockers: ComplianceBlocker[] = [];
  const warnings: ComplianceBlocker[] = [];

  const block = (code: string, message: string) =>
    blockers.push({ code, severity: "BLOCKING", message });
  const warn = (code: string, message: string) =>
    warnings.push({ code, severity: "WARNING", message });

  // --- Account standing ---
  if (driver.status === "SUSPENDED") block("SUSPENDED", "Your account is suspended by your association.");
  if (driver.status === "DEACTIVATED") block("DEACTIVATED", "Your account has been deactivated.");
  if (driver.status === "REJECTED") block("REJECTED", "Your application was not approved.");
  if (driver.status === "PENDING" || driver.status === "DOCUMENTS_UNDER_REVIEW") {
    block("NOT_VERIFIED", "Your documents are still being verified by your association.");
  }
  if (driver.status === "BACKGROUND_CHECK") {
    block("BACKGROUND_PENDING", "Your police clearance is still being reviewed.");
  }

  // --- Vehicle present ---
  if (!vehicle) {
    block("NO_VEHICLE", "No vehicle is registered to your account.");
    return { eligible: false, blockers, warnings };
  }

  // --- Age (DMT minimum licensing age is 18; associations may set higher) ---
  if (!driver.dateOfBirth) {
    block("NO_DOB", "Your date of birth is missing from your profile.");
  } else if (yearsBetween(driver.dateOfBirth, now) < rules.minDriverAge) {
    block("UNDER_AGE", `Drivers must be at least ${rules.minDriverAge} years old.`);
  }

  // --- Licence class must legally cover the vehicle being driven ---
  if (!driver.licenceClass) {
    block("NO_LICENCE_CLASS", "Your driving licence class is missing from your profile.");
  } else if (!licenceClassPermits(driver.licenceClass, vehicle.type)) {
    block(
      "LICENCE_CLASS_MISMATCH",
      `Licence class ${driver.licenceClass} does not permit driving this vehicle type.`
    );
  }

  if (isExpired(driver.licenseExpiry, now)) {
    block("LICENCE_EXPIRED", "Your driving licence has expired.");
  } else if (daysUntil(driver.licenseExpiry, now) <= rules.expiryWarningDays) {
    warn("LICENCE_EXPIRING", `Your driving licence expires in ${daysUntil(driver.licenseExpiry, now)} days.`);
  }

  if (driver.licenceIssuedAt && yearsBetween(driver.licenceIssuedAt, now) < rules.minLicenceYears) {
    block(
      "LICENCE_TOO_NEW",
      `You must have held your licence for at least ${rules.minLicenceYears} year(s) to carry passengers.`
    );
  }

  // --- Background check ---
  if (rules.requirePoliceClearance) {
    if (driver.backgroundCheckStatus === "FAILED") {
      block("BACKGROUND_FAILED", "Your police clearance check was not successful.");
    } else if (driver.backgroundCheckStatus !== "CLEARED" && driver.status === "APPROVED") {
      block("BACKGROUND_NOT_CLEARED", "Your police clearance has not been cleared yet.");
    }
  }

  // --- Vehicle age ---
  const vehicleAge = now.getFullYear() - vehicle.year;
  if (vehicleAge > rules.maxVehicleAgeYears) {
    block("VEHICLE_TOO_OLD", `Vehicles older than ${rules.maxVehicleAgeYears} years cannot be used.`);
  }

  // --- Insurance: mandatory, at minimum third-party liability ---
  if (isExpired(vehicle.insuranceExpiry, now)) {
    block("INSURANCE_EXPIRED", "Your vehicle insurance has expired.");
  } else if (daysUntil(vehicle.insuranceExpiry, now) <= rules.expiryWarningDays) {
    warn("INSURANCE_EXPIRING", `Your insurance expires in ${daysUntil(vehicle.insuranceExpiry, now)} days.`);
  }

  // --- Revenue licence: annual, and legally requires valid insurance + VET ---
  if (rules.requireRevenueLicence) {
    if (!vehicle.revenueLicenceExpiry) {
      block("NO_REVENUE_LICENCE", "No revenue licence is recorded for your vehicle.");
    } else if (isExpired(vehicle.revenueLicenceExpiry, now)) {
      block("REVENUE_LICENCE_EXPIRED", "Your vehicle revenue licence has expired.");
    } else if (daysUntil(vehicle.revenueLicenceExpiry, now) <= rules.expiryWarningDays) {
      warn(
        "REVENUE_LICENCE_EXPIRING",
        `Your revenue licence expires in ${daysUntil(vehicle.revenueLicenceExpiry, now)} days.`
      );
    }
  }

  // --- Vehicle Emission Test: annual, unless the vehicle is exempt ---
  if (rules.requireEmissionTest && !vehicle.emissionTestExempt) {
    if (!vehicle.emissionTestExpiry) {
      block("NO_EMISSION_TEST", "No emission test certificate is recorded for your vehicle.");
    } else if (isExpired(vehicle.emissionTestExpiry, now)) {
      block("EMISSION_TEST_EXPIRED", "Your vehicle emission test certificate has expired.");
    } else if (daysUntil(vehicle.emissionTestExpiry, now) <= rules.expiryWarningDays) {
      warn(
        "EMISSION_TEST_EXPIRING",
        `Your emission test certificate expires in ${daysUntil(vehicle.emissionTestExpiry, now)} days.`
      );
    }
  }

  // --- Certificate of fitness for higher-capacity vehicles ---
  if (requiresFitnessCertificate(vehicle.type)) {
    if (!vehicle.fitnessCertExpiry) {
      block("NO_FITNESS_CERT", "This vehicle class requires a certificate of fitness.");
    } else if (isExpired(vehicle.fitnessCertExpiry, now)) {
      block("FITNESS_CERT_EXPIRED", "Your certificate of fitness has expired.");
    }
  }

  // --- Documents: all required ones approved and unexpired ---
  const required = getRequiredDocuments(vehicle.type, rules);
  for (const type of required) {
    const docs = documents.filter((d) => d.type === type);
    const approved = docs.find((d) => d.status === "APPROVED");

    if (!approved) {
      const rejected = docs.some((d) => d.status === "REJECTED");
      block(
        `DOC_${type}`,
        rejected
          ? `${DOCUMENT_TYPE_LABELS[type]} was rejected — please re-upload it.`
          : `${DOCUMENT_TYPE_LABELS[type]} is missing or not yet verified.`
      );
      continue;
    }

    if (isExpired(approved.expiresAt, now)) {
      block(`DOC_EXPIRED_${type}`, `Your ${DOCUMENT_TYPE_LABELS[type]} has expired.`);
    } else if (approved.expiresAt && daysUntil(approved.expiresAt, now) <= rules.expiryWarningDays) {
      warn(
        `DOC_EXPIRING_${type}`,
        `Your ${DOCUMENT_TYPE_LABELS[type]} expires in ${daysUntil(approved.expiresAt, now)} days.`
      );
    }
  }

  // --- Platform performance standards (Uber/Lyft-style) ---
  // Only enforced once the driver has enough trips for the numbers to mean
  // something, so a single early bad rating can't remove someone.
  if (driver.ratingCount >= rules.ratingGracePeriod) {
    if (Number(driver.ratingAvg) < Number(rules.minRating)) {
      block(
        "RATING_BELOW_MINIMUM",
        `Your rating (${Number(driver.ratingAvg).toFixed(2)}) is below the minimum of ${Number(rules.minRating).toFixed(2)}.`
      );
    } else if (Number(driver.ratingAvg) < Number(rules.minRating) + 0.25) {
      warn("RATING_LOW", "Your rating is close to the minimum required to keep driving.");
    }
  }

  if (driver.offeredTrips >= rules.ratingGracePeriod) {
    const cancellationRate = driver.cancelledTrips / driver.offeredTrips;
    if (cancellationRate > Number(rules.maxCancellationRate)) {
      block(
        "CANCELLATION_RATE_HIGH",
        `Your cancellation rate (${(cancellationRate * 100).toFixed(0)}%) exceeds the ${(
          Number(rules.maxCancellationRate) * 100
        ).toFixed(0)}% limit.`
      );
    }
  }

  return { eligible: blockers.length === 0, blockers, warnings };
}

/** Resolves the association's eligibility rule, falling back to the global row. */
export function resolveEligibilityRules(
  associationRule: DriverEligibilityRule | null,
  globalRule: DriverEligibilityRule | null
): EligibilityConfig {
  const rule = associationRule ?? globalRule;
  if (rule) return rule;
  return {
    ...DEFAULT_ELIGIBILITY,
    minRating: "4.0" as unknown as DriverEligibilityRule["minRating"],
    maxCancellationRate: "0.25" as unknown as DriverEligibilityRule["maxCancellationRate"],
  };
}
