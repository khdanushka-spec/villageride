import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const REASON_LABELS: Record<string, string> = {
  TRIP_EARNING: "Trip earning",
  TRIP_PAYMENT: "Trip payment",
  WITHDRAWAL: "Withdrawal",
  TOPUP: "Top-up",
  REFUND: "Refund",
  COMMISSION: "Commission",
  PROMO_REWARD: "Promo reward",
  MEMBERSHIP_FEE: "Membership fee",
};

export type WalletTransaction = {
  id: string;
  type: "CREDIT" | "DEBIT";
  reason: string;
  amount: string;
  createdAt: Date;
};

export function WalletView({
  balance,
  currency,
  transactions,
}: {
  balance: string;
  currency: string;
  transactions: WalletTransaction[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <WalletIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Wallet balance</p>
          <p className="text-3xl font-semibold">
            {currency} {Number(balance).toLocaleString()}
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No transactions yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short" }).format(tx.createdAt)}
                  </TableCell>
                  <TableCell className="flex items-center gap-2 text-sm">
                    {tx.type === "CREDIT" ? (
                      <ArrowDownLeft className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                    )}
                    {REASON_LABELS[tx.reason] ?? tx.reason}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-medium ${tx.type === "CREDIT" ? "text-success" : "text-destructive"}`}
                  >
                    {tx.type === "CREDIT" ? "+" : "-"}
                    {currency} {Number(tx.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
