"use client";

import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-provider";
import { LOCALE_LABELS, type LocaleCode } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Languages className="h-4 w-4" />
            {LOCALE_LABELS[locale]}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {(Object.keys(LOCALE_LABELS) as LocaleCode[]).map((code) => (
          <DropdownMenuItem key={code} onClick={() => setLocale(code)}>
            {LOCALE_LABELS[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
