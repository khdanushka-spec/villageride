import { BadgeCheck, Banknote, MapPinned, MessageCircle, ShieldAlert, Star } from "lucide-react";

const features = [
  {
    icon: BadgeCheck,
    title: "Verified drivers & vehicles",
    description:
      "Every driver is approved by their own village association after license, NIC, vehicle registration, and insurance checks.",
  },
  {
    icon: MapPinned,
    title: "Live tracking, real ETAs",
    description: "Follow your driver on the map from acceptance to arrival, with distance, ETA, and route shown live.",
  },
  {
    icon: Banknote,
    title: "Fair, transparent fares",
    description: "Associations set their own per-km pricing by vehicle type — no surprise surge unless the association allows it.",
  },
  {
    icon: Star,
    title: "Two-way ratings",
    description: "Customers rate drivers and drivers rate customers, building trust across every trip on the platform.",
  },
  {
    icon: MessageCircle,
    title: "In-app chat & calling",
    description: "Coordinate pickup details directly with your driver without sharing personal phone numbers.",
  },
  {
    icon: ShieldAlert,
    title: "Emergency SOS & trip sharing",
    description: "Share your live trip with a trusted contact, or trigger SOS in an emergency — for both riders and drivers.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything a modern ride platform needs</h2>
        <p className="mt-4 text-muted-foreground">
          Built with the same expectations as the platforms you already use — designed around how villages actually move.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group rounded-2xl border border-border/70 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-black/5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <feature.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
