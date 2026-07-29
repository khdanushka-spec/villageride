import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAssociationForAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ASSOCIATION_ADMIN") redirect("/login");

  const association = await prisma.association.findFirst({
    where: { admins: { some: { id: session.user.id } } },
  });
  if (!association) redirect("/login");

  return association;
}
