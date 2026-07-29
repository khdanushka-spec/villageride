import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CustomerBookingFlow } from "@/components/booking/customer-booking-flow";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) redirect("/login");

  const activeTrip = await prisma.trip.findFirst({
    where: {
      customerId: customer.id,
      status: { in: ["REQUESTED", "SEARCHING", "ACCEPTED", "DRIVER_ARRIVED", "IN_PROGRESS", "COMPLETED"] },
    },
    orderBy: { requestedAt: "desc" },
  });

  // Only resume an in-flight or just-completed (unrated) trip automatically.
  const shouldResume =
    activeTrip &&
    (activeTrip.status !== "COMPLETED" ||
      (await prisma.rating.count({ where: { tripId: activeTrip.id, fromUserId: session.user.id } })) === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Book a ride</h1>
        <p className="text-sm text-muted-foreground">Choose a pickup and destination to see fare estimates.</p>
      </div>
      <CustomerBookingFlow initialActiveTripId={shouldResume ? activeTrip!.id : null} />
    </div>
  );
}
