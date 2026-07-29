"use client";

import { useEffect } from "react";

/**
 * Navigates via a full page load (not client-side routing) after a Server
 * Action that just signed the user in returns a redirectTo target. A full
 * navigation guarantees the request carries the just-set session cookie,
 * which client-side routing can race against right after sign-in.
 */
export function useActionRedirect(redirectTo?: string) {
  useEffect(() => {
    if (redirectTo) window.location.href = redirectTo;
  }, [redirectTo]);
}
