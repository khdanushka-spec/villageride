import type { ProductCategory, OrderStatus } from "@prisma/client";
import { Apple, Pill, UtensilsCrossed, Home, Laptop, Shirt, Package } from "lucide-react";

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  GROCERY: "Grocery",
  PHARMACY: "Pharmacy",
  FOOD_AND_BEVERAGE: "Food & Beverage",
  HOUSEHOLD: "Household",
  ELECTRONICS: "Electronics",
  CLOTHING: "Clothing",
  OTHER: "Other",
};

export const PRODUCT_CATEGORY_ICONS: Record<ProductCategory, typeof Package> = {
  GROCERY: Apple,
  PHARMACY: Pill,
  FOOD_AND_BEVERAGE: UtensilsCrossed,
  HOUSEHOLD: Home,
  ELECTRONICS: Laptop,
  CLOTHING: Shirt,
  OTHER: Package,
};

export const PRODUCT_CATEGORIES = Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: "Order placed",
  CONFIRMED: "Vendor is preparing your order",
  READY_FOR_PICKUP: "Ready — waiting for a driver",
  DRIVER_ASSIGNED: "Driver is heading to the vendor",
  PICKED_UP: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED_BY_CUSTOMER: "You cancelled this order",
  CANCELLED_BY_VENDOR: "Vendor cancelled this order",
  NO_DRIVERS_AVAILABLE: "No drivers were available",
};

export const ORDER_STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PLACED: "secondary",
  CONFIRMED: "secondary",
  READY_FOR_PICKUP: "secondary",
  DRIVER_ASSIGNED: "default",
  PICKED_UP: "default",
  DELIVERED: "default",
  CANCELLED_BY_CUSTOMER: "destructive",
  CANCELLED_BY_VENDOR: "destructive",
  NO_DRIVERS_AVAILABLE: "destructive",
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "PLACED",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "DRIVER_ASSIGNED",
  "PICKED_UP",
];
