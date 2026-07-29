"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Car, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { logoutAction } from "@/actions/auth";
import { NAV_BY_ROLE } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

export function DashboardShell({
  role,
  user,
  children,
}: {
  role: Role;
  user: { name: string; email: string | null; avatarUrl: string | null; roleLabel: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems = NAV_BY_ROLE[role];
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <Link href="/" className="flex items-center gap-2 px-4 py-5 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Car className="h-4 w-4" />
        </span>
        <span className="tracking-tight">VillageRide</span>
      </Link>
      <nav className="flex-1 space-y-0.5 px-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/70 p-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="grid min-h-svh lg:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col border-r border-border/70 bg-card/40 lg:flex">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex w-64 flex-col border-r border-border bg-background">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border/70 px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="hidden text-sm sm:block">
                <p className="font-medium leading-tight">{user.name}</p>
                <p className="text-xs leading-tight text-muted-foreground">{user.roleLabel}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
