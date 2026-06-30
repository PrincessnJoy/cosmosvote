/**
 * CosmosVote – Lightweight i18n framework
 *
 * Issue #275 – Add language localization framework and default i18n support
 *
 * Design:
 *  - Locale strings live in src/locales/<lang>.json
 *  - Active locale is stored in localStorage (key: "cv_locale")
 *  - I18nContext provides the current translations and a setLocale() function
 *  - useI18n() hook gives components access to translations
 *  - Falls back to English for any missing key
 *
 * Supported locales:
 *  - en  English (default)
 *  - es  Spanish  (placeholder — community contributions welcome)
 *  - fr  French   (placeholder — community contributions welcome)
 *
 * Usage:
 *   // Wrap the app
 *   <I18nProvider><App /></I18nProvider>
 *
 *   // In any component
 *   const { t, locale, setLocale } = useI18n();
 *   <h1>{t('app_title')}</h1>
 *   <button onClick={() => setLocale('es')}>Español</button>
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ── Supported locale codes ──────────────────────────────────────────────────
export type Locale = 'en' | 'es' | 'fr';

export const SUPPORTED_LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English',  nativeLabel: 'English'  },
  { code: 'es', label: 'Spanish',  nativeLabel: 'Español'  },
  { code: 'fr', label: 'French',   nativeLabel: 'Français' },
];

// ── Translation map type ────────────────────────────────────────────────────
// Derived from the English locale — all other locales must satisfy this shape.
import type enRaw from './locales/en.json';
export type TranslationMap = typeof enRaw;
export type TranslationKey = keyof TranslationMap;

// ── Static imports of locale JSON files ─────────────────────────────────────
// Vite resolves these at build time; no network request needed.
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const LOCALES: Record<Locale, TranslationMap> = { en, es, fr } as Record<Locale, TranslationMap>;

// ── localStorage key ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'cv_locale';

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in LOCALES) return stored as Locale;
  } catch {
    // SSR / private browsing
  }
  // Auto-detect from browser language preference
  const browserLang = navigator.language.split('-')[0] as Locale;
  if (browserLang in LOCALES) return browserLang;
  return 'en';
}

// ── Context ──────────────────────────────────────────────────────────────────
interface I18nContextValue {
  /** Translate a key, falling back to English if the key is missing */
  t: (key: TranslationKey) => string;
  /** Current active locale */
  locale: Locale;
  /** Change the active locale */
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    // Inform assistive technologies about the language change
    document.documentElement.lang = next;
  }, []);

  // Keep <html lang="…"> in sync on initial load
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey): string => {
      const messages = LOCALES[locale];
      // Explicit key lookup — fall back to English if value is undefined
      const value = (messages as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key;
      return value;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an <I18nProvider>');
  }
  return ctx;
}

// ── Backwards-compatible singleton export ────────────────────────────────────
// Components that previously imported `t` directly can still use it (English only).
// New components should call useI18n() instead.
export const t: TranslationMap = en;
