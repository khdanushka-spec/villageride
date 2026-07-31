import { Handshake, Landmark, Users } from "lucide-react";

const points = [
  {
    icon: Landmark,
    title: "Your association stays in control",
    description:
      "Pricing, driver approvals, and commissions are set locally by each association — V Rides provides the platform, not the policy.",
  },
  {
    icon: Users,
    title: "Built for how associations already work",
    description:
      "Most taxi societies already coordinate over phone and word of mouth. V Rides digitizes that trust without replacing it.",
  },
  {
    icon: Handshake,
    title: "Fair by design",
    description:
      "Two-way ratings, transparent fares, and association-level dispute handling keep both drivers and customers protected.",
  },
];

export function ValueProps() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Why associations choose V Rides</h2>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {points.map((point) => (
          <div key={point.title} className="rounded-2xl border border-border/70 p-6">
            <point.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{point.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{point.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
