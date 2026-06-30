export const signaLocales = ['en', 'sw', 'fr'] as const;

export type SignaLocale = (typeof signaLocales)[number];

export const defaultSignaLocale: SignaLocale = 'en';

export function normalizeSignaLocale(value?: string | null): SignaLocale {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return defaultSignaLocale;
  }

  if (normalized.startsWith('fr')) {
    return 'fr';
  }

  if (normalized.startsWith('sw') || normalized.startsWith('ki')) {
    return 'sw';
  }

  return defaultSignaLocale;
}
