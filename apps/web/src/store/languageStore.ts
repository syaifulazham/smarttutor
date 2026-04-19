import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'ms' | 'zh';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  ms: 'Melayu',
  zh: '中文',
};

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'qc-language' }
  )
);
