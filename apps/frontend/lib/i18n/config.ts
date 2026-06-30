export const locales = ["en", "sw", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeStorageKey = "signa.locale";
export const localeStorageEvent = "signa.locale.changed";

export const accountLocaleByLocale: Record<Locale, string> = {
  en: "en-US",
  sw: "sw-KE",
  fr: "fr-FR",
};

export const localeLabels: Record<Locale, string> = {
  en: "English",
  sw: "Kiswahili",
  fr: "Français",
};

export function isLocale(value: string | null): value is Locale {
  return locales.includes(value as Locale);
}

export function normalizeLocale(value?: string | null): Locale {
  const normalized = value?.toLowerCase();

  if (!normalized) {
    return defaultLocale;
  }

  if (normalized.startsWith("fr")) {
    return "fr";
  }

  if (normalized.startsWith("sw") || normalized.startsWith("ki")) {
    return "sw";
  }

  return defaultLocale;
}

export function toAccountLocale(locale: Locale): string {
  return accountLocaleByLocale[locale];
}

export function toDocumentLang(locale: Locale): string {
  return accountLocaleByLocale[locale];
}

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  return normalizeLocale(window.localStorage.getItem(localeStorageKey));
}

export function persistLocale(locale: Locale): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(localeStorageKey, locale);
  document.documentElement.lang = toDocumentLang(locale);
  window.dispatchEvent(new Event(localeStorageEvent));
}
