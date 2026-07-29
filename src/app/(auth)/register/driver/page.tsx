import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DriverRegisterForm } from "@/components/auth/driver-register-form";

export default async function DriverRegisterPage() {
  const associations = await prisma.association.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, district: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Register as a driver</h1>
        <p className="text-sm text-muted-foreground">
          Your local association reviews every application before you can go online.
        </p>
      </div>

      <DriverRegisterForm associations={associations} />

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
