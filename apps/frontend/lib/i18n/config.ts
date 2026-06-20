export const locales = ["en", "sw", "fr"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const localeLabels: Record<Locale, string> = {
  en: "English",
  sw: "Kiswahili",
  fr: "Français",
}

export function isLocale(value: string | null): value is Locale {
  return locales.includes(value as Locale)
}
