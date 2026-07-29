"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string; success?: string } | undefined;

const addressSchema = z.object({
  label: z.string().min(1, "Give this address a name."),
  address: z.string().min(1, "Enter an address."),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

export async function saveAddressAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") return { error: "Not authorized." };

  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) return { error: "Customer profile not found." };

  await prisma.savedAddress.create({
    data: {
      customerId: customer.id,
      label: parsed.data.label,
      address: parsed.data.address,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    },
  });

  revalidatePath("/dashboard/customer/addresses");
  return { success: "Address saved." };
}

export async function deleteAddressAction(addressId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") return { error: "Not authorized." };

  const address = await prisma.savedAddress.findUnique({
    where: { id: addressId },
    include: { customer: true },
  });
  if (!address || address.customer.userId !== session.user.id) return { error: "Not found." };

  await prisma.savedAddress.delete({ where: { id: addressId } });
  revalidatePath("/dashboard/customer/addresses");
  return { success: true };
}
