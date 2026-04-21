import { useState, useRef } from 'react';
import { api } from '../services/api';
import { useAvatarStore } from '../store/avatarStore';

export type SpeechLang = 'en' | 'ms' | 'zh';

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
  const { avatar } = useAvatarStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Tracks in-flight id synchronously — guards against double-click before re-render
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

  async function speak(text: string, _lang: SpeechLang, id: string) {
    // Toggle off if already speaking this id
    if (activeId === id || pendingRef.current === id) {
      stop();
      return;
    }

    // Reject if another request is already in flight (stale-closure guard)
    if (pendingRef.current !== null || activeId !== null) return;

    pendingRef.current = id;
    stop();
    setLoading(id);

    try {
      const response = await api.post<Blob>(
        '/tts',
        { text: toSpeakable(text), avatarId: avatar.id },
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
