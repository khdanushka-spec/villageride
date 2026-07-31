import { PromoBanner } from "@/components/marketing/promo-banner";
import { SiteHeader } from "@/components/marketing/site-header";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { VehicleCategories } from "@/components/marketing/vehicle-categories";
import { Benefits } from "@/components/marketing/benefits";
import { Stats } from "@/components/marketing/stats";
import { ValueProps } from "@/components/marketing/value-props";
import { DownloadApp } from "@/components/marketing/download-app";
import { Faq } from "@/components/marketing/faq";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <PromoBanner />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <VehicleCategories />
        <Benefits />
        <Stats />
        <ValueProps />
        <DownloadApp />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
