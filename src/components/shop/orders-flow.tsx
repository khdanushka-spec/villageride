"use client";

import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrderTrackingPanel } from "@/components/shop/order-tracking-panel";
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from "@/lib/products";
import type { OrderStatus } from "@prisma/client";

type PastOrder = {
  id: string;
  vendorName: string;
  status: OrderStatus;
  totalAmount: string;
  requestedAt: string;
};

export function OrdersFlow({
  initialActiveOrderId,
  pastOrders,
}: {
  initialActiveOrderId: string | null;
  pastOrders: PastOrder[];
}) {
  const [activeOrderId, setActiveOrderId] = useState(initialActiveOrderId);

  if (activeOrderId) {
    return (
      <div className="mx-auto max-w-md">
        <OrderTrackingPanel orderId={activeOrderId} onClosed={() => setActiveOrderId(null)} />
      </div>
    );
  }

  if (pastOrders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        <Package className="mx-auto mb-2 h-8 w-8" />
        No orders yet.{" "}
        <Link href="/dashboard/customer/shop" className="text-primary hover:underline">
          Browse shops
        </Link>{" "}
        to place your first order.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pastOrders.map((o) => (
        <div key={o.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="font-medium">{o.vendorName}</p>
            <p className="text-xs text-muted-foreground">{new Date(o.requestedAt).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
            <span className="font-semibold">LKR {Number(o.totalAmount).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
