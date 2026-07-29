"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requestOtp } from "@/lib/otp";
import { saveUploadedFile, saveUploadedFiles } from "@/lib/storage";
import { normalizeSriLankanPhone } from "@/lib/phone";
import { ROLE_HOME } from "@/lib/rbac";
import type { VehicleType } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

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

  const result = await signIn("credentials", { ...parsed.data, redirect: false });
  if (result?.error) return { error: "Invalid email or password." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  redirect(user ? ROLE_HOME[user.role] : "/");
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

  const result = await signIn("credentials", { email: email.toLowerCase(), password, redirect: false });
  if (result?.error) return { error: "Account created, but sign-in failed. Try logging in." };

  redirect(ROLE_HOME.CUSTOMER);
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

  const result = await signIn("phone-otp", { phone, code, name, intent, redirect: false });
  if (result?.error) return { error: "Invalid or expired code." };

  const user = await prisma.user.findUnique({ where: { phone } });
  redirect(user ? ROLE_HOME[user.role] : "/");
}

// ---------------------------------------------------------------------------
// Driver registration
// ---------------------------------------------------------------------------

const driverRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  associationId: z.string().min(1, "Select your village taxi association."),
  licenseNumber: z.string().min(3),
  licenseExpiry: z.string(),
  vehicleType: z.string(),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  plateNumber: z.string().min(3),
  color: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(60),
  insuranceExpiry: z.string(),
});

export async function registerDriverAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = driverRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existingEmail) return { error: "An account with this email already exists." };

  const existingPlate = await prisma.vehicle.findUnique({ where: { plateNumber: data.plateNumber } });
  if (existingPlate) return { error: "This plate number is already registered." };

  const licensePhoto = formData.get("licensePhoto") as File | null;
  const nicPhoto = formData.get("nicPhoto") as File | null;
  const vehicleRegPhoto = formData.get("vehicleRegPhoto") as File | null;
  const insurancePhoto = formData.get("insurancePhoto") as File | null;
  const profilePhoto = formData.get("profilePhoto") as File | null;
  const vehiclePhotos = formData.getAll("vehiclePhotos").filter((f): f is File => f instanceof File && f.size > 0);

  if (!licensePhoto?.size || !nicPhoto?.size || !vehicleRegPhoto?.size || !insurancePhoto?.size) {
    return { error: "Please upload all required documents." };
  }

  const [licenseUrl, nicUrl, vehicleRegUrl, insuranceUrl, profileUrl, photoUrls] = await Promise.all([
    saveUploadedFile(licensePhoto, "documents/license"),
    saveUploadedFile(nicPhoto, "documents/nic"),
    saveUploadedFile(vehicleRegPhoto, "documents/vehicle-registration"),
    saveUploadedFile(insurancePhoto, "documents/insurance"),
    profilePhoto?.size ? saveUploadedFile(profilePhoto, "documents/profile") : Promise.resolve(null),
    saveUploadedFiles(vehiclePhotos, "documents/vehicle-photos"),
  ]);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: await hashPassword(data.password),
      role: "DRIVER",
      avatarUrl: profileUrl,
      driverProfile: {
        create: {
          associationId: data.associationId,
          licenseNumber: data.licenseNumber,
          licenseExpiry: new Date(data.licenseExpiry),
          wallet: { create: { ownerType: "DRIVER", balance: 0 } },
          vehicles: {
            create: {
              type: data.vehicleType as VehicleType,
              make: data.make,
              model: data.model,
              year: data.year,
              plateNumber: data.plateNumber,
              color: data.color,
              capacity: data.capacity,
              insuranceExpiry: new Date(data.insuranceExpiry),
              photoUrls,
            },
          },
          documents: {
            create: [
              { type: "DRIVER_LICENSE", fileUrl: licenseUrl },
              { type: "NATIONAL_ID", fileUrl: nicUrl },
              { type: "VEHICLE_REGISTRATION", fileUrl: vehicleRegUrl },
              { type: "INSURANCE", fileUrl: insuranceUrl },
              ...(profileUrl ? [{ type: "PROFILE_PHOTO" as const, fileUrl: profileUrl }] : []),
            ],
          },
        },
      },
    },
  });

  const result = await signIn("credentials", { email: data.email.toLowerCase(), password: data.password, redirect: false });
  if (result?.error) return { error: "Registration submitted, but sign-in failed. Try logging in." };

  redirect(ROLE_HOME.DRIVER);
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/");
}
