"use client";

import Link from "next/link";
import { useState } from "react";
import { Car, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { useLocale } from "@/lib/i18n/locale-provider";

export function SiteHeader() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#how-it-works", label: t.nav.howItWorks },
    { href: "#vehicles", label: t.nav.vehicles },
    { href: "#associations", label: t.nav.associations },
    { href: "/register/driver", label: t.nav.drivers },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </span>
          <span className="text-lg tracking-tight">VillageRide</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login">{t.nav_login}</Link>} />
          <Button size="sm" nativeButton={false} render={<Link href="/register">{t.nav_getStarted}</Link>} />
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 px-3">
              <LanguageSwitcher />
            </div>
            <div className="mt-3 flex flex-col gap-2 px-3">
              <Button variant="outline" nativeButton={false} render={<Link href="/login">{t.nav_login}</Link>} />
              <Button nativeButton={false} render={<Link href="/register">{t.nav_getStarted}</Link>} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
