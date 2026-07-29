import type { VehicleType } from "@prisma/client";
import { Car, Truck, Bus, Package, Caravan } from "lucide-react";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  TAXI: "Taxi",
  THREE_WHEELER: "Three Wheeler",
  VAN: "Van",
  MINI_VAN: "Mini Van",
  SUV: "SUV",
  BUS: "Bus",
  TRUCK: "Truck",
  LORRY: "Lorry",
  DELIVERY_VEHICLE: "Delivery Vehicle",
};

export const VEHICLE_TYPE_ICONS: Record<VehicleType, typeof Car> = {
  TAXI: Car,
  THREE_WHEELER: Caravan,
  VAN: Car,
  MINI_VAN: Car,
  SUV: Car,
  BUS: Bus,
  TRUCK: Truck,
  LORRY: Truck,
  DELIVERY_VEHICLE: Package,
};

export const VEHICLE_TYPES = Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[];
