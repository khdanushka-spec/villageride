import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/require-super-admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireSuperAdminSession();

  const [totalUsers, totalTrips, pricingRules] = await Promise.all([
    prisma.user.count(),
    prisma.trip.count(),
    prisma.pricingRule.count({ where: { associationId: null } }),
  ]);

  const rows = [
    ["Environment", process.env.VERCEL_ENV ?? "development"],
    ["Total accounts", totalUsers.toString()],
    ["Total trips recorded", totalTrips.toString()],
    ["Global pricing rules configured", `${pricingRules} / 9 vehicle types`],
    ["Payment gateways connected", "Cash and Wallet only — PayHere/Stripe not yet configured"],
    ["SMS provider connected", process.env.SMS_PROVIDER_URL ? "Yes" : "No — OTPs log to server console"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System settings</h1>
        <p className="text-sm text-muted-foreground">Current platform configuration.</p>
      </div>

      <div className="max-w-xl overflow-hidden rounded-2xl border border-border">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={`flex items-center justify-between px-5 py-3 text-sm ${i > 0 ? "border-t border-border" : ""}`}
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
