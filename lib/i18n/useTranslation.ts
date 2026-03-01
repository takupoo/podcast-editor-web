import { useMemo } from 'react';
import { useLocaleStore } from './locale-store';
import { en } from './translations/en';
import { ja } from './translations/ja';
import type { Translations } from './types';

const translationsMap: Record<string, Translations> = { en, ja };

// Flatten nested object keys with dot notation
type NestedKeyOf<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<Translations>;

function getNestedValue(obj: Translations, key: string): string {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const translations = translationsMap[locale] ?? en;

  return useMemo(() => {
    const t = (key: TranslationKey): string => {
      return getNestedValue(translations, key);
    };

    const tf = (key: TranslationKey, params: Record<string, string | number>): string => {
      let result = getNestedValue(translations, key);
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    };

    return { t, tf, locale };
  }, [translations, locale]);
}
