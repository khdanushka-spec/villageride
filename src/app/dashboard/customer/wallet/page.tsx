import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WalletView, type WalletTransaction } from "@/components/dashboard/wallet-view";

export const dynamic = "force-dynamic";

export default async function CustomerWalletPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
    include: { wallet: { include: { transactions: { orderBy: { createdAt: "desc" } } } } },
  });
  if (!customer?.wallet) redirect("/login");

  const transactions: WalletTransaction[] = customer.wallet.transactions.map((tx) => ({
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
          Pay for rides straight from your balance. Top-ups via card and PayHere are coming soon.
        </p>
      </div>
      <WalletView balance={customer.wallet.balance.toString()} currency={customer.wallet.currency} transactions={transactions} />
    </div>
  );
}
