/** The 25 administrative districts of Sri Lanka, grouped by province. */
export const SRI_LANKA_DISTRICTS = [
  "Colombo",
  "Gampaha",
  "Kalutara",
  "Kandy",
  "Matale",
  "Nuwara Eliya",
  "Galle",
  "Matara",
  "Hambantota",
  "Jaffna",
  "Kilinochchi",
  "Mannar",
  "Vavuniya",
  "Mullaitivu",
  "Batticaloa",
  "Ampara",
  "Trincomalee",
  "Kurunegala",
  "Puttalam",
  "Anuradhapura",
  "Polonnaruwa",
  "Badulla",
  "Monaragala",
  "Ratnapura",
  "Kegalle",
] as const;

export type SriLankaDistrict = (typeof SRI_LANKA_DISTRICTS)[number];

/**
 * Sri Lankan National Identity Card numbers come in two formats:
 * the old one is 9 digits followed by a V or X, the new one is 12 digits.
 */
export const NIC_PATTERN = /^(?:\d{9}[VvXx]|\d{12})$/;

export function isValidNic(nic: string): boolean {
  return NIC_PATTERN.test(nic.trim());
}
