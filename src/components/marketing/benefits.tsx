import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const driverBenefits = [
  "Keep more of every fare — commission stays within your own association",
  "Choose your own hours: go online and offline whenever you want",
  "Weekly payouts straight to your V Rides wallet",
  "Build a public rating that follows you across every trip",
];

const associationBenefits = [
  "Approve, suspend, or remove drivers from your own dashboard",
  "Set your own per-km pricing by vehicle type",
  "See every ride, every driver, and every rupee of commission earned",
  "Send announcements and manage membership fees in one place",
];

export function Benefits() {
  return (
    <section id="associations" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-border/70 bg-card p-8">
          <h3 className="text-xl font-semibold">For drivers</h3>
          <ul className="mt-6 space-y-4">
            {driverBenefits.map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-8" nativeButton={false} render={<Link href="/register/driver" />}>
            Register as a driver
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-8">
          <h3 className="text-xl font-semibold">For associations</h3>
          <ul className="mt-6 space-y-4">
            {associationBenefits.map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <Button
            className="mt-8"
            variant="outline"
            nativeButton={false}
            render={<Link href="mailto:partners@villageride.lk" />}
          >
            Talk to our partnerships team
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
