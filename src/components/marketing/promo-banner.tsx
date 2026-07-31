import Link from "next/link";
import { Sparkles } from "lucide-react";

export function PromoBanner() {
  return (
    <div className="bg-accent text-accent-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2.5 text-center text-sm font-medium sm:px-6 lg:px-8">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>
          Launch offer: your first month or first 10 trips —{" "}
          <span className="font-semibold">zero commission</span>, whichever comes first.
        </span>
        <Link href="/register" className="font-semibold underline underline-offset-2 hover:no-underline">
          Get started
        </Link>
      </div>
    </div>
  );
}
