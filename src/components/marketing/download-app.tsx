import { Smartphone } from "lucide-react";

export function DownloadApp() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="glass flex flex-col items-center gap-6 rounded-3xl border border-border/70 p-10 text-center sm:p-14">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone className="h-7 w-7" />
        </span>
        <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-balance">
          Install VillageRide on your phone — no app store needed
        </h2>
        <p className="max-w-md text-muted-foreground">
          VillageRide works as an installable app. Open this site on your phone and choose{" "}
          <span className="font-medium text-foreground">&ldquo;Add to Home Screen&rdquo;</span> from your browser
          menu for a fast, full-screen experience.
        </p>
      </div>
    </section>
  );
}
