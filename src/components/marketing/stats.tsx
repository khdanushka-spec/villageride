const stats = [
  { value: "9", label: "vehicle categories supported" },
  { value: "3", label: "languages — English, Sinhala, Tamil" },
  { value: "4", label: "roles: admin, association, driver, customer" },
  { value: "100%", label: "of commissions set by your association" },
];

export function Stats() {
  return (
    <section className="border-y border-border/60 brand-gradient">
      <div className="mx-auto max-w-7xl px-4 py-16 text-primary-foreground sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl font-semibold">{stat.value}</p>
              <p className="mt-1 text-sm text-primary-foreground/75">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
