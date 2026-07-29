import type { Role } from "@prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/dashboard/admin",
  ASSOCIATION_ADMIN: "/dashboard/association",
  DRIVER: "/dashboard/driver",
  CUSTOMER: "/dashboard/customer",
};

export function roleForSegment(segment: string): Role | null {
  switch (segment) {
    case "admin":
      return "SUPER_ADMIN";
    case "association":
      return "ASSOCIATION_ADMIN";
    case "driver":
      return "DRIVER";
    case "customer":
      return "CUSTOMER";
    default:
      return null;
  }
}
