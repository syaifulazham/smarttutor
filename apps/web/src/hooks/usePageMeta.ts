import { useEffect } from 'react';

const DEFAULT_TITLE = 'Tcher Ayu | AI Tutor for SPM, STPM & University Students';
const DEFAULT_DESC = 'Your personal AI tutor for Malaysian students. Step-by-step explanations for SPM, STPM and university questions in English, BM and Mandarin.';

interface PageMeta {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

export function usePageMeta({ title, description, canonical, noindex }: PageMeta) {
  useEffect(() => {
    document.title = title;

    setMeta('name', 'description', description ?? DEFAULT_DESC);

    const canonicalEl = getOrCreate<HTMLLinkElement>('link[rel="canonical"]', () => {
      const el = document.createElement('link');
      el.rel = 'canonical';
      document.head.appendChild(el);
      return el;
    });
    canonicalEl.href = canonical ?? `https://tcherayu.com${window.location.pathname}`;

    if (noindex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    } else {
      setMeta('name', 'robots', 'index, follow');
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, canonical, noindex]);
}

function setMeta(attr: string, key: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function getOrCreate<T extends Element>(selector: string, create: () => T): T {
  return (document.querySelector<T>(selector) ?? create());
}
