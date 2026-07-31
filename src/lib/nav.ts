import type { Role } from "@prisma/client";
import {
  BadgeDollarSign,
  Bell,
  Building2,
  Car,
  FileText,
  History,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Package,
  Percent,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  CUSTOMER: [
    { href: "/dashboard/customer", label: "Book a ride", icon: LayoutDashboard },
    { href: "/dashboard/customer/shop", label: "Shop", icon: ShoppingBag },
    { href: "/dashboard/customer/orders", label: "Orders", icon: Package },
    { href: "/dashboard/customer/rides", label: "Ride history", icon: History },
    { href: "/dashboard/customer/addresses", label: "Saved addresses", icon: MapPin },
    { href: "/dashboard/customer/wallet", label: "Wallet", icon: Wallet },
    { href: "/dashboard/customer/profile", label: "Profile", icon: Settings },
  ],
  DRIVER: [
    { href: "/dashboard/driver", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/driver/rides", label: "Trip history", icon: History },
    { href: "/dashboard/driver/earnings", label: "Earnings", icon: BadgeDollarSign },
    { href: "/dashboard/driver/wallet", label: "Wallet", icon: Wallet },
    { href: "/dashboard/driver/profile", label: "Profile", icon: Settings },
  ],
  ASSOCIATION_ADMIN: [
    { href: "/dashboard/association", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/association/drivers", label: "Drivers", icon: Car },
    { href: "/dashboard/association/rides", label: "Rides", icon: History },
    { href: "/dashboard/association/pricing", label: "Pricing", icon: Percent },
    { href: "/dashboard/association/announcements", label: "Announcements", icon: Megaphone },
    { href: "/dashboard/association/reports", label: "Reports", icon: FileText },
  ],
  SUPER_ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/associations", label: "Associations", icon: Building2 },
    { href: "/dashboard/admin/drivers", label: "Drivers", icon: Car },
    { href: "/dashboard/admin/customers", label: "Customers", icon: Users },
    { href: "/dashboard/admin/vendors", label: "Vendors & Shop", icon: Store },
    { href: "/dashboard/admin/pricing", label: "Pricing & commissions", icon: Percent },
    { href: "/dashboard/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/admin/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/admin/audit-logs", label: "Audit logs", icon: ScrollText },
    { href: "/dashboard/admin/settings", label: "Settings", icon: ShieldCheck },
  ],
};
