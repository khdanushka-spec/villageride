import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WalletView, type WalletTransaction } from "@/components/dashboard/wallet-view";

export const dynamic = "force-dynamic";

export default async function DriverWalletPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { wallet: { include: { transactions: { orderBy: { createdAt: "desc" } } } } },
  });
  if (!driver?.wallet) redirect("/login");

  const transactions: WalletTransaction[] = driver.wallet.transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    reason: tx.reason,
    amount: tx.amount.toString(),
    createdAt: tx.createdAt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Your trip earnings after association commission. Withdrawals are processed by your association.
        </p>
      </div>
      <WalletView balance={driver.wallet.balance.toString()} currency={driver.wallet.currency} transactions={transactions} />
    </div>
  );
}
