"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-provider";

export function Hero() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 brand-gradient opacity-[0.06] dark:opacity-[0.35]" />
      <MapBackdrop />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {t.hero_eyebrow}
          </span>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t.hero_title}
          </h1>

          <p className="mt-5 max-w-xl text-lg text-muted-foreground text-balance">{t.hero_subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-6 text-base" nativeButton={false} render={<Link href="/register/customer" />}>
              {t.hero_cta_primary}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
              nativeButton={false}
              render={<Link href="/register/driver" />}
            >
              {t.hero_cta_secondary}
            </Button>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
            {[
              ["9", "vehicle types"],
              ["24/7", "association support"],
              ["100%", "fares stay local"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-2xl font-semibold text-primary">{value}</dt>
                <dd className="text-xs text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="relative"
        >
          <div className="glass relative overflow-hidden rounded-3xl p-6 shadow-2xl shadow-black/5">
            <RouteCard />
            <div className="mt-6 space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4">
              <FieldRow icon={<MapPin className="h-4 w-4 text-primary" />} label={t.hero_pickup} value="Kandy Town, Central Province" />
              <FieldRow icon={<Navigation className="h-4 w-4 text-accent" />} label={t.hero_dropoff} value="Peradeniya University" />
              <Button className="mt-2 w-full" nativeButton={false} render={<Link href="/register/customer" />}>
                {t.hero_search}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FieldRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
      {icon}
      <div className="min-w-0">
        <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function RouteCard() {
  return (
    <div className="relative h-40 overflow-hidden rounded-2xl bg-secondary/60">
      <svg viewBox="0 0 400 160" className="absolute inset-0 h-full w-full" fill="none">
        <path d="M20 130 Q 120 20 200 80 T 380 40" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 8" opacity="0.6" />
        <circle cx="20" cy="130" r="6" fill="var(--color-primary)" />
        <circle cx="380" cy="40" r="6" fill="var(--color-accent)" />
      </svg>
      <div className="absolute right-3 top-3 rounded-full bg-background/80 px-3 py-1 text-xs font-medium shadow-sm">
        ETA 8 min
      </div>
    </div>
  );
}

function MapBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
      style={{
        backgroundImage:
          "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
      }}
    />
  );
}
