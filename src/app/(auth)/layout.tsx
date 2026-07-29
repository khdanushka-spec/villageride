import Link from "next/link";
import { Car } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-12 sm:px-12 lg:px-20">
        <Link href="/" className="mb-10 flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </span>
          <span className="text-lg tracking-tight">VillageRide</span>
        </Link>
        <div className="flex flex-1 items-center justify-center">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 brand-gradient" />
        <div className="absolute inset-0 brand-glow" />
        <div className="relative flex h-full flex-col justify-end p-14 text-primary-foreground">
          <blockquote className="max-w-md space-y-4">
            <p className="text-2xl font-medium leading-snug text-balance">
              &ldquo;Built for the roads our drivers actually know — every fare
              goes back to the village association, not a foreign platform.&rdquo;
            </p>
            <footer className="text-sm text-white/70">
              VillageRide Sri Lanka
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
