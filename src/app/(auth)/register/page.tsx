import Link from "next/link";
import { ArrowRight, Car, UserRound } from "lucide-react";

export default function RegisterChoicePage() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Choose how you&apos;ll use VillageRide.</p>
      </div>

      <div className="space-y-3">
        <Link
          href="/register/customer"
          className="group flex items-center gap-4 rounded-2xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-secondary/60"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-medium">I need a ride</span>
            <span className="block text-sm text-muted-foreground">Book taxis, three-wheelers, vans and more.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/register/driver"
          className="group flex items-center gap-4 rounded-2xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-secondary/60"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Car className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-medium">I drive for a taxi association</span>
            <span className="block text-sm text-muted-foreground">Register your vehicle and start earning.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
