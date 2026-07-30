"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requestOtp } from "@/lib/otp";
import { saveUploadedFile, saveUploadedFiles } from "@/lib/storage";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { ROLE_HOME } from "@/lib/rbac";
import { SRI_LANKA_DISTRICTS, isValidNic } from "@/lib/districts";
import { LICENCE_CLASSES, licenceClassPermits, requiresFitnessCertificate } from "@/lib/licence-classes";
import { DOCUMENT_ISSUING_AUTHORITY, DOCUMENT_TYPE_LABELS, resolveEligibilityRules } from "@/lib/compliance";
import { VEHICLE_TYPES, VEHICLE_TYPE_LABELS } from "@/lib/vehicle-types";
import type { Prisma } from "@prisma/client";

export type ActionState = { error?: string; success?: string; redirectTo?: string } | undefined;

/**
 * signIn() with redirect: false still throws (not returns {error}) on bad
 * credentials in this NextAuth version — an uncaught throw here crashes the
 * Server Action into Next's generic error page instead of showing a message.
 */
async function trySignIn(...args: Parameters<typeof signIn>): Promise<{ error?: string }> {
  try {
    await signIn(...args);
    return {};
  } catch (err) {
    if (err instanceof AuthError) return { error: "auth" };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Email + password
// ---------------------------------------------------------------------------

const emailLoginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginWithEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await trySignIn("credentials", { ...parsed.data, redirect: false });
  if (result.error) return { error: "Invalid email or password." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  return { redirectTo: user ? ROLE_HOME[user.role] : "/" };
}

const customerRegisterSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function registerCustomerWithEmailAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = customerRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return { error: "An account with this email already exists." };

  await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "CUSTOMER",
      customerProfile: { create: { wallet: { create: { ownerType: "CUSTOMER", balance: 0 } } } },
    },
  });

  const result = await trySignIn("credentials", { email: email.toLowerCase(), password, redirect: false });
  if (result.error) return { error: "Account created, but sign-in failed. Try logging in." };

  return { redirectTo: ROLE_HOME.CUSTOMER };
}

// ---------------------------------------------------------------------------
// Phone OTP (customer login + registration)
// ---------------------------------------------------------------------------

export async function requestPhoneOtpAction(
  phoneRaw: string,
  intent: "login" | "register"
): Promise<ActionState> {
  const phone = normalizeSriLankanPhone(phoneRaw);
  if (!phone) return { error: "Enter a valid Sri Lankan mobile number." };

  if (intent === "login") {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return { error: "No account found with this number. Try registering instead." };
  } else {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (user) return { error: "This number is already registered. Try logging in instead." };
  }

  try {
    await requestOtp(phone, intent === "login" ? "LOGIN" : "REGISTER");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send code." };
  }

  return { success: `Verification code sent to ${phone}.` };
}

export async function verifyPhoneOtpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const phoneRaw = String(formData.get("phone") ?? "");
  const code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "");
  const intent = String(formData.get("intent") ?? "login") === "register" ? "register" : "login";

  const phone = normalizeSriLankanPhone(phoneRaw);
  if (!phone) return { error: "Enter a valid Sri Lankan mobile number." };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };
  if (intent === "register" && name.trim().length < 2) return { error: "Enter your full name." };

  const result = await trySignIn("phone-otp", { phone, code, name, intent, redirect: false });
  if (result.error) return { error: "Invalid or expired code." };

  const user = await prisma.user.findUnique({ where: { phone } });
  return { redirectTo: user ? ROLE_HOME[user.role] : "/" };
}

// ---------------------------------------------------------------------------
// Driver registration
// ---------------------------------------------------------------------------

const driverRegisterSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),

  // Identity
  nicNumber: z.string().refine(isValidNic, "Enter a valid NIC (9 digits + V/X, or 12 digits)."),
  dateOfBirth: z.string().min(1, "Enter your date of birth."),
  addressLine: z.string().min(3, "Enter your address."),
  city: z.string().min(2, "Enter your city or town."),
  district: z.enum(SRI_LANKA_DISTRICTS, "Select your district."),
  gnDivision: z.string().min(2, "Enter your Grama Niladhari division."),

  // Association & licence
  associationId: z.string().min(1, "Select your village taxi association."),
  licenseNumber: z.string().min(3, "Enter your driving licence number."),
  licenceClass: z.enum(LICENCE_CLASSES, "Select your driving licence class."),
  licenceIssuedAt: z.string().min(1, "Enter the date your licence was issued."),
  licenseExpiry: z.string().min(1, "Enter your licence expiry date."),

  // Vehicle
  vehicleType: z.enum(VEHICLE_TYPES, "Select your vehicle type."),
  make: z.string().min(1, "Enter the vehicle make."),
  model: z.string().min(1, "Enter the vehicle model."),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  plateNumber: z.string().min(3, "Enter the plate number."),
  color: z.string().min(1, "Enter the vehicle colour."),
  capacity: z.coerce.number().int().min(1).max(60),

  // Insurance (mandatory, at minimum third-party liability)
  insurerName: z.string().min(2, "Enter your insurance company."),
  insurancePolicyNo: z.string().min(2, "Enter your insurance policy number."),
  insuranceExpiry: z.string().min(1, "Enter your insurance expiry date."),

  // Revenue licence — annual, and legally requires valid insurance + VET
  revenueLicenceNo: z.string().min(2, "Enter your revenue licence number."),
  revenueLicenceExpiry: z.string().min(1, "Enter your revenue licence expiry date."),

  // Vehicle Emission Test — annual, unless the vehicle is exempt. A native
  // checkbox omits the field entirely when unchecked rather than sending
  // "false", so presence of any value (e.g. "on") means checked.
  emissionTestExempt: z
    .string()
    .optional()
    .transform((v) => v != null),
  emissionTestExpiry: z.string().optional(),

  // Certificate of fitness — higher-capacity vehicle classes only
  fitnessCertExpiry: z.string().optional(),

  // Police clearance / GN certificate reference details
  policeClearanceNo: z.string().min(2, "Enter your police clearance certificate number."),
  policeClearanceIssuedAt: z.string().min(1, "Enter the police clearance issue date."),
  medicalCertExpiry: z.string().min(1, "Enter your medical certificate expiry date."),
});

export async function registerDriverAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = driverRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existingEmail) return { error: "An account with this email already exists." };

  const nic = data.nicNumber.trim().toUpperCase();
  const existingNic = await prisma.driver.findUnique({ where: { nicNumber: nic } });
  if (existingNic) return { error: "A driver with this NIC is already registered." };

  const existingPlate = await prisma.vehicle.findUnique({ where: { plateNumber: data.plateNumber } });
  if (existingPlate) return { error: "This plate number is already registered." };

  // Eligibility thresholds: the association's own rule if it has one, else the
  // platform-wide default.
  const [associationRule, globalRule] = await Promise.all([
    prisma.driverEligibilityRule.findUnique({ where: { associationId: data.associationId } }),
    prisma.driverEligibilityRule.findFirst({ where: { associationId: null } }),
  ]);
  const rules = resolveEligibilityRules(associationRule, globalRule);

  // The licence class must legally permit the vehicle they intend to drive.
  if (!licenceClassPermits(data.licenceClass, data.vehicleType)) {
    return {
      error: `A class ${data.licenceClass} licence does not permit driving a ${VEHICLE_TYPE_LABELS[data.vehicleType]}.`,
    };
  }

  const dateOfBirth = new Date(data.dateOfBirth);
  const ageYears = (Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears < rules.minDriverAge) {
    return { error: `Drivers must be at least ${rules.minDriverAge} years old.` };
  }

  const vehicleAge = new Date().getFullYear() - data.year;
  if (vehicleAge > rules.maxVehicleAgeYears) {
    return { error: `Vehicles older than ${rules.maxVehicleAgeYears} years cannot be registered.` };
  }

  if (rules.requireEmissionTest && !data.emissionTestExempt && !data.emissionTestExpiry) {
    return { error: "Enter your emission test certificate expiry, or mark the vehicle as exempt." };
  }

  const needsFitnessCert = requiresFitnessCertificate(data.vehicleType);
  if (needsFitnessCert && !data.fitnessCertExpiry) {
    return { error: `A ${VEHICLE_TYPE_LABELS[data.vehicleType]} requires a certificate of fitness.` };
  }

  // --- Document uploads ---
  const files = {
    licensePhoto: formData.get("licensePhoto") as File | null,
    nicPhoto: formData.get("nicPhoto") as File | null,
    vehicleRegPhoto: formData.get("vehicleRegPhoto") as File | null,
    insurancePhoto: formData.get("insurancePhoto") as File | null,
    revenueLicencePhoto: formData.get("revenueLicencePhoto") as File | null,
    emissionTestPhoto: formData.get("emissionTestPhoto") as File | null,
    policeClearancePhoto: formData.get("policeClearancePhoto") as File | null,
    gramaNiladhariPhoto: formData.get("gramaNiladhariPhoto") as File | null,
    medicalCertPhoto: formData.get("medicalCertPhoto") as File | null,
    fitnessCertPhoto: formData.get("fitnessCertPhoto") as File | null,
    profilePhoto: formData.get("profilePhoto") as File | null,
  };
  const vehiclePhotos = formData.getAll("vehiclePhotos").filter((f): f is File => f instanceof File && f.size > 0);

  const missing: string[] = [];
  if (!files.licensePhoto?.size) missing.push(DOCUMENT_TYPE_LABELS.DRIVER_LICENSE);
  if (!files.nicPhoto?.size) missing.push(DOCUMENT_TYPE_LABELS.NATIONAL_ID);
  if (!files.vehicleRegPhoto?.size) missing.push(DOCUMENT_TYPE_LABELS.VEHICLE_REGISTRATION);
  if (!files.insurancePhoto?.size) missing.push(DOCUMENT_TYPE_LABELS.INSURANCE);
  if (rules.requireRevenueLicence && !files.revenueLicencePhoto?.size) missing.push(DOCUMENT_TYPE_LABELS.REVENUE_LICENCE);
  if (rules.requireEmissionTest && !data.emissionTestExempt && !files.emissionTestPhoto?.size) {
    missing.push(DOCUMENT_TYPE_LABELS.VEHICLE_EMISSION_TEST);
  }
  if (rules.requirePoliceClearance && !files.policeClearancePhoto?.size) missing.push(DOCUMENT_TYPE_LABELS.POLICE_CLEARANCE);
  if (rules.requireGramaNiladhari && !files.gramaNiladhariPhoto?.size) {
    missing.push(DOCUMENT_TYPE_LABELS.GRAMA_NILADHARI_CERTIFICATE);
  }
  if (rules.requireMedicalCert && !files.medicalCertPhoto?.size) missing.push(DOCUMENT_TYPE_LABELS.MEDICAL_CERTIFICATE);
  if (needsFitnessCert && !files.fitnessCertPhoto?.size) missing.push(DOCUMENT_TYPE_LABELS.VEHICLE_FITNESS_CERTIFICATE);

  if (missing.length) {
    return { error: `Please upload: ${missing.join(", ")}.` };
  }

  const upload = (file: File | null, folder: string) =>
    file?.size ? saveUploadedFile(file, folder) : Promise.resolve(null);

  const [
    licenseUrl,
    nicUrl,
    vehicleRegUrl,
    insuranceUrl,
    revenueLicenceUrl,
    emissionTestUrl,
    policeClearanceUrl,
    gramaNiladhariUrl,
    medicalCertUrl,
    fitnessCertUrl,
    profileUrl,
    photoUrls,
  ] = await Promise.all([
    upload(files.licensePhoto, "documents/license"),
    upload(files.nicPhoto, "documents/nic"),
    upload(files.vehicleRegPhoto, "documents/vehicle-registration"),
    upload(files.insurancePhoto, "documents/insurance"),
    upload(files.revenueLicencePhoto, "documents/revenue-licence"),
    upload(files.emissionTestPhoto, "documents/emission-test"),
    upload(files.policeClearancePhoto, "documents/police-clearance"),
    upload(files.gramaNiladhariPhoto, "documents/grama-niladhari"),
    upload(files.medicalCertPhoto, "documents/medical"),
    upload(files.fitnessCertPhoto, "documents/fitness"),
    upload(files.profilePhoto, "documents/profile"),
    saveUploadedFiles(vehiclePhotos, "documents/vehicle-photos"),
  ]);

  const optionalDate = (value: string | undefined) => (value ? new Date(value) : null);

  // Every uploaded document carries its own reference number and validity, so
  // expiry can be enforced automatically after approval.
  const documents: Prisma.DocumentCreateWithoutDriverInput[] = [
    {
      type: "DRIVER_LICENSE",
      fileUrl: licenseUrl!,
      documentNumber: data.licenseNumber,
      issuingAuthority: DOCUMENT_ISSUING_AUTHORITY.DRIVER_LICENSE,
      issuedAt: new Date(data.licenceIssuedAt),
      expiresAt: new Date(data.licenseExpiry),
    },
    {
      type: "NATIONAL_ID",
      fileUrl: nicUrl!,
      documentNumber: nic,
      issuingAuthority: DOCUMENT_ISSUING_AUTHORITY.NATIONAL_ID,
    },
    {
      type: "VEHICLE_REGISTRATION",
      fileUrl: vehicleRegUrl!,
      documentNumber: data.plateNumber,
      issuingAuthority: DOCUMENT_ISSUING_AUTHORITY.VEHICLE_REGISTRATION,
    },
    {
      type: "INSURANCE",
      fileUrl: insuranceUrl!,
      documentNumber: data.insurancePolicyNo,
      issuingAuthority: data.insurerName,
      expiresAt: new Date(data.insuranceExpiry),
    },
  ];

  if (revenueLicenceUrl) {
    documents.push({
      type: "REVENUE_LICENCE",
      fileUrl: revenueLicenceUrl,
      documentNumber: data.revenueLicenceNo,
      issuingAuthority: DOCUMENT_ISSUING_AUTHORITY.REVENUE_LICENCE,
      expiresAt: new Date(data.revenueLicenceExpiry),
    });
  }
  if (emissionTestUrl) {
    documents.push({
      type: "VEHICLE_EMISSION_TEST",
      fileUrl: emissionTestUrl,
      issuingAuthority: DOCUMENT_ISSUING_AUTHORITY.VEHICLE_EMISSION_TEST,
      expiresAt: optionalDate(data.emissionTestExpiry),
    });
  }
  if (policeClearanceUrl) {
    documents.push({
      type: "POLICE_CLEARANCE",
      fileUrl: policeClearanceUrl,
      documentNumber: data.policeClearanceNo,
      issuingAuthority: DOCUMENT_ISSUING_AUTHORITY.POLICE_CLEARANCE,
      issuedAt: new Date(data.policeClearanceIssuedAt),
    });
  }
  if (gramaNiladhariUrl) {
    documents.push({
      type: "GRAMA_NILADHARI_CERTIFICATE",
      fileUrl: gramaNiladhariUrl,
      issuingAuthority: `Grama Niladhari, ${data.gnDivision}`,
    });
  }
  if (medicalCertUrl) {
    documents.push({
      type: "MEDICAL_CERTIFICATE",
      fileUrl: medicalCertUrl,
      issuingAuthority: DOCUMENT_ISSUING_AUTHORITY.MEDICAL_CERTIFICATE,
      expiresAt: new Date(data.medicalCertExpiry),
    });
  }
  if (fitnessCertUrl) {
    documents.push({
      type: "VEHICLE_FITNESS_CERTIFICATE",
      fileUrl: fitnessCertUrl,
      issuingAuthority: DOCUMENT_ISSUING_AUTHORITY.VEHICLE_FITNESS_CERTIFICATE,
      expiresAt: optionalDate(data.fitnessCertExpiry),
    });
  }
  if (profileUrl) {
    documents.push({ type: "PROFILE_PHOTO", fileUrl: profileUrl });
  }

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: await hashPassword(data.password),
      role: "DRIVER",
      avatarUrl: profileUrl,
      driverProfile: {
        create: {
          associationId: data.associationId,
          nicNumber: nic,
          dateOfBirth,
          addressLine: data.addressLine,
          city: data.city,
          district: data.district,
          gnDivision: data.gnDivision,
          licenseNumber: data.licenseNumber,
          licenceClass: data.licenceClass,
          licenceIssuedAt: new Date(data.licenceIssuedAt),
          licenseExpiry: new Date(data.licenseExpiry),
          // Application goes straight into the association's review queue.
          status: "DOCUMENTS_UNDER_REVIEW",
          submittedAt: new Date(),
          backgroundCheckStatus: "NOT_STARTED",
          wallet: { create: { ownerType: "DRIVER", balance: 0 } },
          vehicles: {
            create: {
              type: data.vehicleType,
              make: data.make,
              model: data.model,
              year: data.year,
              plateNumber: data.plateNumber,
              color: data.color,
              capacity: data.capacity,
              insurerName: data.insurerName,
              insurancePolicyNo: data.insurancePolicyNo,
              insuranceExpiry: new Date(data.insuranceExpiry),
              revenueLicenceNo: data.revenueLicenceNo,
              revenueLicenceExpiry: new Date(data.revenueLicenceExpiry),
              emissionTestExempt: data.emissionTestExempt,
              emissionTestExpiry: optionalDate(data.emissionTestExpiry),
              fitnessCertExpiry: optionalDate(data.fitnessCertExpiry),
              photoUrls,
            },
          },
          documents: { create: documents },
        },
      },
    },
  });

  const result = await trySignIn("credentials", { email: data.email.toLowerCase(), password: data.password, redirect: false });
  if (result.error) return { error: "Registration submitted, but sign-in failed. Try logging in." };

  return { redirectTo: ROLE_HOME.DRIVER };
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/");
}
