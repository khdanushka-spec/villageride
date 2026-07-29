import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EarningsChart } from "@/components/dashboard/earnings-chart";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day + 6) % 7; // Monday as start of week
  x.setDate(x.getDate() - diff);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function DriverEarningsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id }, include: { wallet: true } });
  if (!driver?.wallet) redirect("/login");

  const since = new Date();
  since.setDate(since.getDate() - 29);

  const transactions = await prisma.transaction.findMany({
    where: { walletId: driver.wallet.id, reason: "TRIP_EARNING", createdAt: { gte: startOfMonth(new Date()) < since ? startOfMonth(new Date()) : since } },
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const sum = (from: Date) =>
    transactions.filter((t) => t.createdAt >= from).reduce((acc, t) => acc + Number(t.amount), 0);

  const daily: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const amount = transactions
      .filter((t) => t.createdAt >= day && t.createdAt < next)
      .reduce((acc, t) => acc + Number(t.amount), 0);
    daily.push({ date: day.toLocaleDateString("en-LK", { weekday: "short" }), amount });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Earnings</h1>
        <p className="text-sm text-muted-foreground">Your take-home after association commission.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Today", sum(todayStart)],
          ["This week", sum(weekStart)],
          ["This month", sum(monthStart)],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">LKR {(value as number).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-medium">Last 7 days</h3>
        <EarningsChart data={daily} />
      </div>
    </div>
  );
}
