import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SavedAddresses, type SavedAddress } from "@/components/dashboard/saved-addresses";

export const dynamic = "force-dynamic";

export default async function CustomerAddressesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
    include: { savedAddresses: { orderBy: { createdAt: "desc" } } },
  });
  if (!customer) redirect("/login");

  const addresses: SavedAddress[] = customer.savedAddresses.map((a) => ({
    id: a.id,
    label: a.label,
    address: a.address,
    lat: a.lat,
    lng: a.lng,
    isFavorite: a.isFavorite,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Saved addresses</h1>
        <p className="text-sm text-muted-foreground">Quickly reuse your favorite pickup and drop-off points.</p>
      </div>
      <SavedAddresses initialAddresses={addresses} />
    </div>
  );
}
