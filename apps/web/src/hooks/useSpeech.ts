import { useState, useRef } from 'react';
import { api } from '../services/api';
import { useAvatarStore } from '../store/avatarStore';

export type SpeechLang = 'en' | 'ms' | 'zh';

const GREEK: Record<string, string> = {
  '\\alpha': 'alpha', '\\beta': 'beta', '\\gamma': 'gamma', '\\delta': 'delta',
  '\\epsilon': 'epsilon', '\\theta': 'theta', '\\lambda': 'lambda', '\\mu': 'mu',
  '\\pi': 'pi', '\\sigma': 'sigma', '\\phi': 'phi', '\\psi': 'psi', '\\omega': 'omega',
  '\\rho': 'rho', '\\eta': 'eta', '\\xi': 'xi', '\\zeta': 'zeta',
};

const OPERATORS: Record<string, Record<SpeechLang, string>> = {
  '\\times':  { en: 'times',                       ms: 'darab',                     zh: '乘' },
  '\\cdot':   { en: 'times',                       ms: 'darab',                     zh: '乘' },
  '\\div':    { en: 'divided by',                  ms: 'bahagi',                    zh: '除以' },
  '\\pm':     { en: 'plus or minus',               ms: 'tambah tolak',              zh: '正负' },
  '\\mp':     { en: 'minus or plus',               ms: 'tolak tambah',              zh: '负正' },
  '\\leq':    { en: 'less than or equal to',       ms: 'kurang atau sama dengan',   zh: '小于等于' },
  '\\geq':    { en: 'greater than or equal to',    ms: 'lebih atau sama dengan',    zh: '大于等于' },
  '\\neq':    { en: 'not equal to',                ms: 'tidak sama dengan',         zh: '不等于' },
  '\\approx': { en: 'approximately equal to',      ms: 'lebih kurang sama dengan',  zh: '约等于' },
  '\\infty':  { en: 'infinity',                    ms: 'infiniti',                  zh: '无穷' },
  '\\therefore': { en: 'therefore',                ms: 'oleh itu',                  zh: '因此' },
};

function powerSpeech(base: string, exp: string, lang: SpeechLang): string {
  const expClean = exp.trim();
  if (lang === 'ms') {
    const map: Record<string, string> = { '2': 'kuasa dua', '3': 'kuasa tiga', '4': 'kuasa empat', '5': 'kuasa lima', '6': 'kuasa enam' };
    return `${base} ${map[expClean] ?? `kuasa ${expClean}`}`;
  }
  if (lang === 'zh') {
    return `${base}的${expClean}次方`;
  }
  const map: Record<string, string> = { '2': 'squared', '3': 'cubed' };
  return `${base} ${map[expClean] ?? `to the power of ${expClean}`}`;
}

function mathToSpeech(expr: string, lang: SpeechLang): string {
  let s = expr.trim();

  // Strip display/text wrappers
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');

  // Greek letters
  for (const [k, v] of Object.entries(GREEK)) {
    s = s.replaceAll(k, ` ${v} `);
  }

  // Nested fractions and roots — process deepest first via repeated replace
  for (let i = 0; i < 4; i++) {
    // \frac{a}{b}
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
      const n = num.trim();
      const d = den.trim();
      if (lang === 'ms') return ` ${n} per ${d} `;
      if (lang === 'zh') return ` ${n}除以${d} `;
      return ` ${n} over ${d} `;
    });

    // \sqrt[n]{x}
    s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, (_, n, x) => {
      const base = x.trim();
      if (lang === 'ms') return ` punca kuasa ${n} ${base} `;
      if (lang === 'zh') return ` ${n}次根号${base} `;
      return ` ${n} root of ${base} `;
    });

    // \sqrt{x}
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, (_, x) => {
      const base = x.trim();
      if (lang === 'ms') return ` punca kuasa dua ${base} `;
      if (lang === 'zh') return ` 根号${base} `;
      return ` square root of ${base} `;
    });

    // x^{exp}
    s = s.replace(/([a-zA-Z0-9])\^\{([^{}]+)\}/g, (_, b, e) => ` ${powerSpeech(b, e, lang)} `);

    // x^n (single char)
    s = s.replace(/([a-zA-Z0-9])\^([a-zA-Z0-9])/g, (_, b, e) => ` ${powerSpeech(b, e, lang)} `);
  }

  // Subscripts: x_{1} or x_1
  s = s.replace(/([a-zA-Z])\{([^{}]+)\}_/g, '$1 $2');
  s = s.replace(/([a-zA-Z])_\{([^{}]+)\}/g, '$1 $2');
  s = s.replace(/([a-zA-Z])_([a-zA-Z0-9])/g, '$1 $2');

  // Operators
  for (const [sym, translations] of Object.entries(OPERATORS)) {
    s = s.replaceAll(sym, ` ${translations[lang]} `);
  }

  // Strip remaining backslash commands
  s = s.replace(/\\[a-zA-Z]+/g, '');
  // Strip braces
  s = s.replace(/[{}]/g, '');

  return s.replace(/\s+/g, ' ').trim();
}

function toSpeakable(md: string, lang: SpeechLang = 'en'): string {
  return md
    .replace(/\$\$([^$]+)\$\$/g, (_, m) => `, ${mathToSpeech(m, lang)}, `)
    .replace(/\$([^$\n]+)\$/g, (_, m) => ` ${mathToSpeech(m, lang)} `)
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/_{1,2}(.+?)_{1,2}/gs, '$1')
    .replace(/#{1,6}\s+/gm, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function useSpeech() {
  const { avatar } = useAvatarStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingRef = useRef<string | null>(null);

  function stop() {
    pendingRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setActiveId(null);
    setLoading(null);
  }

  async function speak(text: string, lang: SpeechLang, id: string) {
    if (activeId === id || pendingRef.current === id) {
      stop();
      return;
    }

    if (pendingRef.current !== null || activeId !== null) return;

    pendingRef.current = id;
    stop();
    setLoading(id);

    try {
      const response = await api.post<Blob>(
        '/tts',
        { text: toSpeakable(text, lang), avatarId: avatar.id },
        { responseType: 'blob' },
      );

      const url = URL.createObjectURL(response.data);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => { pendingRef.current = null; setLoading(null); setActiveId(id); };
      audio.onended = () => { setActiveId(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { pendingRef.current = null; setActiveId(null); setLoading(null); URL.revokeObjectURL(url); };

      await audio.play();
    } catch {
      pendingRef.current = null;
      setLoading(null);
      setActiveId(null);
    }
  }

  return { speak, stop, activeId, loading, supported: true };
}
