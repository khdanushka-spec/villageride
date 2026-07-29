/** Normalizes Sri Lankan mobile numbers to E.164 (+94XXXXXXXXX). */
export function normalizeSriLankanPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");

  if (/^\+94\d{9}$/.test(digits)) return digits;
  if (/^0\d{9}$/.test(digits)) return `+94${digits.slice(1)}`;
  if (/^94\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\d{9}$/.test(digits)) return `+94${digits}`;

  return null;
}
