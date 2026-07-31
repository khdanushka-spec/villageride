import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { OtpPurpose } from "@prisma/client";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  const max = 10 ** OTP_LENGTH;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(OTP_LENGTH, "0");
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Pluggable delivery transport. Swap this out for a real SMS/email provider
 * (e.g. Dialog/Notify.lk, Twilio, Resend) by setting the relevant provider
 * below — the OTP generation/verification logic above is provider-agnostic.
 */
async function deliverOtp(destination: string, code: string) {
  const isEmail = destination.includes("@");

  if (isEmail && process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "V Rides <no-reply@villageride.lk>",
        to: destination,
        subject: "Your V Rides verification code",
        text: `Your V Rides verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      }),
    });
    return;
  }

  if (!isEmail && process.env.SMS_PROVIDER_URL && process.env.SMS_PROVIDER_API_KEY) {
    await fetch(process.env.SMS_PROVIDER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SMS_PROVIDER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: destination,
        message: `Your V Rides verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      }),
    });
    return;
  }

  // No SMS/email provider configured yet — log to server console so the
  // OTP flow remains fully testable in development.
  console.log(`[otp] code for ${destination}: ${code} (purpose ttl ${OTP_TTL_MINUTES}m)`);
}

export async function requestOtp(destination: string, purpose: OtpPurpose, userId?: string) {
  const recent = await prisma.otpCode.count({
    where: {
      destination,
      purpose,
      createdAt: { gt: new Date(Date.now() - 60_000) },
    },
  });
  if (recent > 0) {
    throw new Error("Please wait a minute before requesting another code.");
  }

  const code = generateCode();
  await prisma.otpCode.create({
    data: {
      destination,
      purpose,
      userId,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
    },
  });

  await deliverOtp(destination, code);
}

export async function verifyOtp(destination: string, purpose: OtpPurpose, code: string) {
  const otp = await prisma.otpCode.findFirst({
    where: { destination, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { ok: false as const, error: "No verification code found. Request a new one." };
  if (otp.expiresAt < new Date()) return { ok: false as const, error: "Code expired. Request a new one." };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "Too many attempts. Request a new code." };

  if (hashCode(code) !== otp.codeHash) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false as const, error: "Incorrect code." };
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true as const };
}
