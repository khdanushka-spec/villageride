import { VEHICLE_TYPE_ICONS, VEHICLE_TYPE_LABELS, VEHICLE_TYPES } from "@/lib/vehicle-types";

const descriptions: Record<string, string> = {
  TAXI: "Metered city rides",
  THREE_WHEELER: "Quick, affordable trips",
  VAN: "Small groups & luggage",
  MINI_VAN: "Family-sized trips",
  SUV: "Comfort for longer trips",
  BUS: "Group & event transport",
  TRUCK: "Goods & light cargo",
  LORRY: "Heavy cargo hauling",
  DELIVERY_VEHICLE: "Parcels & courier runs",
};

export function VehicleCategories() {
  return (
    <section id="vehicles" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">A vehicle for every trip</h2>
        <p className="mt-4 text-muted-foreground">From a quick three-wheeler hop to a full lorry booking.</p>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {VEHICLE_TYPES.map((type) => {
          const Icon = VEHICLE_TYPE_ICONS[type];
          return (
            <div
              key={type}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-6 text-center transition-shadow hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold">{VEHICLE_TYPE_LABELS[type]}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{descriptions[type]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
