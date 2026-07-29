import { PrismaClient, type VehicleType } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const GLOBAL_RATES: Record<VehicleType, { baseFare: number; perKmRate: number; perMinuteRate: number; minimumFare: number }> = {
  THREE_WHEELER: { baseFare: 100, perKmRate: 80, perMinuteRate: 5, minimumFare: 150 },
  TAXI: { baseFare: 150, perKmRate: 100, perMinuteRate: 8, minimumFare: 250 },
  MINI_VAN: { baseFare: 250, perKmRate: 110, perMinuteRate: 9, minimumFare: 400 },
  VAN: { baseFare: 300, perKmRate: 120, perMinuteRate: 10, minimumFare: 500 },
  SUV: { baseFare: 350, perKmRate: 140, perMinuteRate: 12, minimumFare: 600 },
  BUS: { baseFare: 1000, perKmRate: 200, perMinuteRate: 15, minimumFare: 2000 },
  TRUCK: { baseFare: 800, perKmRate: 180, perMinuteRate: 5, minimumFare: 1500 },
  LORRY: { baseFare: 1200, perKmRate: 220, perMinuteRate: 5, minimumFare: 2500 },
  DELIVERY_VEHICLE: { baseFare: 200, perKmRate: 90, perMinuteRate: 5, minimumFare: 300 },
};

const ASSOCIATIONS = [
  { name: "Kandy Town Taxi Association", slug: "kandy-town", district: "Kandy" },
  { name: "Galle Coastal Taxi Cooperative", slug: "galle-coastal", district: "Galle" },
  { name: "Jaffna Taxi & Three-Wheeler Union", slug: "jaffna-union", district: "Jaffna" },
];

async function main() {
  console.log("Seeding global pricing rules...");
  for (const [vehicleType, rates] of Object.entries(GLOBAL_RATES) as [VehicleType, (typeof GLOBAL_RATES)[VehicleType]][]) {
    // Nullable associationId means the compound unique index can't be used
    // directly in a `where` (Postgres treats NULLs as distinct), so look the
    // global rule up manually instead of upserting on it.
    const existing = await prisma.pricingRule.findFirst({ where: { associationId: null, vehicleType } });
    if (existing) {
      await prisma.pricingRule.update({ where: { id: existing.id }, data: rates });
    } else {
      await prisma.pricingRule.create({ data: { associationId: null, vehicleType, ...rates } });
    }
  }

  console.log("Seeding village taxi associations...");
  for (const assoc of ASSOCIATIONS) {
    await prisma.association.upsert({
      where: { slug: assoc.slug },
      update: {},
      create: { ...assoc, status: "ACTIVE", commissionPercent: 10 },
    });
  }

  console.log("Seeding super admin account...");
  const adminEmail = "admin@villageride.lk";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  // Set to force a (re)set of the super admin password on this deploy only —
  // e.g. when the account already exists but its password was never
  // recorded. Remove after use so future deploys don't clobber a password
  // the account owner has since changed.
  const forcedPassword = process.env.SEED_RESET_ADMIN_PASSWORD;

  if (!existingAdmin) {
    const password = forcedPassword || crypto.randomBytes(9).toString("base64url");
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Platform Admin",
        role: "SUPER_ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
        emailVerifiedAt: new Date(),
      },
    });
    console.log("\n============================================");
    console.log("Super admin created:");
    console.log(`  email:    ${adminEmail}`);
    console.log(`  password: ${password}`);
    console.log("Save this now — it will not be shown again.");
    console.log("============================================\n");
  } else if (forcedPassword) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { passwordHash: await bcrypt.hash(forcedPassword, 12) },
    });
    console.log("\n============================================");
    console.log("Super admin password reset:");
    console.log(`  email:    ${adminEmail}`);
    console.log(`  password: ${forcedPassword}`);
    console.log("============================================\n");
  } else {
    console.log("Super admin already exists, skipping.");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
