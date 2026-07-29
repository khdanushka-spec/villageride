import { CalendarClock, CarFront, MapPin, Star } from "lucide-react";

const steps = [
  {
    icon: MapPin,
    title: "Set pickup & destination",
    description: "Choose your vehicle type and see an upfront fare estimate before you book.",
  },
  {
    icon: CarFront,
    title: "Get matched instantly",
    description: "Nearby association drivers are notified immediately — the first to accept gets your trip.",
  },
  {
    icon: CalendarClock,
    title: "Track your ride live",
    description: "Watch your driver's live location, ETA, and route from pickup to drop-off.",
  },
  {
    icon: Star,
    title: "Pay & rate",
    description: "Pay by cash, card, or wallet, then rate your driver — they rate you back too.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-4 text-muted-foreground">From request to receipt, in four simple steps.</p>
        </div>

        <div className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <step.icon className="h-5 w-5" />
              </div>
              <span className="absolute -top-2 left-9 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
