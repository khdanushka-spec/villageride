"use client";

import * as React from "react";
import { dictionary, type Dictionary, type LocaleCode } from "./dictionaries";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: Dictionary;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

const COOKIE_NAME = "villageride_locale";

function readInitialLocale(): LocaleCode {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=(en|si|ta)`));
  return (match?.[1] as LocaleCode) ?? "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<LocaleCode>("en");

  React.useEffect(() => {
    setLocaleState(readInitialLocale());
  }, []);

  const setLocale = React.useCallback((next: LocaleCode) => {
    setLocaleState(next);
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    document.documentElement.lang = next;
  }, []);

  const value = React.useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: dictionary[locale] }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
