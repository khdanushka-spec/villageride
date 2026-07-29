"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string; success?: string } | undefined;

const profileSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
});

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.user.update({ where: { id: session.user.id }, data: { name: parsed.data.name } });

  revalidatePath("/dashboard/customer/profile");
  revalidatePath("/dashboard/driver/profile");
  return { success: "Profile updated." };
}
