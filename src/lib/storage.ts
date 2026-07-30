/**
 * Driver registration documents upload directly from the browser to Vercel
 * Blob (see src/app/api/driver-documents/upload/route.ts) rather than
 * passing through a Server Action — Server Actions have a request body size
 * limit (both Next.js's own default and Vercel's platform-level ceiling for
 * function payloads) that real phone-camera photos across a dozen documents
 * blow past easily. Since the server action only ever sees the resulting
 * URL string, not the file itself, it's worth confirming that string
 * actually points at our own Blob store before trusting it — a public,
 * unauthenticated action taking arbitrary caller-supplied URLs at face value
 * would otherwise let anyone record whatever URL they want as a "document".
 */
export function isTrustedBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
