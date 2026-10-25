export const LANGUAGES = ['ar', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export type TextDirection = 'rtl' | 'ltr';

export const DEFAULT_LANGUAGE: Language = 'ar';

export const LANGUAGE_DIRECTION: Record<Language, TextDirection> = {
  ar: 'rtl',
  en: 'ltr',
};

/** Bilingual text stored on documents such as product names. */
export interface LocalizedText {
  ar: string;
  en: string;
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
