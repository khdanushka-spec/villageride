import Link from "next/link";
import { Car } from "lucide-react";

const columns = [
  {
    title: "Platform",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Vehicle types", href: "#vehicles" },
      { label: "For associations", href: "#associations" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Book a ride", href: "/register/customer" },
      { label: "Drive with us", href: "/register/driver" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "mailto:hello@villageride.lk" },
      { label: "Partnerships", href: "mailto:partners@villageride.lk" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Car className="h-5 w-5" />
              </span>
              <span className="text-lg tracking-tight">VillageRide</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              A ride-hailing platform built for Sri Lanka&apos;s village taxi associations — fair fares, local
              drivers, transparent commissions.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="text-sm font-semibold">{column.title}</h4>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} VillageRide Sri Lanka. All rights reserved.</p>
          <p>Made for village taxi associations across Sri Lanka.</p>
        </div>
      </div>
    </footer>
  );
}
