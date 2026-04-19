import { useState, useEffect } from 'react';

export type SpeechLang = 'en' | 'ms' | 'zh';

const LANG_MAP: Record<SpeechLang, string> = {
  en: 'en-US',
  ms: 'ms-MY',
  zh: 'zh-CN',
};

// Strip markdown/LaTeX to plain speakable text
function toSpeakable(md: string): string {
  return md
    .replace(/\$\$[\s\S]+?\$\$/g, ', see equation, ')   // display math
    .replace(/\$[^$\n]+\$/g, ', equation, ')              // inline math
    .replace(/\*\*(.+?)\*\*/gs, '$1')                     // bold
    .replace(/\*(.+?)\*/gs, '$1')                         // italic
    .replace(/_{1,2}(.+?)_{1,2}/gs, '$1')                 // underline/bold
    .replace(/#{1,6}\s+/gm, '')                           // headings
    .replace(/`{1,3}[^`]*`{1,3}/g, '')                    // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')              // links
    .replace(/^[-*+]\s+/gm, '')                           // bullets
    .replace(/^\d+\.\s+/gm, '')                           // numbered lists
    .replace(/\n{2,}/g, '. ')                              // paragraph breaks → pause
    .replace(/\n/g, ', ')                                  // line breaks → short pause
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function useSpeech() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Stop speech when component unmounts
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  function speak(text: string, lang: SpeechLang, id: string) {
    if (!supported) return;

    // Toggle off if already speaking this id
    if (activeId === id) {
      window.speechSynthesis.cancel();
      setActiveId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(toSpeakable(text));
    utterance.lang = LANG_MAP[lang];
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => setActiveId(id);
    utterance.onend = () => setActiveId(null);
    utterance.onerror = () => setActiveId(null);

    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    if (supported) window.speechSynthesis.cancel();
    setActiveId(null);
  }

  return { speak, stop, activeId, supported };
}
