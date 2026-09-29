// Langues de l'interface (docs/i18n.md §2). Les libellés restent dans leur propre langue
// (« Français », « English ») : un sélecteur de langue ne se traduit pas.
export type AppLanguage = 'fr' | 'en';

export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['fr', 'en'];

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  fr: 'Français',
  en: 'English',
};

// Langue d'un visiteur dont le navigateur n'est ni en français ni en anglais (décision du
// 2026-09-29 : acheteurs des places de marché SaaS).
export const FALLBACK_LANGUAGE: AppLanguage = 'en';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

// Première langue supportée parmi les préférences du navigateur (« fr-SN » → fr, « en-GB » → en).
export function languageFromBrowser(preferred: readonly string[]): AppLanguage {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isAppLanguage(base)) {
      return base;
    }
  }
  return FALLBACK_LANGUAGE;
}
