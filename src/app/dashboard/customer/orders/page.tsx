import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrdersFlow } from "@/components/shop/orders-flow";
import { ACTIVE_ORDER_STATUSES } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) redirect("/login");

  const [activeOrder, pastOrders] = await Promise.all([
    prisma.order.findFirst({
      where: { customerId: customer.id, status: { in: ACTIVE_ORDER_STATUSES } },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.order.findMany({
      where: { customerId: customer.id, status: { notIn: ACTIVE_ORDER_STATUSES } },
      include: { vendor: { select: { name: true } } },
      orderBy: { requestedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Track your current order or browse past ones.</p>
      </div>
      <OrdersFlow
        initialActiveOrderId={activeOrder?.id ?? null}
        pastOrders={pastOrders.map((o) => ({
          id: o.id,
          vendorName: o.vendor.name,
          status: o.status,
          totalAmount: o.totalAmount.toString(),
          requestedAt: o.requestedAt.toISOString(),
        }))}
      />
    </div>
  );
}
