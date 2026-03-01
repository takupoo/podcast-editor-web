import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from './types';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || '';
  return lang.startsWith('ja') ? 'ja' : 'en';
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: detectBrowserLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'podcast-editor-locale',
    }
  )
);
